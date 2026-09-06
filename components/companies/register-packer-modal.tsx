"use client";

import React, { useState, useEffect } from "react";
import { X, Building2, ShieldCheck, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { registerCompany, RegisteredPacker } from "@/lib/api/companies";
import { useToast } from "@/components/common/toast";

interface RegisterPackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (packer: RegisteredPacker) => void;
}

const INDIAN_STATES = [
  "National Capital Territory of Delhi",
  "Gujarat",
  "Maharashtra",
  "Uttarakhand",
  "Haryana",
  "Uttar Pradesh",
  "Karnataka",
  "Tamil Nadu",
  "West Bengal",
  "Punjab",
  "Rajasthan",
  "Madhya Pradesh",
  "Andhra Pradesh",
  "Telangana",
  "Kerala",
  "Bihar",
  "Odisha",
  "Assam",
  "Goa",
  "Himachal Pradesh",
  "Jammu & Kashmir",
];

export function RegisterPackerModal({
  isOpen,
  onClose,
  onSuccess,
}: RegisterPackerModalProps) {
  const toast = useToast();

  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [registeredOffice, setRegisteredOffice] = useState("");
  const [state, setState] = useState("National Capital Territory of Delhi");
  const [district, setDistrict] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [categoryText, setCategoryText] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "UNDER_REVIEW" | "SUSPENDED">("ACTIVE");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Reset form on open
  useEffect(() => {
    if (isOpen) {
      setName("");
      setBrand("");
      setRegistrationNumber("");
      setRegisteredOffice("");
      setState("National Capital Territory of Delhi");
      setDistrict("");
      setContactEmail("");
      setContactPhone("");
      setCategoryText("");
      setStatus("ACTIVE");
      setErrorMessage("");
    }
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    // Validate required fields
    if (!name.trim()) {
      setErrorMessage("Company / Pre-Packer Name is mandatory.");
      return;
    }
    if (!registrationNumber.trim()) {
      setErrorMessage("Rule 27 Registration Certificate Number is mandatory.");
      return;
    }
    if (!registeredOffice.trim()) {
      setErrorMessage("Registered Office Address is mandatory.");
      return;
    }
    if (!district.trim()) {
      setErrorMessage("District / Enforcement Zone is mandatory.");
      return;
    }

    setIsSubmitting(true);

    try {
      const categories = categoryText
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);

      const newPacker = await registerCompany({
        name: name.trim(),
        brand: brand.trim() || undefined,
        registrationNumber: registrationNumber.trim(),
        registeredOffice: registeredOffice.trim(),
        state: state.trim(),
        district: district.trim(),
        contactEmail: contactEmail.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        categories: categories.length > 0 ? categories : ["Packaged Commodity"],
        status,
      });

      toast.success(
        "Packer Registered",
        `'${newPacker.name}' has been entered into the Rule 27 Registry.`
      );

      onSuccess(newPacker);
      onClose();
    } catch (err: any) {
      console.error("Packer registration error:", err);
      setErrorMessage(
        err?.message ||
          "Failed to register packer. Please verify registration particulars."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateCertificateNumber = () => {
    const statePrefix =
      state.includes("Delhi") ? "DL" : state.substring(0, 2).toUpperCase();
    const brandPrefix = (brand || name)
      .replace(/[^a-zA-Z]/g, "")
      .substring(0, 3)
      .toUpperCase();
    const year = new Date().getFullYear();
    const random = Math.floor(1000 + Math.random() * 9000);
    setRegistrationNumber(`LMR-${statePrefix}-${brandPrefix || "REG"}-${year}-${random}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-xl border border-[#E2E8F0] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="register-packer-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] text-[#1D4ED8] flex items-center justify-center">
              <Building2 className="size-4" />
            </div>
            <div>
              <h2
                id="register-packer-title"
                className="text-sm font-bold text-[#0F172A]"
              >
                Register Manufacturer / Pre-Packer
              </h2>
              <p className="text-[11px] text-[#64748B]">
                Official registration entry under Rule 27, PCR 2011.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-[#64748B] hover:text-[#0F172A] hover:bg-[#E2E8F0] transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FEE2E2] text-[#DC2626] flex items-start gap-2">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Entity Name */}
            <div className="sm:col-span-2 space-y-1.5">
              <label className="font-semibold text-[#0F172A] flex items-center gap-1">
                <span>Company / Pre-Packer Name</span>
                <span className="text-[#DC2626]">*</span>
              </label>
              <Input
                placeholder="e.g. Britannia Industries Ltd"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-9 text-xs"
              />
            </div>

            {/* Brand Name */}
            <div className="space-y-1.5">
              <label className="font-semibold text-[#0F172A]">
                Brand / Trade Name
              </label>
              <Input
                placeholder="e.g. Britannia"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            {/* Rule 27 Registration Certificate */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-[#0F172A] flex items-center gap-1">
                  <span>Rule 27 Reg Certificate</span>
                  <span className="text-[#DC2626]">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleGenerateCertificateNumber}
                  className="text-[10px] text-[#1D4ED8] hover:underline font-medium cursor-pointer"
                >
                  Generate ID
                </button>
              </div>
              <Input
                placeholder="e.g. LMR-DL-2024-4912"
                value={registrationNumber}
                onChange={(e) => setRegistrationNumber(e.target.value)}
                required
                className="h-9 text-xs font-mono"
              />
            </div>

            {/* Registered Office Address */}
            <div className="sm:col-span-2 space-y-1.5">
              <label className="font-semibold text-[#0F172A] flex items-center gap-1">
                <span>Registered Office Address</span>
                <span className="text-[#DC2626]">*</span>
              </label>
              <Input
                placeholder="e.g. 5/1A Hungerford Street, Kolkata - 700017"
                value={registeredOffice}
                onChange={(e) => setRegisteredOffice(e.target.value)}
                required
                className="h-9 text-xs"
              />
            </div>

            {/* State / UT */}
            <div className="space-y-1.5">
              <label className="font-semibold text-[#0F172A] flex items-center gap-1">
                <span>State / Union Territory</span>
                <span className="text-[#DC2626]">*</span>
              </label>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-[#CBD5E1] bg-white text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                required
              >
                {INDIAN_STATES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            {/* District / Zone */}
            <div className="space-y-1.5">
              <label className="font-semibold text-[#0F172A] flex items-center gap-1">
                <span>District / Enforcement Zone</span>
                <span className="text-[#DC2626]">*</span>
              </label>
              <Input
                placeholder="e.g. South East Delhi"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                required
                className="h-9 text-xs"
              />
            </div>

            {/* Contact Email */}
            <div className="space-y-1.5">
              <label className="font-semibold text-[#0F172A]">
                Consumer Care Email
              </label>
              <Input
                type="email"
                placeholder="care@company.com"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            {/* Contact Phone */}
            <div className="space-y-1.5">
              <label className="font-semibold text-[#0F172A]">
                Consumer Care Phone
              </label>
              <Input
                placeholder="1800-XXX-XXXX"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            {/* Commodity Categories */}
            <div className="sm:col-span-2 space-y-1.5">
              <label className="font-semibold text-[#0F172A]">
                Packaged Commodity Categories (comma-separated)
              </label>
              <Input
                placeholder="e.g. Bakery & Biscuits, Dairy Products, Edible Oils"
                value={categoryText}
                onChange={(e) => setCategoryText(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            {/* License Status */}
            <div className="space-y-1.5">
              <label className="font-semibold text-[#0F172A]">
                License Standing
              </label>
              <select
                value={status}
                onChange={(e) =>
                  setStatus(
                    e.target.value as "ACTIVE" | "UNDER_REVIEW" | "SUSPENDED"
                  )
                }
                className="w-full h-9 px-3 rounded-lg border border-[#CBD5E1] bg-white text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              >
                <option value="ACTIVE">Active Legal Metrology License</option>
                <option value="UNDER_REVIEW">Under Enforcement Review</option>
                <option value="SUSPENDED">Suspended / Show-Cause Issued</option>
              </select>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#E2E8F0] mt-6">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting}
              leftIcon={
                isSubmitting ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <ShieldCheck className="size-3.5" />
                )
              }
            >
              {isSubmitting ? "Registering..." : "Issue Rule 27 Registration"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
