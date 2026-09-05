"use client";

import React, { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface FieldEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  fieldName: string;
  fieldLabel: string;
  currentValue: string;
  originalValue?: string;
  onSave: (newValue: string, reason: string) => void;
}

export const FieldEditModal: React.FC<FieldEditModalProps> = ({
  isOpen,
  onClose,
  fieldName,
  fieldLabel,
  currentValue,
  originalValue,
  onSave,
}) => {
  const [value, setValue] = useState(currentValue);
  const [reason, setReason] = useState("");

  useEffect(() => {
    setValue(currentValue);
    setReason("");
  }, [currentValue, isOpen]);

  const handleSave = () => {
    onSave(value, reason);
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Statutory Declaration: ${fieldLabel}`}
      description="Legal Metrology verification override. Corrected values are logged with inspector credentials."
      size="md"
    >
      <div className="space-y-4 text-xs">
        {/* Old Value Display */}
        <div className="space-y-1">
          <label className="font-semibold text-[#475569]">Previous / Machine-Extracted Value</label>
          <div className="p-2.5 rounded-md bg-[#F1F5F9] border border-[#E2E8F0] text-[#0F172A] font-mono text-[11px] select-all">
            {originalValue || currentValue || "(empty)"}
          </div>
        </div>

        {/* New Corrected Value Input */}
        <div className="space-y-1.5">
          <label className="font-semibold text-[#0F172A]">Corrected Statutory Value *</label>
          <Textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={3}
            className="text-xs"
            placeholder={`Enter corrected ${fieldLabel.toLowerCase()}`}
          />
        </div>

        {/* Optional Correction Reason */}
        <div className="space-y-1.5">
          <label className="font-semibold text-[#0F172A]">
            Correction Reason / Inspector Notes (Optional)
          </label>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Corrected blurred numeral from packaging label inspection"
            className="text-xs"
          />
        </div>

        <div className="p-3 rounded-lg bg-[#FEF3C7] border border-[#FCD34D] text-[#92400E] text-[11px] leading-relaxed">
          <strong>Statutory Notice:</strong> Overriding this field will re-evaluate corresponding Legal Metrology Rule 6 deterministic compliance checks and record an official verification audit stamp.
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-[#F1F5F9]">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleSave}>
            Apply Correction
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
