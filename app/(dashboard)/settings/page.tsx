"use client";

import React, { useState } from "react";
import {
  Settings,
  Shield,
  Sliders,
  Cpu,
  Database,
  Save,
  Check,
  RotateCcw,
  Bell,
  Scale,
  FileCheck,
} from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function SystemSettingsPage() {
  // Regulatory Engine Settings
  const [activeRuleset, setActiveRuleset] = useState("PCR-2011-AMENDED-2024.1");
  const [uspStrictEnforcement, setUspStrictEnforcement] = useState(true);
  const [autoCheckRule27, setAutoCheckRule27] = useState(true);
  const [strictPdpFontCheck, setStrictPdpFontCheck] = useState(true);

  // AI & OCR Thresholds
  const [confidenceThreshold, setConfidenceThreshold] = useState("85");
  const [autoFlagManualReview, setAutoFlagManualReview] = useState(true);
  const [dualEngineCorroboration, setDualEngineCorroboration] = useState(true);
  const [lowLightEnhancement, setLowLightEnhancement] = useState(true);

  // Enforcement Workflow
  const [defaultJurisdiction, setDefaultJurisdiction] = useState("Delhi NCR - Central Enforcement Zone");
  const [autoDraftNotices, setAutoDraftNotices] = useState(false);
  const [tamperEvidentQrSign, setTamperEvidentQrSign] = useState(true);

  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
    }, 2500);
  };

  const handleResetDefaults = () => {
    setActiveRuleset("PCR-2011-AMENDED-2024.1");
    setUspStrictEnforcement(true);
    setAutoCheckRule27(true);
    setStrictPdpFontCheck(true);
    setConfidenceThreshold("85");
    setAutoFlagManualReview(true);
    setDualEngineCorroboration(true);
    setLowLightEnhancement(true);
    setDefaultJurisdiction("Delhi NCR - Central Enforcement Zone");
    setAutoDraftNotices(false);
    setTamperEvidentQrSign(true);
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
    }, 1500);
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      <PageHeader
        title="System & Regulatory Enforcement Settings"
        description="Configure Legal Metrology statutory rulesets, OCR detection confidence thresholds, and departmental audit workflows."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<RotateCcw className="size-3.5" />}
              onClick={handleResetDefaults}
            >
              Reset Defaults
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={isSaved ? <Check className="size-3.5 text-white" /> : <Save className="size-3.5" />}
              onClick={handleSave}
            >
              {isSaved ? "Settings Saved" : "Save Preferences"}
            </Button>
          </div>
        }
      />

      {isSaved && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
          <Check className="size-4 text-emerald-600" />
          <span>System configuration successfully updated and synced across all inspection nodes.</span>
        </div>
      )}

      {/* Section 1: Statutory Ruleset Versioning */}
      <Card className="border-[#E2E8F0] bg-white shadow-2xs">
        <CardHeader className="pb-3 border-b border-[#E2E8F0]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale className="size-4 text-[#1D4ED8]" />
              <CardTitle className="text-sm font-bold text-[#0F172A]">
                Statutory Ruleset & Legal Basis
              </CardTitle>
            </div>
            <Badge variant="pass">Active Enforcement</Badge>
          </div>
          <CardDescription className="text-xs text-[#475569]">
            Governing rules under Legal Metrology Act, 2009 and Packaged Commodities Rules, 2011.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-[#0F172A] block mb-1.5">
                Active Ruleset Engine Version
              </label>
              <select
                value={activeRuleset}
                onChange={(e) => setActiveRuleset(e.target.value)}
                className="w-full text-xs rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-[#0F172A] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-colors"
              >
                <option value="PCR-2011-AMENDED-2024.1">
                  PCR-2011-AMENDED-2024.1 (Current Gazette G.S.R. 202(E))
                </option>
                <option value="PCR-2011-AMENDED-2022">
                  PCR-2011-AMENDED-2022 (Unit Sale Price Mandate)
                </option>
                <option value="PCR-2011-ORIGINAL">
                  PCR-2011-ORIGINAL (Legacy Baseline)
                </option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#0F172A] block mb-1.5">
                Enforcement Jurisdiction Default
              </label>
              <Input
                value={defaultJurisdiction}
                onChange={(e) => setDefaultJurisdiction(e.target.value)}
                className="text-xs bg-[#F8FAFC]"
              />
            </div>
          </div>

          <div className="border-t border-[#E2E8F0] pt-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-[#0F172A]">
                  Strict Unit Sale Price (USP) Mandate
                </p>
                <p className="text-[11px] text-[#475569]">
                  Strictly enforce Rule 6(1)(e) USP requirement for packages exceeding 1 kg or 1 liter.
                </p>
              </div>
              <Switch checked={uspStrictEnforcement} onChange={setUspStrictEnforcement} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-[#0F172A]">
                  Automatic Rule 27 Packer Registry Verification
                </p>
                <p className="text-[11px] text-[#475569]">
                  Cross-reference extracted manufacturer details against registered pre-packers database.
                </p>
              </div>
              <Switch checked={autoCheckRule27} onChange={setAutoCheckRule27} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-[#0F172A]">
                  Principal Display Panel (PDP) Typography Minimums
                </p>
                <p className="text-[11px] text-[#475569]">
                  Verify letter and numeral height compliant with Rule 7 Table I & II area ratios.
                </p>
              </div>
              <Switch checked={strictPdpFontCheck} onChange={setStrictPdpFontCheck} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: AI & OCR Pipeline Settings */}
      <Card className="border-[#E2E8F0] bg-white shadow-2xs">
        <CardHeader className="pb-3 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-2">
            <Cpu className="size-4 text-[#1D4ED8]" />
            <CardTitle className="text-sm font-bold text-[#0F172A]">
              AI Extraction & OCR Processing
            </CardTitle>
          </div>
          <CardDescription className="text-xs text-[#475569]">
            Fine-tune computer vision confidence tolerances and automated escalation thresholds.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-[#0F172A] block mb-1.5">
                Minimum OCR Confidence Threshold (%)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="70"
                  max="95"
                  step="1"
                  value={confidenceThreshold}
                  onChange={(e) => setConfidenceThreshold(e.target.value)}
                  className="flex-1 accent-[#1D4ED8]"
                />
                <span className="font-mono font-bold text-xs text-[#1D4ED8] w-10 text-right">
                  {confidenceThreshold}%
                </span>
              </div>
              <p className="text-[10px] text-[#475569] mt-1">
                Fields detected below {confidenceThreshold}% trigger automated manual officer verification.
              </p>
            </div>

            <div className="flex flex-col justify-center">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-[#0F172A]">
                    Auto-Flag for Manual Review
                  </p>
                  <p className="text-[11px] text-[#475569]">
                    Route ambiguous extractions directly to the human officer review queue.
                  </p>
                </div>
                <Switch checked={autoFlagManualReview} onChange={setAutoFlagManualReview} />
              </div>
            </div>
          </div>

          <div className="border-t border-[#E2E8F0] pt-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-[#0F172A]">
                  Dual-Engine Cross Corroboration
                </p>
                <p className="text-[11px] text-[#475569]">
                  Run secondary consensus validation across multi-angle photographs for critical fields (MRP & Net Wt).
                </p>
              </div>
              <Switch checked={dualEngineCorroboration} onChange={setDualEngineCorroboration} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-[#0F172A]">
                  Automatic Low-Light & Glare Enhancement
                </p>
                <p className="text-[11px] text-[#475569]">
                  Apply adaptive histogram equalization to retail surveillance shelf photos.
                </p>
              </div>
              <Switch checked={lowLightEnhancement} onChange={setLowLightEnhancement} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Enforcement & Judicial Certification */}
      <Card className="border-[#E2E8F0] bg-white shadow-2xs">
        <CardHeader className="pb-3 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-2">
            <FileCheck className="size-4 text-[#1D4ED8]" />
            <CardTitle className="text-sm font-bold text-[#0F172A]">
              Judicial Certification & Notice Generation
            </CardTitle>
          </div>
          <CardDescription className="text-xs text-[#475569]">
            Settings for tamper-evident cryptographic reports and statutory penalty drafting.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[#0F172A]">
                Cryptographic SHA-256 Hash on Statutory Certificates
              </p>
              <p className="text-[11px] text-[#475569]">
                Embed verifiable verification hashes into generated PDF reports for courtroom presentation.
              </p>
            </div>
            <Switch checked={tamperEvidentQrSign} onChange={setTamperEvidentQrSign} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[#0F172A]">
                Auto-Draft Legal Notice for Major Violations
              </p>
              <p className="text-[11px] text-[#475569]">
                Pre-populate formal departmental notice under Section 36 for non-compliant inspections.
              </p>
            </div>
            <Switch checked={autoDraftNotices} onChange={setAutoDraftNotices} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
