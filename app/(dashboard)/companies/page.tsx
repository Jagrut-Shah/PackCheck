"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Search,
  Plus,
  MapPin,
  ClipboardList,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCompanies, RegisteredPacker } from "@/lib/api/companies";
import { RegisterPackerModal } from "@/components/companies/register-packer-modal";

export default function CompaniesPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<RegisteredPacker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [stateFilter, setStateFilter] = useState("ALL");
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  const loadCompanies = async () => {
    setIsLoading(true);
    try {
      const data = await getCompanies();
      setCompanies(data);
    } catch (err) {
      console.error("Error loading companies", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  const handlePackerRegistered = (newPacker: RegisteredPacker) => {
    setCompanies((prev) => [
      newPacker,
      ...prev.filter((p) => p.id !== newPacker.id),
    ]);
  };

  const filteredCompanies = companies.filter((comp) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      comp.name.toLowerCase().includes(q) ||
      (comp.brand && comp.brand.toLowerCase().includes(q)) ||
      comp.registrationNumber.toLowerCase().includes(q);
    const matchesState =
      stateFilter === "ALL" || comp.state.toLowerCase().includes(stateFilter.toLowerCase());
    return matchesSearch && matchesState;
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Registered Manufacturers & Pre-Packers"
        description="Entities registered under Rule 27 of Legal Metrology (Packaged Commodities) Rules, 2011."
        actions={
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="size-3.5" />}
            onClick={() => setIsRegisterModalOpen(true)}
          >
            Register Packer
          </Button>
        }
      />

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-xl border border-[#E2E8F0] bg-white shadow-2xs">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-[#94A3B8]" />
          <Input
            placeholder="Search by registered entity name, brand, or Rule 27 number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 text-xs h-8 bg-[#F8FAFC] border-[#E2E8F0] focus:bg-white"
          />
        </div>

        <select
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
          className="h-8 px-2.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-xs text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
        >
          <option value="ALL">All States / UTs</option>
          <option value="Delhi">Delhi NCR</option>
          <option value="Gujarat">Gujarat</option>
          <option value="Maharashtra">Maharashtra</option>
          <option value="Uttarakhand">Uttarakhand</option>
          <option value="Haryana">Haryana</option>
          <option value="Karnataka">Karnataka</option>
        </select>
      </div>

      {/* Companies Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-[#475569]">
          <div className="inline-flex h-6 w-6 animate-spin rounded-full border-2 border-[#CBD5E1] border-t-[#1D4ED8] mb-2" />
          <p>Loading registered manufacturer records...</p>
        </div>
      ) : filteredCompanies.length === 0 ? (
        <div className="p-12 text-center text-xs text-[#475569] border border-[#E2E8F0] rounded-xl bg-white">
          No registered manufacturers match the filter criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCompanies.map((packer) => (
            <Card
              key={packer.id}
              onClick={() => router.push(`/companies/${packer.id}`)}
              className="border-[#E2E8F0] bg-white shadow-2xs hover:border-[#CBD5E1] hover:shadow-xs cursor-pointer transition-all"
            >
              <CardContent className="p-5 flex flex-col justify-between h-full gap-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="size-8 rounded-lg bg-[#EFF6FF] text-[#1D4ED8] flex items-center justify-center shrink-0">
                      <Building2 className="size-4" />
                    </div>
                    <Badge
                      variant={
                        packer.status === "ACTIVE"
                          ? "pass"
                          : packer.status === "UNDER_REVIEW"
                          ? "review"
                          : "fail"
                      }
                    >
                      {packer.status === "ACTIVE"
                        ? "Active License"
                        : packer.status === "UNDER_REVIEW"
                        ? "Under Review"
                        : "Suspended"}
                    </Badge>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-[#0F172A] line-clamp-2">
                      {packer.name}
                    </h3>
                    {packer.brand && (
                      <span className="text-[11px] text-[#1D4ED8] font-semibold">
                        {packer.brand}
                      </span>
                    )}
                    <span className="block text-[10px] text-[#64748B] font-mono mt-0.5">
                      {packer.registrationNumber}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#F1F5F9] text-[11px] text-[#475569] space-y-1.5">
                  <div className="flex justify-between">
                    <span>Jurisdiction:</span>
                    <span className="text-[#0F172A] font-medium truncate max-w-[140px]" title={`${packer.district}, ${packer.state}`}>
                      {packer.district}, {packer.state}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Inspections / Audits:</span>
                    <span className="text-[#0F172A] font-bold">
                      {packer.totalAudits > 0
                        ? `${packer.totalAudits} audit${packer.totalAudits > 1 ? "s" : ""}`
                        : "No inspections yet"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Latest Inspection:</span>
                    <span className="text-[#0F172A] font-mono text-[10px]">
                      {packer.lastInspectionDate && packer.totalAudits > 0
                        ? new Date(packer.lastInspectionDate).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-[#F1F5F9]">
                    <span className="font-semibold text-[#0F172A]">Compliance Standing:</span>
                    <span
                      className={`font-bold text-xs ${
                        packer.totalAudits === 0
                          ? "text-[#64748B]"
                          : packer.flaggedAudits === 0
                          ? "text-[#166534]"
                          : "text-[#991B1B]"
                      }`}
                    >
                      {packer.totalAudits === 0
                        ? "Pending First Audit"
                        : packer.flaggedAudits === 0
                        ? "COMPLIANT"
                        : `${packer.flaggedAudits} VIOLATION${packer.flaggedAudits > 1 ? "S" : ""}`}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Register Packer Modal */}
      <RegisterPackerModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        onSuccess={handlePackerRegistered}
      />
    </div>
  );
}
