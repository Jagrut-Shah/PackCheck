"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck, ArrowRight, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog } from "@/components/ui/dialog";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { sendPasswordReset, signIn } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("rajesh.kumar@gov.in");
  const [password, setPassword] = useState("password123");
  const [rememberMe, setRememberMe] = useState(true);
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSubmitted, setResetSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const { error: signInError } = await signIn(email, password);
    if (signInError) {
      setError(signInError.message);
      setIsLoading(false);
      return;
    }

    if (rememberMe) {
      localStorage.setItem("packcheck-remember-email", email);
    } else {
      localStorage.removeItem("packcheck-remember-email");
    }
    setIsLoading(false);
    if (typeof window !== "undefined") {
      router.push("/dashboard");
    }
  };

  const handleResetPassword = async () => {
    if (!resetEmail) return;
    const { error: resetError } = await sendPasswordReset(resetEmail);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setResetSubmitted(true);
    setTimeout(() => {
      setIsForgotModalOpen(false);
      setResetSubmitted(false);
      setResetEmail("");
    }, 1500);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#F8FAFC] p-4 sm:p-6 font-sans">
      <div className="w-full max-w-md">
        {/* Department / Brand Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="size-12 rounded-xl bg-gradient-to-b from-[#2563EB] to-[#1D4ED8] text-white flex items-center justify-center shadow-[0_4px_16px_rgba(29,78,216,0.35)] mb-3">
            <ShieldCheck className="size-7" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[#0F172A]">PackCheck AI</h1>
          <p className="text-xs text-[#475569] mt-1">
            Department of Consumer Affairs • Legal Metrology Portal
          </p>
        </div>

        {/* Login Card */}
        <Card className="border-[#E2E8F0] bg-white shadow-xs">
          <CardHeader className="space-y-1">
            <CardTitle className="text-lg font-semibold text-[#0F172A]">Officer Sign In</CardTitle>
            <CardDescription className="text-xs text-[#475569]">
              Enter your government credentials to access the inspection system
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#0F172A]">Official Government Email ID</label>
                <div className="relative">
                  <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-[#94A3B8]" />
                  <Input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="officer.name@gov.in"
                    className="pl-8 text-xs h-9"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-[#0F172A]">Password</label>
                  <button
                    type="button"
                    onClick={() => setIsForgotModalOpen(true)}
                    className="text-[11px] text-[#1D4ED8] hover:underline font-medium cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-[#94A3B8]" />
                  <Input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="pl-8 text-xs h-9"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <label
                  htmlFor="remember"
                  className="text-xs text-[#475569] cursor-pointer select-none"
                >
                  Remember my officer credentials
                </label>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3">
              <Button
                type="submit"
                variant="primary"
                isLoading={isLoading}
                rightIcon={<ArrowRight className="size-3.5" />}
                className="w-full text-xs font-semibold"
              >
                Access Inspection Portal
              </Button>
              {error && <p className="w-full text-xs text-red-600" role="alert">{error}</p>}

              <div className="flex items-center justify-between w-full text-[11px] text-[#475569]">
                <span>Need inspector onboarding?</span>
                <Link href="/signup" className="text-[#1D4ED8] font-semibold hover:underline">
                  Request Registration
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>

        {/* Statutory Footer notice */}
        <p className="text-center text-[11px] text-[#94A3B8] mt-6">
          Authorized for official enforcement under Legal Metrology (Packaged Commodities) Rules, 2011.
        </p>
      </div>

      {/* Forgot Password Dialog */}
      <Dialog
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
        title="Reset Officer Access Credentials"
        description="Password recovery requests require verification from departmental IT administration."
        size="md"
      >
        <div className="space-y-4 text-xs">
          {resetSubmitted ? (
            <div className="p-4 rounded-lg bg-[#DCFCE7] border border-[#86EFAC] text-[#166534] text-center font-bold">
              Password reset link sent to your departmental inbox.
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <label className="font-semibold text-[#0F172A]">Enter Official Government Email</label>
                <Input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="officer.name@gov.in"
                  className="text-xs"
                />
              </div>
              <p className="text-[11px] text-[#475569]">
                A time-limited clearance link will be dispatched to your registered government email.
              </p>
              <div className="flex justify-end gap-2 pt-2 border-t border-[#F1F5F9]">
                <Button variant="secondary" size="sm" onClick={() => setIsForgotModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" onClick={handleResetPassword}>
                  Send Recovery Link
                </Button>
              </div>
            </>
          )}
        </div>
      </Dialog>
    </div>
  );
}
