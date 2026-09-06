"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    async function checkRootAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.user) {
          router.replace("/dashboard");
        } else {
          router.replace("/login");
        }
      } catch {
        router.replace("/login");
      }
    }
    checkRootAuth();
  }, [router]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#F8FAFC]">
      <div className="flex flex-col items-center gap-3">
        <div className="size-8 animate-spin rounded-full border-3 border-[#CBD5E1] border-t-[#1D4ED8]" />
        <span className="text-xs font-medium text-[#64748B]">Verifying officer credentials...</span>
      </div>
    </div>
  );
}
