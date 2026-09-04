"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [badgeNumber, setBadgeNumber] = useState("");
  const [department, setDepartment] = useState("Department of Consumer Affairs, Legal Metrology Wing");
  const [jurisdiction, setJurisdiction] = useState("Delhi NCR - Central Zone");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("INSPECTOR");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setIsSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 1500);
    }, 600);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#F8FAFC] p-4 sm:p-6 font-sans">
      <div className="w-full max-w-lg">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="size-12 rounded-xl bg-gradient-to-b from-[#2563EB] to-[#1D4ED8] text-white flex items-center justify-center shadow-[0_4px_16px_rgba(29,78,216,0.35)] mb-3">
            <ShieldCheck className="size-7" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[#0F172A]">PackCheck AI</h1>
          <p className="text-xs text-[#475569] mt-1">
            Officer Registration Request • Legal Metrology Enforcement
          </p>
        </div>

        <Card className="border-[#E2E8F0] bg-white shadow-xs">
          <CardHeader className="space-y-1">
            <CardTitle className="text-lg font-semibold text-[#0F172A]">Inspector Onboarding Request</CardTitle>
            <CardDescription className="text-xs text-[#475569]">
              Official departmental credentials verification under Legal Metrology Act, 2009
            </CardDescription>
          </CardHeader>

          {isSuccess ? (
            <CardContent className="p-8 text-center space-y-3">
              <div className="size-12 rounded-full bg-[#DCFCE7] text-[#166534] border border-[#86EFAC] flex items-center justify-center mx-auto">
                <CheckCircle2 className="size-6" />
              </div>
              <h3 className="text-sm font-bold text-[#0F172A]">Registration Submitted</h3>
              <p className="text-xs text-[#475569]">
                Your departmental verification request has been logged. Redirecting to official login...
              </p>
            </CardContent>
          ) : (
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-[#0F172A]">Full Name</label>
                    <Input
                      required
                      placeholder="Inspector Rajesh Sharma"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="text-xs h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-[#0F172A]">Employee / Badge ID</label>
                    <Input
                      required
                      placeholder="LM-DEL-4821"
                      value={badgeNumber}
                      onChange={(e) => setBadgeNumber(e.target.value)}
                      className="text-xs h-8 font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-[#0F172A]">Department Wing</label>
                  <Input
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="text-xs h-8"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-[#0F172A]">Jurisdiction / Zone</label>
                    <Input
                      value={jurisdiction}
                      onChange={(e) => setJurisdiction(e.target.value)}
                      className="text-xs h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-[#0F172A]">Demo Role Authorization</label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full h-8 px-2.5 rounded-lg border border-[#E2E8F0] bg-white text-xs text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                    >
                      <option value="INSPECTOR">Legal Metrology Inspector</option>
                      <option value="SENIOR_LEGAL_METROLOGY_OFFICER">Senior Enforcement Officer</option>
                      <option value="CONTROLLER">Controller of Legal Metrology</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-[#0F172A]">Official Government Email ID</label>
                  <Input
                    type="email"
                    required
                    placeholder="officer.name@gov.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="text-xs h-8"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-[#0F172A]">Password</label>
                    <Input
                      type="password"
                      required
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="text-xs h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-[#0F172A]">Confirm Password</label>
                    <Input
                      type="password"
                      required
                      placeholder="••••••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="text-xs h-8"
                    />
                  </div>
                </div>

                <p className="text-[11px] text-[#94A3B8] pt-1">
                  Note: Role assignment is for demonstration purposes. In production, roles are assigned via National Informatics Centre (NIC) SSO.
                </p>
              </CardContent>

              <CardFooter className="flex flex-col gap-3 pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isLoading}
                  rightIcon={<ArrowRight className="size-3.5" />}
                  className="w-full text-xs font-semibold"
                >
                  Submit Clearance Request
                </Button>
                <div className="flex items-center justify-center w-full text-[11px] text-[#475569]">
                  <span>Already have officer clearance?</span>
                  <Link href="/login" className="text-[#1D4ED8] font-semibold ml-1 hover:underline">
                    Sign In
                  </Link>
                </div>
              </CardFooter>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
