"""
Legal Metrology (Packaged Commodities) Rules, 2011 - Compliance Engine.

Deterministic validation module implementing Rule 6, Rule 26, and Unit Sale Price (USP)
statutory amendments using Pydantic v2 and Python standard libraries (re, datetime, typing).
"""

from __future__ import annotations

import re
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple
from pydantic import BaseModel, ConfigDict, Field


# =====================================================================
# Statutory Constants & Metric Definitions (Rule 6(1)(c), Rule 6(11))
# =====================================================================

STATUTORY_METRIC_UNITS: frozenset[str] = frozenset({
    "mg", "g", "kg",
    "ml", "l", "kl",
    "m", "cm", "mm",
    "n", "u",
})

WEIGHT_UNITS: frozenset[str] = frozenset({"mg", "g", "kg"})
VOLUME_UNITS: frozenset[str] = frozenset({"ml", "l", "kl"})
COUNT_UNITS: frozenset[str] = frozenset({"n", "u", "piece", "pieces", "pc", "pcs", "item", "items"})
LENGTH_UNITS: frozenset[str] = frozenset({"m", "cm", "mm"})

# Statutory regex for consumer helpline under Rule 6(2)
# Must contain at least a valid telephone number regex (r'(\+91|0)?[6-9]\d{9}|1800\d{6,7}')
# OR a valid email regex (r'[\w\.-]+@[\w\.-]+\.\w+')
REGEX_PHONE: re.Pattern = re.compile(r"(\+91|0)?[6-9]\d{9}|1800\d{6,7}")
REGEX_EMAIL: re.Pattern = re.compile(r"[\w\.-]+@[\w\.-]+\.\w+")

# Statutory regex for retail price wording under Rule 6(1)(da)
# Presence of 'incl. of all taxes' or 'inclusive of all taxes'
REGEX_INCL_TAXES: re.Pattern = re.compile(
    r"incl(?:usive)?\.?\s*(?:of)?\s*all\s*taxes",
    re.IGNORECASE,
)

# Common Indian label date formats under Rule 6(1)(d)
# MM/YYYY, MM/YY, MMM YYYY, or DD/MM/YYYY
DATE_PATTERNS: List[Tuple[re.Pattern, str]] = [
    # MM/YYYY or MM-YYYY
    (re.compile(r"^(0?[1-9]|1[0-2])[\/\-](19|20)\d{2}$"), "%m/%Y"),
    # MM/YY or MM-YY
    (re.compile(r"^(0?[1-9]|1[0-2])[\/\-]\d{2}$"), "%m/%y"),
    # DD/MM/YYYY or DD-MM-YYYY
    (re.compile(r"^(0?[1-9]|[12]\d|3[01])[\/\-](0?[1-9]|1[0-2])[\/\-](19|20)\d{2}$"), "%d/%m/%Y"),
    # MMM YYYY or MMM-YYYY (e.g., Aug 2026, AUG 2026, August 2026)
    (re.compile(
        r"^(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|"
        r"Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)"
        r"[\s\/\-]+(19|20)\d{2}$",
        re.IGNORECASE,
    ), "%b %Y"),
]


# =====================================================================
# 1. Data Schema (CommodityLabel)
# =====================================================================

class CommodityLabel(BaseModel):
    """
    Structured model representing extracted declarations from packaged commodities.
    All fields are optional to support partial or OCR-derived inputs.
    """
    model_config = ConfigDict(
        extra="ignore",
        str_strip_whitespace=True,
    )

    product_name: Optional[str] = Field(
        default=None,
        description="Common or generic name of commodity [Rule 6(1)(b)]",
    )
    brand_name: Optional[str] = Field(
        default=None,
        description="Brand / trademark name of commodity",
    )
    manufacturer_details: Optional[str] = Field(
        default=None,
        description="Name and complete address of manufacturer/packer/importer [Rule 6(1)(a)]",
    )
    country_of_origin: Optional[str] = Field(
        default=None,
        description="Country of origin for imported/manufactured goods [Rule 6(1)(aa)]",
    )
    mrp: Optional[float] = Field(
        default=None,
        description="Total maximum retail price in INR inclusive of all taxes [Rule 6(1)(da)]",
    )
    mrp_raw_text: Optional[str] = Field(
        default=None,
        description="Raw OCR price string e.g. 'MRP Rs. 50.00 incl. of all taxes'",
    )
    net_quantity_value: Optional[float] = Field(
        default=None,
        description="Net quantity magnitude [Rule 6(1)(c)]",
    )
    net_quantity_unit: Optional[str] = Field(
        default=None,
        description="Net quantity unit e.g. 'g', 'kg', 'ml', 'l', 'm', 'n', 'u' [Rule 6(1)(c)]",
    )
    declared_unit_sale_price: Optional[float] = Field(
        default=None,
        description="Declared Unit Sale Price (USP) printed on package [Rule 6(11)]",
    )
    declared_usp_unit: Optional[str] = Field(
        default=None,
        description="Declared USP unit e.g. 'per g', 'per kg', 'per ml', 'per l', 'per piece' [Rule 6(11)]",
    )
    mfg_date: Optional[str] = Field(
        default=None,
        description="Date of manufacture/packing e.g. '08/2026', 'AUG 2026' [Rule 6(1)(d)]",
    )
    expiry_or_best_before: Optional[str] = Field(
        default=None,
        description="Best before or expiry date statement",
    )
    consumer_care_name_or_designation: Optional[str] = Field(
        default=None,
        description="Name / designation of consumer helpline official [Rule 6(2)]",
    )
    consumer_care_phone: Optional[str] = Field(
        default=None,
        description="Consumer care helpline telephone number [Rule 6(2)]",
    )
    consumer_care_email: Optional[str] = Field(
        default=None,
        description="Consumer care email address [Rule 6(2)]",
    )
    consumer_care_address: Optional[str] = Field(
        default=None,
        description="Consumer care physical postal address [Rule 6(2)]",
    )


# =====================================================================
# Helper Utilities
# =====================================================================

def normalize_unit(unit_str: Optional[str]) -> str:
    """Normalize metric unit representation for comparison."""
    if not unit_str:
        return ""
    u = unit_str.strip().lower()
    # Normalize common abbreviations
    if u in {"gms", "gm", "gram", "grams"}:
        return "g"
    if u in {"kgs", "kilogram", "kilograms"}:
        return "kg"
    if u in {"millilitre", "millilitres", "milliliter", "milliliters"}:
        return "ml"
    if u in {"litre", "litres", "liter", "liters", "ltr", "ltrs"}:
        return "l"
    if u in {"pcs", "pc", "piece", "pieces", "units", "items", "item"}:
        return "piece"
    if u in {"mtr", "mtrs", "meter", "meters", "metre", "metres"}:
        return "m"
    return u


def normalize_usp_unit(usp_unit_str: Optional[str]) -> str:
    """Normalize declared unit sale price unit to statutory canonical format."""
    if not usp_unit_str:
        return ""
    s = usp_unit_str.strip().lower()
    # Remove leading currency prefixes and separators (e.g., '₹/g', 'Rs./kg', 'per g', '/g')
    s = re.sub(r"^(?:₹|rs\.?|inr)?\s*(?:per|\/)?\s*", "", s).strip()
    s = re.sub(r"[\.\s]+", "", s)

    if s in {"g", "gram", "grams", "gm", "gms"}:
        return "per g"
    if s in {"kg", "kilogram", "kilograms", "kgs"}:
        return "per kg"
    if s in {"ml", "millilitre", "millilitres", "milliliter", "milliliters"}:
        return "per ml"
    if s in {"l", "litre", "litres", "liter", "liters", "ltr", "ltrs"}:
        return "per l"
    if s in {"piece", "pieces", "pc", "pcs", "n", "u", "unit", "units", "item", "items"}:
        return "per piece"
    if s in {"m", "meter", "meters", "metre", "metres", "mtr", "mtrs"}:
        return "per m"
    return usp_unit_str.strip().lower()


# =====================================================================
# 2. Validation Engine (LegalMetrologyValidator)
# =====================================================================

class LegalMetrologyValidator:
    """
    Deterministic compliance engine for the Legal Metrology (Packaged Commodities) Rules, 2011.
    Evaluates mandatory packaging declarations and Unit Sale Price (USP) calculations.
    """

    USP_STATUTORY_TOLERANCE_PCT: float = 2.5  # 2.5% statutory rounding tolerance for paise

    @classmethod
    def check_rule_26_exemption(cls, label: CommodityLabel) -> Tuple[bool, Optional[str]]:
        """
        Rule 26 Exemption Check:
        If net_quantity_unit is in ['g', 'ml'] and net_quantity_value <= 10.0,
        tag the item as EXEMPTION_APPLIED_RULE_26 (small packages under 10g/10ml are
        exempt from certain declaration mandates).
        """
        unit = normalize_unit(label.net_quantity_unit)
        val = label.net_quantity_value

        if unit in {"g", "ml"} and val is not None and 0 < val <= 10.0:
            return True, "EXEMPTION_APPLIED_RULE_26"
        return False, None

    @classmethod
    def check_rule_6_1_a_and_aa(cls, label: CommodityLabel) -> List[Dict[str, str]]:
        """
        Rule 6(1)(a) & (aa) — Identity & Origin:
        - Flag non-compliance if manufacturer_details is missing or fewer than 5 characters.
        - Flag non-compliance if country_of_origin is missing or empty.
        """
        violations: List[Dict[str, str]] = []

        # Rule 6(1)(a): Manufacturer details
        mfr = (label.manufacturer_details or "").strip()
        if not mfr or len(mfr) < 5:
            violations.append({
                "clause": "Rule 6(1)(a)",
                "issue": "Manufacturer/packer/importer name and complete address is missing or fewer than 5 characters",
                "severity": "HIGH",
            })

        # Rule 6(1)(aa): Country of origin
        origin = (label.country_of_origin or "").strip()
        if not origin:
            violations.append({
                "clause": "Rule 6(1)(aa)",
                "issue": "Country of origin is missing or empty",
                "severity": "HIGH",
            })

        return violations

    @classmethod
    def check_rule_6_1_b(cls, label: CommodityLabel) -> List[Dict[str, str]]:
        """
        Rule 6(1)(b) — Commodity Identity:
        Flag non-compliance if product_name (common/generic name) is missing.
        """
        violations: List[Dict[str, str]] = []
        name = (label.product_name or "").strip()
        if not name:
            violations.append({
                "clause": "Rule 6(1)(b)",
                "issue": "Commodity common or generic product name is missing",
                "severity": "HIGH",
            })
        return violations

    @classmethod
    def check_rule_6_1_c(cls, label: CommodityLabel) -> List[Dict[str, str]]:
        """
        Rule 6(1)(c) — Standard Units of Weight/Measure:
        Net quantity units must strictly adhere to the metric system:
        ['mg', 'g', 'kg', 'ml', 'l', 'kl', 'm', 'cm', 'mm', 'n', 'u'].
        If non-standard units (e.g., 'lbs', 'oz', 'gross') are detected,
        flag a statutory violation under Rule 6(1)(c).
        """
        violations: List[Dict[str, str]] = []
        raw_unit = (label.net_quantity_unit or "").strip()
        norm_unit = normalize_unit(raw_unit)

        # Check unit validity
        if not raw_unit:
            violations.append({
                "clause": "Rule 6(1)(c)",
                "issue": "Net quantity unit declaration is missing",
                "severity": "HIGH",
            })
        elif norm_unit not in STATUTORY_METRIC_UNITS and norm_unit != "piece":
            violations.append({
                "clause": "Rule 6(1)(c)",
                "issue": (
                    f"Non-standard net quantity unit '{raw_unit}' detected. "
                    f"Must strictly adhere to metric units: {sorted(list(STATUTORY_METRIC_UNITS))}"
                ),
                "severity": "HIGH",
            })

        # Check quantity magnitude
        if label.net_quantity_value is None or label.net_quantity_value <= 0:
            violations.append({
                "clause": "Rule 6(1)(c)",
                "issue": f"Net quantity value must be a positive number greater than 0 (got: {label.net_quantity_value})",
                "severity": "HIGH",
            })

        return violations

    @classmethod
    def check_rule_6_1_d(cls, label: CommodityLabel) -> List[Dict[str, str]]:
        """
        Rule 6(1)(d) — Manufacturing Date Formatting:
        Validate that mfg_date matches common Indian label formats:
        - MM/YYYY or MM-YYYY
        - MM/YY or MM-YY
        - MMM YYYY or MMM-YYYY
        - DD/MM/YYYY or DD-MM-YYYY
        If date format is unrecognized or missing, flag under Rule 6(1)(d).
        """
        violations: List[Dict[str, str]] = []
        raw_date = (label.mfg_date or "").strip()

        if not raw_date:
            violations.append({
                "clause": "Rule 6(1)(d)",
                "issue": "Month and year of manufacture/packing is missing",
                "severity": "HIGH",
            })
            return violations

        # Clean common OCR label prefixes like 'MFG:', 'PKD:', 'PACKED ON'
        cleaned_date = re.sub(
            r"^(?:mfg|mfd|pkd|packed|pkg|date\s+of\s+mfg|date\s+of\s+packing)[\s\.:\-_]*",
            "",
            raw_date,
            flags=re.IGNORECASE,
        ).strip()

        matched = False
        for pattern, _ in DATE_PATTERNS:
            if pattern.match(cleaned_date):
                matched = True
                break

        if not matched:
            violations.append({
                "clause": "Rule 6(1)(d)",
                "issue": (
                    f"Manufacturing date format unrecognized ('{raw_date}'). "
                    "Must match common Indian label formats: MM/YYYY, MM/YY, MMM YYYY, or DD/MM/YYYY"
                ),
                "severity": "HIGH",
            })

        return violations

    @classmethod
    def check_rule_6_1_da(cls, label: CommodityLabel) -> Tuple[List[Dict[str, str]], List[Dict[str, str]]]:
        """
        Rule 6(1)(da) — Maximum Retail Price & Wording:
        - Check that mrp > 0.
        - In mrp_raw_text, use regex to check for the presence of 'incl. of all taxes' or 'inclusive of all taxes'.
          If absent, add a warning under Rule 6(1)(da).
        """
        violations: List[Dict[str, str]] = []
        warnings: List[Dict[str, str]] = []

        # Check MRP magnitude
        if label.mrp is None or label.mrp <= 0:
            violations.append({
                "clause": "Rule 6(1)(da)",
                "issue": f"Maximum Retail Price (MRP) must be a positive number greater than 0 (got: {label.mrp})",
                "severity": "HIGH",
            })

        # Check statutory wording in raw OCR text
        raw_mrp_text = (label.mrp_raw_text or "").strip()
        if not raw_mrp_text or not REGEX_INCL_TAXES.search(raw_mrp_text):
            warnings.append({
                "clause": "Rule 6(1)(da)",
                "issue": (
                    "MRP declaration is missing statutory wording 'incl. of all taxes' or 'inclusive of all taxes' "
                    f"in raw declaration ('{raw_mrp_text}')"
                ),
                "severity": "LOW",
            })

        return violations, warnings

    @classmethod
    def calculate_statutory_expected_usp(
        cls,
        mrp: float,
        net_qty: float,
        net_unit: str,
    ) -> Tuple[Optional[float], Optional[str]]:
        """
        Calculate expected statutory Unit Sale Price (USP) and required unit denomination under Rule 6(11):
        - If net weight < 1 kg, USP must be per gram (₹/g).
        - If net weight >= 1 kg, USP must be per kilogram (₹/kg).
        - If net volume < 1 L, USP must be per milliliter (₹/ml).
        - If net volume >= 1 L, USP must be per liter (₹/L).
        - If measured by number/units (n, u), USP must be per piece/unit.
        - If measured by length (m, cm, mm), USP must be per meter.
        """
        norm_unit = normalize_unit(net_unit)
        if mrp <= 0 or net_qty <= 0:
            return None, None

        # 1. Weight commodities
        if norm_unit in WEIGHT_UNITS:
            if norm_unit == "mg":
                total_kg = net_qty / 1_000_000.0
                total_g = net_qty / 1000.0
            elif norm_unit == "g":
                total_kg = net_qty / 1000.0
                total_g = net_qty
            else:  # kg
                total_kg = net_qty
                total_g = net_qty * 1000.0

            if total_kg < 1.0:
                expected_usp = mrp / total_g
                expected_unit = "per g"
            else:
                expected_usp = mrp / total_kg
                expected_unit = "per kg"
            return expected_usp, expected_unit

        # 2. Volume commodities
        if norm_unit in VOLUME_UNITS:
            if norm_unit == "ml":
                total_l = net_qty / 1000.0
                total_ml = net_qty
            elif norm_unit == "l":
                total_l = net_qty
                total_ml = net_qty * 1000.0
            else:  # kl
                total_l = net_qty * 1000.0
                total_ml = net_qty * 1_000_000.0

            if total_l < 1.0:
                expected_usp = mrp / total_ml
                expected_unit = "per ml"
            else:
                expected_usp = mrp / total_l
                expected_unit = "per l"
            return expected_usp, expected_unit

        # 3. Count commodities (n, u, piece)
        if norm_unit in COUNT_UNITS or norm_unit in {"n", "u"}:
            expected_usp = mrp / net_qty
            expected_unit = "per piece"
            return expected_usp, expected_unit

        # 4. Length commodities (m, cm, mm)
        if norm_unit in LENGTH_UNITS:
            if norm_unit == "m":
                total_m = net_qty
            elif norm_unit == "cm":
                total_m = net_qty / 100.0
            else:  # mm
                total_m = net_qty / 1000.0
            expected_usp = mrp / total_m
            expected_unit = "per m"
            return expected_usp, expected_unit

        # Fallback for other standard units
        expected_usp = mrp / net_qty
        expected_unit = f"per {norm_unit}"
        return expected_usp, expected_unit

    @classmethod
    def check_rule_6_11_usp(
        cls,
        label: CommodityLabel,
        is_exempt: bool,
    ) -> Tuple[List[Dict[str, str]], List[Dict[str, str]], Dict[str, Any]]:
        """
        Rule 6(11) — Unit Sale Price (USP) Statutory Calculation:
        - If net weight < 1 kg, USP must be calculated and displayed per gram (₹/g).
        - If net weight >= 1 kg, USP must be calculated and displayed per kilogram (₹/kg).
        - If net volume < 1 L, USP must be per milliliter (₹/ml).
        - If net volume >= 1 L, USP must be per liter (₹/L).
        - Calculate mathematical expected unit price.
        - If declared_unit_sale_price is provided, verify whether it matches calculated unit price
          within a 2.5% tolerance (to account for statutory fractional paise rounding). Flag violation if mismatched.
        """
        violations: List[Dict[str, str]] = []
        warnings: List[Dict[str, str]] = []

        mrp = label.mrp
        net_val = label.net_quantity_value
        net_unit = label.net_quantity_unit
        declared_usp = label.declared_unit_sale_price
        declared_unit = label.declared_usp_unit

        expected_usp: Optional[float] = None
        expected_unit: Optional[str] = None
        delta: Optional[float] = None
        delta_pct: Optional[float] = None
        is_within_tol: Optional[bool] = None

        can_calculate = (
            mrp is not None and mrp > 0 and
            net_val is not None and net_val > 0 and
            net_unit is not None
        )

        if can_calculate:
            assert mrp is not None and net_val is not None and net_unit is not None
            expected_usp, expected_unit = cls.calculate_statutory_expected_usp(mrp, net_val, net_unit)

        if expected_usp is not None and declared_usp is not None:
            delta = abs(declared_usp - expected_usp)
            delta_pct = (delta / expected_usp) * 100.0 if expected_usp > 0 else 0.0
            is_within_tol = delta_pct <= cls.USP_STATUTORY_TOLERANCE_PCT

            # Mathematical tolerance check (2.5%)
            if not is_within_tol:
                violations.append({
                    "clause": "Rule 6(11)",
                    "issue": (
                        f"Unit Sale Price mismatch: declared ₹{declared_usp:.4f}/{declared_unit or expected_unit} "
                        f"differs from expected ₹{expected_usp:.4f}/{expected_unit} by {delta_pct:.2f}% "
                        f"(exceeds {cls.USP_STATUTORY_TOLERANCE_PCT}% statutory rounding tolerance)"
                    ),
                    "severity": "HIGH",
                })

            # Statutory unit denomination check
            if declared_unit and expected_unit:
                norm_declared_usp_unit = normalize_usp_unit(declared_unit)
                if norm_declared_usp_unit != expected_unit:
                    violations.append({
                        "clause": "Rule 6(11)",
                        "issue": (
                            f"Statutory USP unit mismatch: package net quantity ({net_val} {net_unit}) requires "
                            f"USP denomination '{expected_unit}', but declared as '{declared_unit}'"
                        ),
                        "severity": "HIGH",
                    })

        elif declared_usp is None:
            # USP declaration is mandatory on packages unless exempt under Rule 26
            if not is_exempt:
                warnings.append({
                    "clause": "Rule 6(11)",
                    "issue": "Declared Unit Sale Price (USP) is missing; mandatory under Rule 6(11) unless exempted",
                    "severity": "LOW",
                })

        # Mathematical audit breakdown matching Section 3 specifications
        math_audit: Dict[str, Any] = {
            "mrp": mrp,
            "net_qty": net_val,
            "net_qty_unit": net_unit,
            "expected_usp": round(expected_usp, 4) if expected_usp is not None else None,
            "declared_usp": declared_usp,
            "expected_usp_unit": expected_unit,
            "declared_usp_unit": declared_unit,
            "delta": round(delta, 4) if delta is not None else None,
            "delta_percentage": round(delta_pct, 2) if delta_pct is not None else None,
            "is_within_tolerance": is_within_tol,
        }

        return violations, warnings, math_audit

    @classmethod
    def check_rule_6_2_consumer_care(
        cls,
        label: CommodityLabel,
        is_exempt: bool = False,
    ) -> List[Dict[str, str]]:
        r"""
        Rule 6(2) — Consumer Care Completeness:
        Must contain at least a valid telephone number regex (r'(\+91|0)?[6-9]\d{9}|1800\d{6,7}')
        OR a valid email regex (r'[\w\.-]+@[\w\.-]+\.\w+').
        If both are missing, flag non-compliance under Rule 6(2).
        """
        violations: List[Dict[str, str]] = []

        has_valid_phone = False
        has_valid_email = False

        # Validate telephone
        if label.consumer_care_phone:
            phone_cleaned = re.sub(r"[\s\-\(\)]", "", label.consumer_care_phone.strip())
            if REGEX_PHONE.search(phone_cleaned):
                has_valid_phone = True

        # Validate email
        if label.consumer_care_email:
            email_cleaned = label.consumer_care_email.strip()
            if REGEX_EMAIL.search(email_cleaned):
                has_valid_email = True

        # Fallback inspection on consumer care address block if fields were bundled
        if not has_valid_phone and label.consumer_care_address:
            addr_clean = re.sub(r"[\s\-\(\)]", "", label.consumer_care_address)
            if REGEX_PHONE.search(addr_clean):
                has_valid_phone = True
            if REGEX_EMAIL.search(label.consumer_care_address):
                has_valid_email = True

        if not has_valid_phone and not has_valid_email:
            violations.append({
                "clause": "Rule 6(2)",
                "issue": (
                    "Consumer care helpline missing or non-compliant: must contain at least a valid telephone "
                    "number (matching r'(\\+91|0)?[6-9]\\d{9}|1800\\d{6,7}') OR a valid email address "
                    "(matching r'[\\w\\.-]+@[\\w\\.-]+\\.\\w+')"
                ),
                "severity": "HIGH",
            })

        return violations

    @classmethod
    def validate(cls, label: CommodityLabel | Dict[str, Any]) -> Dict[str, Any]:
        """
        Deterministically validate packaged commodity data against Rule 6 and Rule 26
        of the Legal Metrology (Packaged Commodities) Rules, 2011.

        Returns:
            Dict containing:
                overall_status: 'COMPLIANT', 'POTENTIAL NON-COMPLIANCE', or 'MANUAL REVIEW'
                total_violations: int
                violations: list of dicts [{ "clause": ..., "issue": ..., "severity": ... }]
                warnings: list of dicts [{ "clause": ..., "issue": ..., "severity": ... }]
                math_audit: breakdown showing { "mrp": ..., "net_qty": ..., "expected_usp": ..., "declared_usp": ..., "delta": ... }
        """
        # Ingest CommodityLabel or dictionary
        if isinstance(label, dict):
            label_obj = CommodityLabel(**label)
        elif isinstance(label, CommodityLabel):
            label_obj = label
        else:
            raise TypeError(f"Expected CommodityLabel or dict, got {type(label).__name__}")

        violations: List[Dict[str, str]] = []
        warnings: List[Dict[str, str]] = []

        # 1. Rule 26 Exemption Check
        is_exempt, exemption_tag = cls.check_rule_26_exemption(label_obj)

        # 2. Rule 6(1)(a) & (aa) — Identity & Origin
        violations.extend(cls.check_rule_6_1_a_and_aa(label_obj))

        # 3. Rule 6(1)(b) — Commodity Identity
        violations.extend(cls.check_rule_6_1_b(label_obj))

        # 4. Rule 6(1)(c) — Standard Units of Weight/Measure
        violations.extend(cls.check_rule_6_1_c(label_obj))

        # 5. Rule 6(1)(d) — Manufacturing Date Formatting
        violations.extend(cls.check_rule_6_1_d(label_obj))

        # 6. Rule 6(1)(da) — Maximum Retail Price & Wording
        da_violations, da_warnings = cls.check_rule_6_1_da(label_obj)
        violations.extend(da_violations)
        warnings.extend(da_warnings)

        # 7. Rule 6(11) — Unit Sale Price (USP) Statutory Calculation
        usp_violations, usp_warnings, math_audit = cls.check_rule_6_11_usp(label_obj, is_exempt)
        violations.extend(usp_violations)
        warnings.extend(usp_warnings)

        # 8. Rule 6(2) — Consumer Care Completeness
        violations.extend(cls.check_rule_6_2_consumer_care(label_obj, is_exempt))

        # Determine overall status
        total_violations = len(violations)
        if total_violations > 0:
            overall_status = "POTENTIAL NON-COMPLIANCE"
        elif len(warnings) > 0:
            overall_status = "MANUAL REVIEW"
        else:
            overall_status = "COMPLIANT"

        return {
            "overall_status": overall_status,
            "total_violations": total_violations,
            "violations": violations,
            "warnings": warnings,
            "math_audit": math_audit,
            "exemption": exemption_tag,
            "exemptions": [exemption_tag] if exemption_tag else [],
            "applied_exemptions": [exemption_tag] if exemption_tag else [],
        }


# =====================================================================
# 3. Demonstration & Built-in Test Cases
# =====================================================================

if __name__ == "__main__":
    import json

    print("=" * 80)
    print("LEGAL METROLOGY (PACKAGED COMMODITIES) RULES, 2011 - VALIDATION SUITE")
    print("=" * 80)

    validator = LegalMetrologyValidator()

    # -----------------------------------------------------------------
    # Test Case 1: Fully Compliant FMCG Product
    # -----------------------------------------------------------------
    print("\n--- TEST CASE 1: Fully Compliant FMCG Product ---")
    compliant_product = CommodityLabel(
        product_name="Tata Tea Gold Premium Black Tea",
        brand_name="Tata Tea",
        manufacturer_details="Tata Consumer Products Limited, 1 Bishop Lefroy Road, Kolkata, West Bengal - 700020",
        country_of_origin="India",
        mrp=310.0,
        mrp_raw_text="MRP Rs. 310.00 incl. of all taxes",
        net_quantity_value=500.0,
        net_quantity_unit="g",
        # Net weight 500g < 1kg -> statutory USP unit: per g. Expected USP = 310 / 500 = 0.62 per g.
        declared_unit_sale_price=0.62,
        declared_usp_unit="per g",
        mfg_date="08/2026",
        expiry_or_best_before="12 months from packing",
        consumer_care_name_or_designation="Customer Care Executive",
        consumer_care_phone="+919876543210",
        consumer_care_email="care@tataconsumer.com",
        consumer_care_address="Consumer Care Cell, Tata Consumer Products Ltd, Bengaluru - 560001",
    )

    result_1 = validator.validate(compliant_product)
    print(json.dumps(result_1, indent=2))
    assert result_1["overall_status"] == "COMPLIANT", f"Expected COMPLIANT, got {result_1['overall_status']}"
    assert result_1["total_violations"] == 0, f"Expected 0 violations, got {result_1['total_violations']}"
    print(">>> Test Case 1 PASSED: Product is 100% compliant with Rule 6.")

    # -----------------------------------------------------------------
    # Test Case 2: Product Violating Rule 6(11) (USP mismatch) and Rule 6(1)(aa) (missing origin)
    # -----------------------------------------------------------------
    print("\n--- TEST CASE 2: Product Violating Rule 6(11) & Rule 6(1)(aa) ---")
    violating_product = CommodityLabel(
        product_name="Britannia Bourbon Chocolate Cream Biscuits",
        brand_name="Britannia",
        manufacturer_details="Britannia Industries Limited, 5/1A Hungerford Street, Kolkata - 700017",
        country_of_origin="",  # VIOLATION: Missing country of origin under Rule 6(1)(aa)
        mrp=50.0,
        mrp_raw_text="MRP Rs. 50.00 incl. of all taxes",
        net_quantity_value=200.0,
        net_quantity_unit="g",
        # Expected USP = 50.0 / 200.0 = 0.25 per g. Declared USP 0.40 differs by 60% (> 2.5% tolerance)!
        declared_unit_sale_price=0.40,  # VIOLATION: Mismatched USP under Rule 6(11)
        declared_usp_unit="per g",
        mfg_date="08/2026",
        expiry_or_best_before="Best before 6 months from packaging",
        consumer_care_name_or_designation="Consumer Care Manager",
        consumer_care_phone="18004254449",
        consumer_care_email="feedback@britindia.com",
        consumer_care_address="Britannia Consumer Care, Bangalore - 560047",
    )

    result_2 = validator.validate(violating_product)
    print(json.dumps(result_2, indent=2))
    assert result_2["overall_status"] == "POTENTIAL NON-COMPLIANCE", f"Expected POTENTIAL NON-COMPLIANCE, got {result_2['overall_status']}"
    assert result_2["total_violations"] == 2, f"Expected 2 violations, got {result_2['total_violations']}"
    violated_clauses = [v["clause"] for v in result_2["violations"]]
    assert "Rule 6(1)(aa)" in violated_clauses, "Expected Rule 6(1)(aa) violation for missing country of origin"
    assert "Rule 6(11)" in violated_clauses, "Expected Rule 6(11) violation for USP mathematical mismatch"
    print(">>> Test Case 2 PASSED: Correctly caught Rule 6(1)(aa) and Rule 6(11) violations.")

    # -----------------------------------------------------------------
    # Test Case 3: Small Package under Rule 26 Exemption (<= 10g)
    # -----------------------------------------------------------------
    print("\n--- TEST CASE 3: Small Package Qualified for Rule 26 Exemption (<= 10g) ---")
    small_package = CommodityLabel(
        product_name="Mouth Freshener Elaichi",
        brand_name="FreshBite",
        manufacturer_details="Fragrant Spices Pvt Ltd, Industrial Area, Sector 5, Haridwar - 249403",
        country_of_origin="India",
        mrp=10.0,
        mrp_raw_text="MRP Rs. 10.00 incl. of all taxes",
        net_quantity_value=5.0,  # <= 10g, exempt under Rule 26
        net_quantity_unit="g",
        mfg_date="08/2026",
        consumer_care_phone="+919876543210",
    )

    result_3 = validator.validate(small_package)
    print(json.dumps(result_3, indent=2))
    assert result_3["exemption"] == "EXEMPTION_APPLIED_RULE_26", f"Expected EXEMPTION_APPLIED_RULE_26, got {result_3['exemption']}"
    print(">>> Test Case 3 PASSED: Correctly tagged as EXEMPTION_APPLIED_RULE_26.")

    print("\n" + "=" * 80)
    print("ALL TESTS COMPLETED SUCCESSFULLY!")
    print("=" * 80)
