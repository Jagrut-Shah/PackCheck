"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  FileText,
  Palette,
  Component,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/common/page-header";
import { SectionHeader } from "@/components/common/section-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert } from "@/components/ui/alert";

export default function DevDesignSystemGalleryPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [switchState, setSwitchState] = useState(true);
  const [checkboxState, setCheckboxState] = useState(true);

  return (
    <AppShell title="Development Design System & Component Library" breadcrumbItems={[{ label: "Dev Tools" }, { label: "Design System" }]}>
      <PageHeader
        title="Design System & Component Library"
        description="Development-only UI token showcase and component reference for PackCheck AI."
        badge={<Badge variant="neutral">Dev Environment</Badge>}
      />

      <Tabs defaultValue="tokens">
        <TabsList>
          <TabsTrigger value="tokens" icon={<Palette className="size-4" />}>
            Color Tokens
          </TabsTrigger>
          <TabsTrigger value="typography" icon={<FileText className="size-4" />}>
            Typography Scale
          </TabsTrigger>
          <TabsTrigger value="buttons" icon={<Component className="size-4" />}>
            Buttons & Hierarchy
          </TabsTrigger>
          <TabsTrigger value="forms" icon={<CheckCircle2 className="size-4" />}>
            Form Controls
          </TabsTrigger>
          <TabsTrigger value="feedback" icon={<AlertTriangle className="size-4" />}>
            Feedback & Modals
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: Color Tokens */}
        <TabsContent value="tokens" className="mt-4">
          <Card className="border-[#E2E8F0]">
            <CardHeader>
              <CardTitle className="text-[#0F172A]">Sovereign Sapphire & Obsidian Slate Tokens</CardTitle>
              <CardDescription className="text-[#475569]">
                Authoritative government enterprise palette (#F8FAFC canvas, #F1F5F9 sidebar) with Sovereign Sapphire (#1D4ED8 / #2563EB) brand primary.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <div>
                <SectionHeader title="Base Surfaces & Typography" />
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="p-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-[#0F172A] flex flex-col justify-between h-20">
                    <span className="text-xs font-bold">App Canvas</span>
                    <span className="text-[10px] font-mono text-[#475569]">#F8FAFC</span>
                  </div>
                  <div className="p-3 rounded-lg border border-[#E2E8F0] bg-[#F1F5F9] text-[#0F172A] flex flex-col justify-between h-20">
                    <span className="text-xs font-bold">Sidebar Surface</span>
                    <span className="text-[10px] font-mono text-[#475569]">#F1F5F9</span>
                  </div>
                  <div className="p-3 rounded-lg border border-[#E2E8F0] bg-white text-[#0F172A] flex flex-col justify-between h-20">
                    <span className="text-xs font-bold">Card Surface</span>
                    <span className="text-[10px] font-mono text-[#94A3B8]">#FFFFFF</span>
                  </div>
                  <div className="p-3 rounded-lg border border-[#1D4ED8] bg-[#1D4ED8] text-white flex flex-col justify-between h-20">
                    <span className="text-xs font-bold">Sovereign Sapphire</span>
                    <span className="text-[10px] font-mono opacity-80">#1D4ED8</span>
                  </div>
                  <div className="p-3 rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] text-[#1D4ED8] flex flex-col justify-between h-20">
                    <span className="text-xs font-bold">Sapphire Ice</span>
                    <span className="text-[10px] font-mono">#EFF6FF</span>
                  </div>
                </div>
              </div>

              <div>
                <SectionHeader title="Semantic Compliance Colors" />
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                  <div className="p-3 rounded-lg border border-[#86EFAC] bg-[#DCFCE7] text-[#166534] flex flex-col justify-between h-20">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="size-3.5 text-[#166534]" />
                      <span className="text-xs font-bold">PASS</span>
                    </div>
                    <span className="text-[10px] font-mono">#166534</span>
                  </div>

                  <div className="p-3 rounded-lg border border-[#FCD34D] bg-[#FEF3C7] text-[#92400E] flex flex-col justify-between h-20">
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="size-3.5 text-[#92400E]" />
                      <span className="text-xs font-bold">MANUAL REVIEW</span>
                    </div>
                    <span className="text-[10px] font-mono">#92400E</span>
                  </div>

                  <div className="p-3 rounded-lg border border-[#FCA5A5] bg-[#FEE2E2] text-[#991B1B] flex flex-col justify-between h-20">
                    <div className="flex items-center gap-1.5">
                      <XCircle className="size-3.5 text-[#991B1B]" />
                      <span className="text-xs font-bold">NON-COMPLIANCE</span>
                    </div>
                    <span className="text-[10px] font-mono">#991B1B</span>
                  </div>

                  <div className="p-3 rounded-lg border border-[#7DD3FC] bg-[#E0F2FE] text-[#0369A1] flex flex-col justify-between h-20">
                    <div className="flex items-center gap-1.5">
                      <Clock className="size-3.5 text-[#0369A1]" />
                      <span className="text-xs font-bold">PROCESSING</span>
                    </div>
                    <span className="text-[10px] font-mono">#0369A1</span>
                  </div>

                  <div className="p-3 rounded-lg border border-[#CBD5E1] bg-[#F1F5F9] text-[#475569] flex flex-col justify-between h-20">
                    <div className="flex items-center gap-1.5">
                      <FileText className="size-3.5 text-[#475569]" />
                      <span className="text-xs font-bold">DRAFT</span>
                    </div>
                    <span className="text-[10px] font-mono">#475569</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: Typography */}
        <TabsContent value="typography" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Typography Scale</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 divide-y divide-[#E2E8F0]">
              <div className="pt-2 flex items-center justify-between">
                <span className="text-xs text-[#94A3B8] font-mono">Page Title (28–32px)</span>
                <span className="text-2xl font-bold tracking-tight text-[#0F172A]">Dashboard</span>
              </div>

              <div className="pt-3 flex items-center justify-between">
                <span className="text-xs text-[#94A3B8] font-mono">Section Heading (18–20px)</span>
                <span className="text-base font-semibold tracking-tight text-[#0F172A]">Statutory Declarations</span>
              </div>

              <div className="pt-3 flex items-center justify-between">
                <span className="text-xs text-[#94A3B8] font-mono">Body (14–16px)</span>
                <span className="text-xs text-[#475569] max-w-md">Every package shall bear thereon the name and address of manufacturer.</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: Buttons */}
        <TabsContent value="buttons" className="mt-4">
          <Card className="border-[#E2E8F0]">
            <CardHeader>
              <CardTitle className="text-[#0F172A]">Buttons & Hierarchy</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary">Sovereign Sapphire Primary</Button>
                <Button variant="secondary">Secondary Neutral</Button>
                <Button variant="tertiary">Tertiary Ghost</Button>
                <Button variant="destructive">Destructive Red</Button>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary" size="sm">Small Action</Button>
                <Button variant="primary" size="md">Medium Action</Button>
                <Button variant="primary" isLoading>Loading State</Button>
                <Button variant="secondary" disabled>Disabled</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: Forms */}
        <TabsContent value="forms" className="mt-4">
          <Card className="border-[#E2E8F0]">
            <CardHeader>
              <CardTitle className="text-[#0F172A]">Form Controls</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input label="Commodity Name" placeholder="e.g. Edible Oil" hint="Enter standard category" required />
              <Select
                label="Rule Category"
                options={[
                  { value: "schedule-2", label: "Schedule II - General Declarations" },
                  { value: "rule-6", label: "Rule 6 - Principal Display Panel" },
                ]}
              />
              <Textarea label="Remarks" placeholder="Add official inspection notes..." rows={3} className="md:col-span-2" />
              <Checkbox label="Verify Manufacturer Address" checked={checkboxState} onChange={(e) => setCheckboxState(e.target.checked)} />
              <Switch label="Enable Audit Logging" checked={switchState} onChange={(val) => setSwitchState(val)} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 5: Feedback */}
        <TabsContent value="feedback" className="mt-4">
          <div className="flex flex-col gap-6">
            <Alert type="info" title="System Status: Operational">All rule engines active.</Alert>
            <Alert type="success" title="Inspection Passed">Statutory declarations verified.</Alert>
            <Alert type="warning" title="Manual Review Recommended">Font size needs check.</Alert>
            <Alert type="error" title="Critical Non-Compliance">MRP missing tax declaration.</Alert>
            <Button variant="secondary" size="sm" onClick={() => setIsDialogOpen(true)} className="self-start">
              Test Dialog Modal
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog isOpen={isDialogOpen} onClose={() => setIsDialogOpen(false)} title="Test Modal Dialog">
        <p className="text-xs text-[#0F172A]">Accessible dialog overlay demo.</p>
      </Dialog>
    </AppShell>
  );
}
