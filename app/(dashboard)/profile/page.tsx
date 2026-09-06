"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Building2,
  Scale,
  Check,
  Copy,
  ClipboardList,
  Award,
  CheckCircle2,
  LogOut,
} from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser, signOut } from "@/lib/auth";
import { UserProfile } from "@/lib/types/user";
import { useToast } from "@/components/common/toast";
import { supabase } from "@/lib/supabase";

export default function OfficerProfilePage() {
  const toast = useToast();
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Real operational count: Audits Completed
  const [completedAudits, setCompletedAudits] = useState<number>(0);

  // Load user profile and real completed audits count
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const u = await getCurrentUser();
        if (u) setUser(u);

        // Fetch real completed inspections count from Supabase
        const compRes = await supabase
          .from("inspections")
          .select("*", { count: "exact", head: true })
          .eq("status", "COMPLETED");

        setCompletedAudits(compRes.count || 0);
      } catch (err) {
        console.warn("Could not load officer credentials or metrics:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const handleCopyOfficerId = (idText: string) => {
    navigator.clipboard.writeText(idText);
    setCopiedId(true);
    toast.success("Officer ID Copied", "Credential identifier copied to clipboard.");
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      toast.success("Signed Out", "Officer session terminated successfully.");
    } catch (err) {
      console.error("Sign out error:", err);
    } finally {
      router.push("/login");
    }
  };

  // Canonical Officer Information
  const officer: UserProfile = user || {
    id: "officer_enforcement_delhi",
    fullName: "Jagrut Shah",
    employeeCode: "LM-DEL-2024-8841",
    email: "jagrut.shah@delhi.gov.in",
    role: "INSPECTOR",
    designation: "Legal Metrology Inspector (General Cadre)",
    department: "Legal Metrology Division, Department of Consumer Affairs",
    organizationId: "DCA-IND-NZ",
    departmentId: "LM-ZONE-CENTRAL",
    jurisdictionDistrict: "Delhi NCR — Central Enforcement Division",
    jurisdictionState: "NCT of Delhi",
    isActive: true,
  };

  const initials = officer.fullName
    ? officer.fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase()
    : "LM";

  if (isLoading) {
    return (
      <div className="p-16 text-center text-xs text-[#64748B]">
        <div className="inline-flex h-7 w-7 animate-spin rounded-full border-2 border-[#CBD5E1] border-t-[#1D4ED8] mb-3" />
        <p>Loading officer profile & credentials...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-12">
      {/* Top Page Header */}
      <PageHeader
        title="Officer Profile"
        description="Departmental credentials and gazetted enforcement jurisdiction."
        actions={
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#EFF6FF] border border-[#BFDBFE] text-[#1D4ED8] text-xs font-semibold">
              <ShieldCheck className="size-3.5" />
              <span>Gazetted Enforcement Clearance</span>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#FEE2E2] bg-white hover:bg-[#FEF2F2] text-[#DC2626] text-xs font-medium transition-colors cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50"
              title="Sign out of officer terminal"
            >
              <LogOut className="size-3.5" />
              <span>{isSigningOut ? "Signing Out..." : "Sign Out"}</span>
            </button>
          </div>
        }
      />

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* =========================================================================
            SECTION 1: OFFICER IDENTITY (Left Column)
           ========================================================================= */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <Card className="border-[#E2E8F0] bg-white shadow-2xs">
            <CardContent className="p-6 flex flex-col items-center text-center">
              {/* Officer Monogram / Avatar */}
              <div className="relative mb-4">
                <div className="size-20 rounded-full bg-gradient-to-b from-[#2563EB] to-[#1D4ED8] text-white flex items-center justify-center text-2xl font-bold shadow-md border-3 border-white ring-2 ring-[#BFDBFE]">
                  {initials}
                </div>
                <div
                  className="absolute -bottom-1 -right-1 size-6 rounded-full bg-[#16A34A] text-white flex items-center justify-center shadow-xs border-2 border-white"
                  title="Verified Enforcement Officer"
                >
                  <CheckCircle2 className="size-3.5" />
                </div>
              </div>

              {/* Officer Name & Designation */}
              <h2 className="text-base font-bold text-[#0F172A]">{officer.fullName}</h2>
              <p className="text-xs font-medium text-[#475569] mt-0.5">
                {officer.designation || "Legal Metrology Inspector"}
              </p>

              {/* Official Status Badge */}
              <div className="mt-3">
                <Badge variant="pass">Active Statutory Clearance</Badge>
              </div>

              {/* Quick Identity Particulars */}
              <div className="w-full border-t border-[#E2E8F0] mt-5 pt-4 text-xs text-left space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[#64748B]">Badge / Emp Code:</span>
                  <span className="font-mono font-bold text-[#0F172A] bg-[#F1F5F9] px-2 py-0.5 rounded border border-[#E2E8F0]">
                    {officer.employeeCode || "LM-DEL-2024-8841"}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#64748B]">Official Email:</span>
                  <span
                    className="font-medium text-[#0F172A] truncate max-w-44"
                    title={officer.email}
                  >
                    {officer.email}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#64748B]">Service Cadre:</span>
                  <span className="font-semibold text-[#1D4ED8]">
                    {officer.role === "INSPECTOR" ? "Legal Metrology Inspector" : officer.role}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#64748B]">Authentication:</span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#166534]">
                    <span className="size-1.5 rounded-full bg-[#166534]" />
                    <span>SSO Active Session</span>
                  </span>
                </div>
              </div>

              {/* Officer Identifier Key */}
              <div className="w-full mt-4 p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-left">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] block mb-1">
                  Enforcement Officer UUID
                </span>
                <div className="flex items-center justify-between gap-1">
                  <span className="font-mono text-[11px] text-[#0F172A] truncate" title={officer.id}>
                    {officer.id}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyOfficerId(officer.id)}
                    className="p-1 text-[#64748B] hover:text-[#1D4ED8] rounded hover:bg-[#EFF6FF] transition-colors cursor-pointer shrink-0"
                    title="Copy UUID"
                    aria-label="Copy Officer ID"
                  >
                    {copiedId ? <Check className="size-3 text-[#16A34A]" /> : <Copy className="size-3" />}
                  </button>
                </div>
              </div>

              {/* Officer Section Sign Out Button */}
              <div className="w-full mt-4 pt-3 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-[#FEE2E2] bg-[#FEF2F2]/60 hover:bg-[#FEF2F2] text-[#DC2626] text-xs font-semibold transition-all duration-150 cursor-pointer shadow-2xs active:scale-[0.98] disabled:opacity-50"
                  title="Sign out of officer terminal"
                >
                  <LogOut className="size-3.5" />
                  <span>{isSigningOut ? "Signing Out..." : "Log Out"}</span>
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Operational Record Card — Audits Completed Total */}
          <Card className="border-[#E2E8F0] bg-white shadow-2xs">
            <CardHeader className="pb-3 border-b border-[#E2E8F0]">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-[#0F172A] flex items-center gap-2">
                <ClipboardList className="size-3.5 text-[#1D4ED8]" />
                <span>Operational Record</span>
              </CardTitle>
              <CardDescription className="text-[11px] text-[#64748B]">
                Active enforcement activity tracked across system logs.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <div className="p-3.5 rounded-lg bg-[#F0FDF4] border border-[#DCFCE7] flex items-center justify-between">
                <div>
                  <span className="text-[11px] uppercase font-bold tracking-wider text-[#166534] block">
                    Audits Completed
                  </span>
                  <span className="text-[10px] text-[#64748B] mt-0.5 block">
                    Total verified inspections concluded
                  </span>
                </div>
                <div className="text-2xl font-bold text-[#16A34A] font-mono">
                  {completedAudits}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right 2 Columns: Official Info & Jurisdiction */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* =========================================================================
              SECTION 2: OFFICIAL INFORMATION
             ========================================================================= */}
          <Card className="border-[#E2E8F0] bg-white shadow-2xs">
            <CardHeader className="pb-3 border-b border-[#E2E8F0]">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-[#0F172A] flex items-center gap-2">
                <Building2 className="size-3.5 text-[#1D4ED8]" />
                <span>Official Information & Departmental Posting</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 text-xs space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                  <span className="text-[10px] uppercase font-bold text-[#64748B] block mb-1">
                    Department / Ministry
                  </span>
                  <p className="font-semibold text-[#0F172A]">
                    {officer.department || "Department of Consumer Affairs, Legal Metrology Wing"}
                  </p>
                  <p className="text-[11px] text-[#64748B] mt-0.5">Government of India</p>
                </div>

                <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                  <span className="text-[10px] uppercase font-bold text-[#64748B] block mb-1">
                    Controlling Office / Station
                  </span>
                  <p className="font-semibold text-[#0F172A]">
                    Office of the Controller of Legal Metrology
                  </p>
                  <p className="text-[11px] text-[#64748B] mt-0.5">HQ Enforcement Cell, New Delhi</p>
                </div>

                <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                  <span className="text-[10px] uppercase font-bold text-[#64748B] block mb-1">
                    Organization Identifier
                  </span>
                  <p className="font-mono font-bold text-[#0F172A]">
                    {officer.organizationId || "DCA-IND-NZ"}
                  </p>
                  <p className="text-[11px] text-[#64748B] mt-0.5">Northern Enforcement Zone</p>
                </div>

                <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                  <span className="text-[10px] uppercase font-bold text-[#64748B] block mb-1">
                    Warrant Clearance Status
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="size-2 rounded-full bg-[#16A34A]" />
                    <span className="font-semibold text-[#166534]">Class-I Authorized Inspector</span>
                  </div>
                  <p className="text-[11px] text-[#64748B] mt-0.5">Gazette Ref: GSR-202(E)</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* =========================================================================
              SECTION 3: JURISDICTION & AUTHORITY
             ========================================================================= */}
          <Card className="border-[#E2E8F0] bg-white shadow-2xs">
            <CardHeader className="pb-3 border-b border-[#E2E8F0]">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-[#0F172A] flex items-center gap-2">
                <Scale className="size-3.5 text-[#1D4ED8]" />
                <span>Jurisdiction & Statutory Enforcement Authority</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 text-xs space-y-4">
              {/* Legal Mandate Header */}
              <div className="p-3.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-[#E2E8F0]">
                  <span className="font-semibold text-[#0F172A]">Governing Statute</span>
                  <span className="text-[#475569] font-medium">
                    Legal Metrology Act, 2009 (Act No. 1 of 2010)
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-[#E2E8F0]">
                  <span className="font-semibold text-[#0F172A]">Subordinate Legislation</span>
                  <span className="text-[#475569] font-medium">
                    Legal Metrology (Packaged Commodities) Rules, 2011 [PCR 2011]
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-[#E2E8F0]">
                  <span className="font-semibold text-[#0F172A]">Assigned Territory</span>
                  <span className="text-[#1D4ED8] font-bold">
                    {officer.jurisdictionDistrict || "Delhi NCR — Central Enforcement Division"}
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className="font-semibold text-[#0F172A]">State / Union Territory</span>
                  <span className="text-[#475569] font-medium">
                    {officer.jurisdictionState || "National Capital Territory of Delhi"}
                  </span>
                </div>
              </div>

              {/* Statutory Warrant / Power Summary */}
              <div className="p-3.5 rounded-lg border border-[#E2E8F0] bg-white space-y-2.5">
                <div className="flex items-center gap-2 text-[#0F172A] font-bold">
                  <Award className="size-3.5 text-[#1D4ED8]" />
                  <span>Statutory Powers Vested in Authorized Officer</span>
                </div>
                <ul className="space-y-2 text-[#475569] pl-1">
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-[#0F172A] shrink-0">• Section 15:</span>
                    <span>
                      Power of entry, inspection, and search of commercial retail premises, wholesale warehouses, and packaging facilities.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-[#0F172A] shrink-0">• Section 16:</span>
                    <span>
                      Power of seizure of non-compliant packaged commodities and secure preservation of evidentiary photographs.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-[#0F172A] shrink-0">• Section 48 & 49:</span>
                    <span>
                      Authority to recommend compounding of statutory offences and issue formal notices to corporate pre-packers.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-[#0F172A] shrink-0">• Rule 6 & 7:</span>
                    <span>
                      Enforcement of mandatory declarations (MRP, USP, Net Quantity, Dates, Manufacturer/Packer details) and typography font area ratios.
                    </span>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
