import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import { ApiResponse, toBackendComplianceStatus } from '@/lib/types/common'
import { recordActivityEvent } from '@/lib/events/activity-event'

interface FindingInput {
  rule_id: string
  rule_name: string
  violation_type: string
  severity: 'HIGH' | 'MEDIUM' | 'LOW'
  message: string
}

interface EvaluatedRuleInput {
  rule_id: string
  rule_name?: string
  result?: string
  explanation?: string
}

interface ComplianceResultsRequest {
  status: 'PASS' | 'FAIL' | 'MANUAL_REVIEW' | 'POTENTIAL_NON_COMPLIANCE'
  findings: FindingInput[]
  evaluated_rules?: EvaluatedRuleInput[]
}

interface ComplianceResultsResponse {
  message: string
  final_status: string
  violations: number
  inspection_id: string
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const db = supabaseAdmin || supabase;
  try {
    const { id: inspectionId } = await context.params

    if (!inspectionId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Inspection ID is required in URL path'
          }
        } as ApiResponse<null>,
        { status: 400 }
      )
    }

    const body = (await request.json()) as ComplianceResultsRequest

    if (!body.status) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'status is required'
          }
        } as ApiResponse<null>,
        { status: 400 }
      )
    }

    // Verify inspection exists
    const { data: inspection, error: inspectionError } = await db
      .from('inspections')
      .select('id, product_type, inspector_id')
      .eq('id', inspectionId)
      .single()

    if (inspectionError || !inspection) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INSPECTION_NOT_FOUND',
            message: `Inspection ${inspectionId} not found`
          }
        } as ApiResponse<null>,
        { status: 404 }
      )
    }

    // Clean up any prior findings for this inspection to prevent stale/duplicate accumulation
    await db.from('compliance_findings').delete().eq('inspection_id', inspectionId)

    // Insert findings
    if (body.findings && body.findings.length > 0) {
      const findingsToInsert = body.findings.map((finding) => ({
        inspection_id: inspectionId,
        rule_id: finding.rule_id,
        rule_name: finding.rule_name,
        violation_type: finding.violation_type,
        severity: finding.severity,
        message: finding.message,
        evidence: null,
        created_at: new Date().toISOString()
      }))

      const { error: findingsError } = await db
        .from('compliance_findings')
        .insert(findingsToInsert)

      if (findingsError) {
        console.error('Findings insert error:', findingsError)
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'DB_INSERT_FAILED',
              message: 'Failed to store findings',
              details: findingsError.message
            }
          } as ApiResponse<null>,
          { status: 500 }
        )
      }
    }

    // Clean up any prior final_results for this inspection to guarantee single authoritative state
    await db.from('final_results').delete().eq('inspection_id', inspectionId)

    // Insert authoritative final result
    const normalizedStatus = toBackendComplianceStatus(body.status)
    const highSeverityCount = (body.findings || []).filter((f) => f.severity === 'HIGH').length

    const evaluatedRulesList = body.evaluated_rules && body.evaluated_rules.length > 0
      ? body.evaluated_rules
      : (body.findings || []).map((f) => ({
          rule_id: f.rule_id,
          rule_name: f.rule_name,
          result: 'FAIL',
          explanation: f.message
        }))

    const findingsPayload = {
      findings: body.findings || [],
      evaluated_rules: evaluatedRulesList
    }

    const { error: resultError } = await db
      .from('final_results')
      .insert([
        {
          inspection_id: inspectionId,
          status: normalizedStatus,
          total_violations_count: (body.findings || []).length,
          high_severity_count: highSeverityCount,
          findings_json: findingsPayload,
          created_at: new Date().toISOString()
        }
      ])

    if (resultError) {
      console.error('Result insert error:', resultError)
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DB_INSERT_FAILED',
            message: 'Failed to store final result',
            details: resultError.message
          }
        } as ApiResponse<null>,
        { status: 500 }
      )
    }

    // Update inspection status
    const { error: updateError } = await db
      .from('inspections')
      .update({ status: 'COMPLETED', updated_at: new Date().toISOString() })
      .eq('id', inspectionId)

    if (updateError) {
      console.error('Update error:', updateError)
    }

    // Record Authoritative Compliance & Completion Events
    try {
      const violationCount = (body.findings || []).length;
      const commodityName = inspection.product_type || "Packaged Commodity";
      const inspectorId = inspection.inspector_id || "officer_enforcement";

      // 1. Record COMPLIANCE_RUN
      await recordActivityEvent({
        action: "COMPLIANCE_RUN",
        actionLabel: body.status === "PASS" ? "Compliance Evaluation Passed" : "Infractions Determined",
        inspectionId,
        commodityName,
        actorId: inspectorId,
        actorName: "Deterministic Rules Engine",
        category: "COMPLIANCE",
        details: `Statutory verification evaluated against Legal Metrology Rules, 2011. Verdict: ${body.status}. Violations: ${violationCount}.`,
        metadata: {
          verdict: body.status,
          violationsCount: violationCount,
        },
      });

      // 2. Record FINDING_CREATED for each finding
      for (const f of body.findings || []) {
        await recordActivityEvent({
          action: "FINDING_CREATED",
          actionLabel: "Statutory Infraction Flagged",
          inspectionId,
          commodityName,
          actorId: inspectorId,
          actorName: "Rules Verification System",
          category: "COMPLIANCE",
          details: `Infraction flagged under ${f.rule_id} (${f.rule_name}): ${f.message}. Severity: ${f.severity}.`,
          metadata: f,
        });
      }

      // 3. Record INSPECTION_COMPLETED with user Notification
      const notifType: "CRITICAL" | "COMPLIANT" | "REVIEW" =
        violationCount > 0 ? "CRITICAL" : body.status === "PASS" ? "COMPLIANT" : "REVIEW";

      const notifTitle =
        violationCount > 0
          ? "Non-Compliance Detected"
          : body.status === "PASS"
          ? "Inspection Verified (PASS)"
          : "Manual Review Required";

      const notifMessage =
        violationCount > 0
          ? `${commodityName} (${inspectionId.slice(0, 8).toUpperCase()}) flagged with ${violationCount} statutory violation${violationCount > 1 ? "s" : ""}.`
          : body.status === "PASS"
          ? `${commodityName} (${inspectionId.slice(0, 8).toUpperCase()}) passed all statutory compliance checks.`
          : `${commodityName} (${inspectionId.slice(0, 8).toUpperCase()}) requires inspector confirmation.`;

      await recordActivityEvent({
        action: "INSPECTION_COMPLETED",
        actionLabel: "Inspection Finalized",
        inspectionId,
        commodityName,
        actorId: inspectorId,
        actorName: "Legal Metrology Inspector",
        category: "USER_ACTION",
        details: `Statutory verification concluded. Final verdict: ${body.status} with ${violationCount} violation(s).`,
        notification: {
          targetUserId: inspectorId,
          type: notifType,
          title: notifTitle,
          message: notifMessage,
          actionUrl: `/inspections/${inspectionId}/compliance`,
          metadata: {
            product_type: commodityName,
            status: "COMPLETED",
            violation_count: violationCount,
          },
        },
        metadata: {
          verdict: body.status,
          violationsCount: violationCount,
        },
      });
    } catch (eventErr) {
      console.warn("Non-blocking activity event recording error:", eventErr);
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          message: 'Compliance results stored',
          final_status: body.status,
          violations: (body.findings || []).length,
          inspection_id: inspectionId
        } as ComplianceResultsResponse
      } as ApiResponse<ComplianceResultsResponse>,
      { status: 200 }
    )
  } catch (err) {
    console.error('Store results error:', err)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Internal server error',
          details: err instanceof Error ? err.message : 'Unknown error'
        }
      } as ApiResponse<null>,
      { status: 500 }
    )
  }
}
