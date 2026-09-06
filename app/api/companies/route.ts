import { NextRequest, NextResponse } from "next/server";
import { supabase, supabaseAdmin } from "@/lib/supabase";
import {
  getAllPackers,
  createPacker,
  getAllInspectionCompanyLinks,
  getAllInspectionCompanyLinksAsync,
  RegisteredPackerEntity,
} from "@/lib/companies/storage";
import { isCompanyMatch } from "@/lib/companies/normalization";
import { recordActivityEvent } from "@/lib/events/activity-event";
import { ApiResponse } from "@/lib/types/common";
import { requireAuth } from "@/lib/auth/server";

export interface CompanyListItem {
  id: string;
  name: string;
  brand: string;
  registrationNumber: string;
  registeredOffice: string;
  state: string;
  district: string;
  contactEmail: string;
  contactPhone: string;
  categories: string[];
  status: "ACTIVE" | "UNDER_REVIEW" | "SUSPENDED";
  complianceRate: number;
  totalAudits: number;
  passedAudits: number;
  flaggedAudits: number;
  lastInspectionDate: string;
  registeredDate: string;
  inspectionIds: string[];
}

// ============================================================
// GET - ALL REGISTERED PACKERS WITH REAL OPERATIONAL METRICS
// ============================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { user, errorResponse } = await requireAuth(request);
    if (errorResponse) return errorResponse;

    const { searchParams } = request.nextUrl;
    const searchQuery = searchParams.get("searchQuery") || searchParams.get("q") || undefined;
    const state = searchParams.get("state") || undefined;

    // 1. Fetch all registered packers owned by this user
    const packers = await getAllPackers({ searchQuery, state, userId: user.id });

    if (packers.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    // 2. Fetch only THIS USER's real inspections to compute authentic operational metrics
    const db = supabaseAdmin || supabase;
    let allInspections: any[] = [];
    const { data: primaryInspections, error: primaryErr } = await db
      .from("inspections")
      .select("id, product_type, company_id, company_name, status, created_at")
      .eq("inspector_id", user.id)
      .order("created_at", { ascending: false });

    if (primaryErr || !primaryInspections) {
      const { data: fallbackInspections } = await db
        .from("inspections")
        .select("id, product_type, status, created_at")
        .eq("inspector_id", user.id)
        .order("created_at", { ascending: false });
      allInspections = fallbackInspections || [];
    } else {
      allInspections = primaryInspections;
    }

    // 3. Fetch all extracted manufacturer fields to link unassigned legacy inspections
    const { data: manufacturerFields } = await db
      .from("extracted_fields")
      .select("inspection_id, field_name, extracted_value")
      .in("field_name", ["manufacturer", "packer"]);

    // Build lookup of inspectionId -> extracted manufacturer
    const mfrByInspectionId = new Map<string, string>();
    if (manufacturerFields) {
      for (const row of manufacturerFields) {
        if (row.extracted_value && !mfrByInspectionId.has(row.inspection_id)) {
          mfrByInspectionId.set(row.inspection_id, row.extracted_value);
        }
      }
    }

    // 4. Fetch final compliance verdicts
    const { data: finalResults } = await db
      .from("final_results")
      .select("inspection_id, status, total_violations_count");

    const verdictByInspectionId = new Map<string, { status: string; violations: number }>();
    if (finalResults) {
      for (const r of finalResults) {
        verdictByInspectionId.set(r.inspection_id, {
          status: r.status,
          violations: r.total_violations_count || 0,
        });
      }
    }

    // 5. Aggregate operational metrics per company (1 inspection = 1 audit)
    const inspectionList = allInspections || [];
    const localLinks = await getAllInspectionCompanyLinksAsync();

    const enrichedCompanies: CompanyListItem[] = packers.map((packer) => {
      // Find all inspections belonging to this company
      const linkedInspections = inspectionList.filter((ins) => {
        // Direct company_id match
        if (ins.company_id && ins.company_id === packer.id) {
          return true;
        }
        // Matching via local inspection link
        const link = localLinks[ins.id];
        if (link) {
          if (link.companyId === packer.id) return true;
          if (link.companyName && isCompanyMatch(packer, link.companyName)) return true;
        }
        // Matching by company_name on inspection
        if (
          ins.company_name &&
          isCompanyMatch(packer, ins.company_name)
        ) {
          return true;
        }
        // Matching by extracted manufacturer declaration
        const extractedMfr = mfrByInspectionId.get(ins.id);
        if (
          extractedMfr &&
          isCompanyMatch(packer, extractedMfr)
        ) {
          return true;
        }
        return false;
      });

      const totalAudits = linkedInspections.length;
      let passedAudits = 0;
      let flaggedAudits = 0;

      for (const ins of linkedInspections) {
        const verdict = verdictByInspectionId.get(ins.id);
        if (verdict?.status === "PASS" && verdict.violations === 0) {
          passedAudits++;
        } else if (
          verdict?.status === "FAIL" ||
          (verdict && verdict.violations > 0)
        ) {
          flaggedAudits++;
        } else if (ins.status === "COMPLETED") {
          // If completed without violations, count as passed
          passedAudits++;
        }
      }

      const complianceRate =
        totalAudits > 0
          ? Math.round(((passedAudits) / totalAudits) * 1000) / 10
          : 100;

      const lastInspectionDate =
        linkedInspections.length > 0
          ? linkedInspections[0].created_at
          : packer.updated_at || packer.created_at;

      return {
        id: packer.id,
        name: packer.name,
        brand: packer.brand || "",
        registrationNumber: packer.registration_number,
        registeredOffice: packer.registered_office,
        state: packer.state,
        district: packer.district,
        contactEmail: packer.contact_email || "",
        contactPhone: packer.contact_phone || "",
        categories: packer.categories,
        status: packer.status,
        complianceRate,
        totalAudits,
        passedAudits,
        flaggedAudits,
        lastInspectionDate,
        registeredDate: packer.created_at?.split("T")[0] || "2024-01-01",
        inspectionIds: linkedInspections.map((i) => i.id),
      };
    });

    return NextResponse.json({
      success: true,
      data: enrichedCompanies,
    });
  } catch (err) {
    console.error("GET /api/companies error:", err);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: "Failed to retrieve registered packers list.",
        },
      } as ApiResponse<null>,
      { status: 500 }
    );
  }
}

// ============================================================
// POST - REGISTER A NEW PACKER (RULE 27 REGISTRATION)
// ============================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { user, errorResponse } = await requireAuth(request);
    if (errorResponse) return errorResponse;

    const body = await request.json().catch(() => ({}));

    const {
      name,
      registration_number,
      registrationNumber,
      brand,
      registered_office,
      registeredOffice,
      state,
      district,
      contact_email,
      contactEmail,
      contact_phone,
      contactPhone,
      categories,
      status,
    } = body;

    const finalName = (name || "").trim();
    const finalRegNo = (registration_number || registrationNumber || "").trim();
    const finalOffice = (registered_office || registeredOffice || "").trim();
    const finalState = (state || "").trim();
    const finalDistrict = (district || "").trim();

    // Validation
    if (!finalName) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Company / Pre-Packer Name is required.",
          },
        } as ApiResponse<null>,
        { status: 400 }
      );
    }

    if (!finalRegNo) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Rule 27 Registration Certificate Number is required.",
          },
        } as ApiResponse<null>,
        { status: 400 }
      );
    }

    if (!finalOffice) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Registered Office Address is required.",
          },
        } as ApiResponse<null>,
        { status: 400 }
      );
    }

    // Call storage creation & deduplication
    const { entity, isDuplicate } = await createPacker({
      user_id: user.id,
      name: finalName,
      brand: (brand || "").trim(),
      registration_number: finalRegNo,
      registered_office: finalOffice,
      state: finalState || "National Capital Territory of Delhi",
      district: finalDistrict || "HQ Enforcement Zone",
      contact_email: (contact_email || contactEmail || "").trim(),
      contact_phone: (contact_phone || contactPhone || "").trim(),
      categories: Array.isArray(categories) ? categories : ["Packaged Commodity"],
      status: status || "ACTIVE",
    });

    if (isDuplicate) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "DUPLICATE_ENTITY",
            message: `A pre-packer with registration certificate '${finalRegNo}' or name '${finalName}' is already registered in the system.`,
          },
          data: entity,
        },
        { status: 409 }
      );
    }

    // Record immutable audit event for regulatory tracking
    try {
      await recordActivityEvent({
        action: "PACKER_REGISTERED",
        actionLabel: "Rule 27 Registration Issued",
        category: "USER_ACTION",
        actorId: user.id,
        actorName: "Legal Metrology Inspector",
        details: `Granted statutory Rule 27 registration certificate ${entity.registration_number} to ${entity.name}.`,
        metadata: {
          company_id: entity.id,
          registration_number: entity.registration_number,
          state: entity.state,
        },
      });
    } catch (auditErr) {
      console.warn("Non-blocking audit log record failed:", auditErr);
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          id: entity.id,
          name: entity.name,
          brand: entity.brand || "",
          registrationNumber: entity.registration_number,
          registeredOffice: entity.registered_office,
          state: entity.state,
          district: entity.district,
          contactEmail: entity.contact_email || "",
          contactPhone: entity.contact_phone || "",
          categories: entity.categories,
          status: entity.status,
          complianceRate: 100,
          totalAudits: 0,
          passedAudits: 0,
          flaggedAudits: 0,
          lastInspectionDate: entity.created_at,
          registeredDate: entity.created_at.split("T")[0],
          inspectionIds: [],
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/companies error:", err);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: err instanceof Error ? err.message : "Failed to register packer.",
        },
      } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
