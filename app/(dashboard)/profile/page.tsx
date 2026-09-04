"use client";

import React, { useState, useEffect } from "react";
import { Shield, MapPin, Mail, Settings, Save, Check, Building, BadgeCheck } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser } from "@/lib/auth";
import { UserProfile } from "@/lib/types/user";
import { useToast } from "@/components/common/toast";

export default function ProfilePage() {
  const toast = useToast();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const u = await getCurrentUser();
        if (u) setUser(u);
      } catch (err) {
        console.warn("Could not fetch current user in profile", err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const [notifyNonCompliance, setNotifyNonCompliance] = useState(true);
  const [notifyManualReview, setNotifyManualReview] = useState(true);
  const [autoOpenReview, setAutoOpenReview] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const handleSavePreferences = () => {
    setIsSaved(true);
    toast.success("Preferences Saved", "Enforcement notification preferences updated successfully.");
    setTimeout(() => setIsSaved(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center text-xs text-[#475569]">
        Loading officer credentials...
      </div>
    );
  }

  const officer = user || {
    id: "guest",
    fullName: "Legal Metrology Inspector",
    employeeCode: "EMP-DEL-4821",
    email: "officer@delhi.gov.in",
    role: "INSPECTOR",
    designation: "Assistant Controller of Legal Metrology",
    department: "Legal Metrology Wing",
    organizationId: "DCA-IND",
    jurisdictionDistrict: "Delhi NCR - Central Zone",
    jurisdictionState: "Delhi",
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      <PageHeader
        title="Officer Profile & Settings"
        description="Department credentials, assigned jurisdiction, and verification preferences."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Col: Officer Card */}
        <Card className="border-[#E2E8F0] bg-white shadow-2xs md:col-span-1">
          <CardContent className="p-6 flex flex-col items-center text-center">
            <div className="size-20 rounded-full bg-[#EFF6FF] border-2 border-[#BFDBFE] flex items-center justify-center text-xl font-bold text-[#1D4ED8] mb-4">
              LM
            </div>
            <h3 className="text-sm font-bold text-[#0F172A]">{officer.fullName}</h3>
            <p className="text-xs text-[#475569] mt-0.5">{officer.designation || "Legal Metrology Inspector"}</p>
            <div className="mt-3">
              <Badge variant="pass">Active Enforcement Clearance</Badge>
            </div>

            <div className="w-full border-t border-[#E2E8F0] mt-5 pt-4 text-xs text-left space-y-2.5">
              <div className="flex items-center justify-between text-[#475569]">
                <span>Employee Code:</span>
                <span className="font-mono font-bold text-[#0F172A]">{officer.employeeCode || "EMP-DEL-4821"}</span>
              </div>
              <div className="flex items-center justify-between text-[#475569]">
                <span>Role:</span>
                <span className="font-semibold text-[#1D4ED8]">{officer.role}</span>
              </div>
              <div className="flex items-center justify-between text-[#475569]">
                <span>Email:</span>
                <span className="text-[#0F172A] truncate max-w-35" title={officer.email}>{officer.email}</span>
              </div>
              <div className="flex items-center justify-between text-[#475569]">
                <span>Organization:</span>
                <span className="text-[#0F172A]">{officer.organizationId || "DCA-IND"}</span>
              </div>
              <div className="flex items-center justify-between text-[#475569]">
                <span>Department:</span>
                <span className="text-[#0F172A] truncate max-w-35" title={officer.department}>{officer.department || "Legal Metrology Wing"}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right 2 Cols: Jurisdiction & Preferences */}
        <div className="md:col-span-2 flex flex-col gap-6">
          <Card className="border-[#E2E8F0] bg-white shadow-2xs">
            <CardHeader>
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">
                Enforcement Jurisdiction & Statutory Clearances
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="p-4 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
                <div className="flex justify-between">
                  <span className="font-semibold text-[#0F172A]">Governing Act</span>
                  <span className="text-[#475569]">Legal Metrology Act, 2009 (No. 1 of 2010)</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-[#0F172A]">Statutory Rules</span>
                  <span className="text-[#475569]">Packaged Commodities Rules, 2011 (As amended)</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-[#0F172A]">Assigned Territory</span>
                  <span className="text-[#475569]">{officer.jurisdictionDistrict || "Delhi NCR - Central Zone"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-[#0F172A]">Department Wing</span>
                  <span className="text-[#475569]">{officer.department || "Legal Metrology Wing"}</span>
                </div>
              </div>

              <div className="p-4 rounded-lg border border-[#E2E8F0] bg-white space-y-2">
                <h4 className="font-semibold text-[#0F172A]">Inspection Authorizations</h4>
                <ul className="list-disc list-inside text-[#475569] space-y-1">
                  <li>Power of inspection and search of pre-packaged commodities (Section 15)</li>
                  <li>Seizure of non-compliant packages and evidence collection (Section 16)</li>
                  <li>Issuance of compounding and show-cause statutory notices (Section 48)</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Verification Preferences Card */}
          <Card className="border-[#E2E8F0] bg-white shadow-2xs">
            <CardHeader>
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-[#0F172A] flex items-center gap-2">
                <Settings className="size-3.5" />
                <span>Inspection & Alert Preferences</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="flex items-center justify-between p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                <div>
                  <span className="font-semibold text-[#0F172A] block">Statutory Non-Compliance Alerts</span>
                  <span className="text-[11px] text-[#475569]">Immediate notification on Rule 6 infractions</span>
                </div>
                <Switch checked={notifyNonCompliance} onChange={(val) => setNotifyNonCompliance(val)} />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                <div>
                  <span className="font-semibold text-[#0F172A] block">Manual Review Escalations</span>
                  <span className="text-[11px] text-[#475569]">Notify when image blur or low confidence requires physical review</span>
                </div>
                <Switch checked={notifyManualReview} onChange={(val) => setNotifyManualReview(val)} />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                <div>
                  <span className="font-semibold text-[#0F172A] block">Direct Review Navigation</span>
                  <span className="text-[11px] text-[#475569]">Automatically advance to Review screen upon pipeline completion</span>
                </div>
                <Switch checked={autoOpenReview} onChange={(val) => setAutoOpenReview(val)} />
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={isSaved ? <Check className="size-3.5" /> : <Save className="size-3.5" />}
                  onClick={handleSavePreferences}
                >
                  {isSaved ? "Preferences Saved" : "Save Preferences"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
