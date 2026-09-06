"use client";

import { useEffect, use } from "react";
import { useRouter } from "next/navigation";

interface EvidencePageProps {
  params: Promise<{ id: string }>;
}

export default function EvidencePage({ params }: EvidencePageProps) {
  const resolvedParams = use(params);
  const inspectionId = resolvedParams.id;
  const router = useRouter();

  useEffect(() => {
    // Evidence panel is temporarily disabled; redirect smoothly to compliance step
    router.replace(`/inspections/${inspectionId}/compliance`);
  }, [router, inspectionId]);

  return (
    <div className="p-8 text-center text-xs text-[#475569]">
      Redirecting to compliance findings...
    </div>
  );
}
