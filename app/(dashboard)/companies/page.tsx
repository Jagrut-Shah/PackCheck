"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Building2, Search, Plus, MapPin, ClipboardList, CheckCircle2, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCompanies } from "@/lib/api/companies";
import { RegisteredPacker } from "@/mocks/companies";

export default function CompaniesPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<RegisteredPacker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [stateFilter, setStateFilter] = useState("ALL");

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const data = await getCompanies();
        setCompanies(data);
      } catch (err) {
        console.error("Error loading companies", err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const filteredCompanies = companies.filter((comp) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      comp.name.toLowerCase().includes(q) ||
      comp.brand.toLowerCase().includes(q) ||
      comp.registrationNumber.toLowerCase().includes(q);
    const matchesState = stateFilter === "ALL" || comp.state.includes(stateFilter);
    return matchesSearch && matchesState;
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Registered Manufacturers & Pre-Packers"
        description="Entities registered under Rule 27 of Legal Metrology (Packaged Commodities) Rules, 2011."
        actions={
          <Button variant="primary" size="sm" leftIcon={<Plus className="size-3.5" />}>
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
          <option value="Uttarakhand">Uttarakhand</option>
        </select>
      </div>

      {/* Companies Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-[#475569]">
          Loading registered manufacturer records...
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
                    <Badge variant={packer.status === "ACTIVE" ? "pass" : "review"}>
                      {packer.status === "ACTIVE" ? "Active License" : "Under Review"}
                    </Badge>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-[#0F172A] line-clamp-2">{packer.name}</h3>
                    <span className="text-[11px] text-[#1D4ED8] font-semibold">{packer.brand}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#F1F5F9] text-[11px] text-[#475569] space-y-1.5">
                  <div className="flex justify-between">
                    <span>Location:</span>
                    <span className="text-[#0F172A]">{packer.district}, {packer.state}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Inspections:</span>
                    <span className="text-[#0F172A] font-semibold">{packer.totalAudits} audits</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Latest Inspection:</span>
                    <span className="text-[#0F172A] font-mono">01 Feb 2026</span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-[#F1F5F9]">
                    <span className="font-semibold text-[#0F172A]">Recent Audit Verdict:</span>
                    <span
                      className={`font-bold text-xs ${
                        packer.complianceRate >= 90
                          ? "text-[#166534]"
                          : packer.complianceRate >= 80
                          ? "text-[#92400E]"
                          : "text-[#991B1B]"
                      }`}
                    >
                      {packer.complianceRate >= 90 ? "PASS" : "POTENTIAL NON-COMPLIANCE"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
