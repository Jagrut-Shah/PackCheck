"""
Unit and integration tests for legal_metrology_engine.py
Validates compliance logic against Legal Metrology (Packaged Commodities) Rules, 2011.
"""

import unittest
from legal_metrology_engine import CommodityLabel, LegalMetrologyValidator


class TestLegalMetrologyEngine(unittest.TestCase):

    def setUp(self):
        self.validator = LegalMetrologyValidator()
        self.base_valid_data = {
            "product_name": "Premium Whole Wheat Atta",
            "brand_name": "FarmFresh",
            "manufacturer_details": "FarmFresh Agro Foods Pvt Ltd, Plot 42, GIDC, Ahmedabad, Gujarat - 382110",
            "country_of_origin": "India",
            "mrp": 250.0,
            "mrp_raw_text": "MRP Rs. 250.00 incl. of all taxes",
            "net_quantity_value": 5.0,
            "net_quantity_unit": "kg",
            "declared_unit_sale_price": 50.0,
            "declared_usp_unit": "per kg",
            "mfg_date": "08/2026",
            "consumer_care_phone": "+919876543210",
            "consumer_care_email": "support@farmfresh.in",
        }

    def test_fully_compliant_item(self):
        """Test a fully compliant 5kg packaged commodity."""
        label = CommodityLabel(**self.base_valid_data)
        res = self.validator.validate(label)

        self.assertEqual(res["overall_status"], "COMPLIANT")
        self.assertEqual(res["total_violations"], 0)
        self.assertEqual(len(res["violations"]), 0)
        self.assertEqual(len(res["warnings"]), 0)
        self.assertEqual(res["math_audit"]["expected_usp"], 50.0)
        self.assertEqual(res["math_audit"]["expected_usp_unit"], "per kg")
        self.assertEqual(res["math_audit"]["delta"], 0.0)
        self.assertTrue(res["math_audit"]["is_within_tolerance"])

    def test_rule_26_exemption(self):
        """Test packages <= 10g or <= 10ml receive EXEMPTION_APPLIED_RULE_26 tag."""
        # 5g package
        label_5g = CommodityLabel(
            product_name="Cardamom Seeds",
            manufacturer_details="Spice Co, Sector 12, Jaipur, Rajasthan",
            country_of_origin="India",
            mrp=10.0,
            mrp_raw_text="MRP Rs. 10 incl. of all taxes",
            net_quantity_value=5.0,
            net_quantity_unit="g",
            mfg_date="05/2026",
            consumer_care_phone="1800112233",
        )
        res_5g = self.validator.validate(label_5g)
        self.assertEqual(res_5g["exemption"], "EXEMPTION_APPLIED_RULE_26")
        self.assertIn("EXEMPTION_APPLIED_RULE_26", res_5g["exemptions"])

        # 10ml package
        label_10ml = CommodityLabel(
            product_name="Herbal Eye Drops",
            manufacturer_details="Ayur Pharma Ltd, Haridwar, Uttarakhand",
            country_of_origin="India",
            mrp=35.0,
            mrp_raw_text="MRP Rs. 35 inclusive of all taxes",
            net_quantity_value=10.0,
            net_quantity_unit="ml",
            mfg_date="01/2026",
            consumer_care_phone="9876543210",
        )
        res_10ml = self.validator.validate(label_10ml)
        self.assertEqual(res_10ml["exemption"], "EXEMPTION_APPLIED_RULE_26")

        # 15g package (not exempt)
        label_15g = CommodityLabel(
            product_name="Spice Mix",
            manufacturer_details="Spice Co, Sector 12, Jaipur, Rajasthan",
            country_of_origin="India",
            mrp=20.0,
            mrp_raw_text="MRP Rs. 20 incl. of all taxes",
            net_quantity_value=15.0,
            net_quantity_unit="g",
            mfg_date="05/2026",
            consumer_care_phone="1800112233",
        )
        res_15g = self.validator.validate(label_15g)
        self.assertIsNone(res_15g["exemption"])

    def test_rule_6_1_a_manufacturer_details(self):
        """Test Rule 6(1)(a) flags missing or short manufacturer details."""
        # Missing
        data = self.base_valid_data.copy()
        data["manufacturer_details"] = None
        res = self.validator.validate(CommodityLabel(**data))
        clauses = [v["clause"] for v in res["violations"]]
        self.assertIn("Rule 6(1)(a)", clauses)

        # Fewer than 5 chars
        data["manufacturer_details"] = "ABC"
        res = self.validator.validate(CommodityLabel(**data))
        clauses = [v["clause"] for v in res["violations"]]
        self.assertIn("Rule 6(1)(a)", clauses)

    def test_rule_6_1_aa_country_of_origin(self):
        """Test Rule 6(1)(aa) flags missing or empty country of origin."""
        data = self.base_valid_data.copy()
        data["country_of_origin"] = ""
        res = self.validator.validate(CommodityLabel(**data))
        clauses = [v["clause"] for v in res["violations"]]
        self.assertIn("Rule 6(1)(aa)", clauses)

    def test_rule_6_1_b_product_name(self):
        """Test Rule 6(1)(b) flags missing generic product name."""
        data = self.base_valid_data.copy()
        data["product_name"] = None
        res = self.validator.validate(CommodityLabel(**data))
        clauses = [v["clause"] for v in res["violations"]]
        self.assertIn("Rule 6(1)(b)", clauses)

    def test_rule_6_1_c_metric_units(self):
        """Test Rule 6(1)(c) enforces standard metric units and flags imperial units."""
        data = self.base_valid_data.copy()
        data["net_quantity_unit"] = "lbs"
        res = self.validator.validate(CommodityLabel(**data))
        clauses = [v["clause"] for v in res["violations"]]
        self.assertIn("Rule 6(1)(c)", clauses)

        # Missing net quantity value
        data["net_quantity_unit"] = "kg"
        data["net_quantity_value"] = -1.0
        res = self.validator.validate(CommodityLabel(**data))
        clauses = [v["clause"] for v in res["violations"]]
        self.assertIn("Rule 6(1)(c)", clauses)

    def test_rule_6_1_d_mfg_date_formats(self):
        """Test Rule 6(1)(d) date format matching."""
        valid_dates = ["08/2026", "08/26", "AUG 2026", "15/08/2026", "Jan 2025", "12-2025"]
        for dt in valid_dates:
            data = self.base_valid_data.copy()
            data["mfg_date"] = dt
            res = self.validator.validate(CommodityLabel(**data))
            clauses = [v["clause"] for v in res["violations"]]
            self.assertNotIn("Rule 6(1)(d)", clauses, f"Failed for valid date format: {dt}")

        invalid_dates = ["2026/08", "August-26", "invalid", ""]
        for dt in invalid_dates:
            data = self.base_valid_data.copy()
            data["mfg_date"] = dt
            res = self.validator.validate(CommodityLabel(**data))
            clauses = [v["clause"] for v in res["violations"]]
            self.assertIn("Rule 6(1)(d)", clauses, f"Failed to flag invalid date format: {dt}")

    def test_rule_6_1_da_mrp_and_raw_text(self):
        """Test Rule 6(1)(da) MRP > 0 violation and 'incl. of all taxes' warning."""
        # Non-positive MRP
        data = self.base_valid_data.copy()
        data["mrp"] = 0.0
        res = self.validator.validate(CommodityLabel(**data))
        clauses = [v["clause"] for v in res["violations"]]
        self.assertIn("Rule 6(1)(da)", clauses)

        # Missing 'incl. of all taxes' in raw text
        data["mrp"] = 250.0
        data["mrp_raw_text"] = "Rs. 250"
        res = self.validator.validate(CommodityLabel(**data))
        warn_clauses = [w["clause"] for w in res["warnings"]]
        self.assertIn("Rule 6(1)(da)", warn_clauses)
        self.assertEqual(res["overall_status"], "MANUAL REVIEW")

    def test_rule_6_11_usp_calculation_weight(self):
        """Test Rule 6(11) USP per g (< 1kg) and per kg (>= 1kg)."""
        # Case 1: Net weight < 1 kg (e.g. 500g, MRP 100) -> must be per g
        label_500g = CommodityLabel(
            product_name="Salt",
            manufacturer_details="Salt Works Ltd, Gandhidham, Gujarat",
            country_of_origin="India",
            mrp=100.0,
            mrp_raw_text="MRP Rs. 100.00 incl. of all taxes",
            net_quantity_value=500.0,
            net_quantity_unit="g",
            declared_unit_sale_price=0.20,
            declared_usp_unit="per g",
            mfg_date="08/2026",
            consumer_care_phone="1800112233",
        )
        res_500g = self.validator.validate(label_500g)
        self.assertEqual(res_500g["math_audit"]["expected_usp_unit"], "per g")
        self.assertEqual(res_500g["math_audit"]["expected_usp"], 0.20)
        self.assertEqual(res_500g["total_violations"], 0)

        # Case 2: Net weight >= 1 kg (e.g. 2kg, MRP 200) -> must be per kg
        label_2kg = CommodityLabel(
            product_name="Rice",
            manufacturer_details="Rice Mills, Karnal, Haryana",
            country_of_origin="India",
            mrp=200.0,
            mrp_raw_text="MRP Rs. 200.00 incl. of all taxes",
            net_quantity_value=2.0,
            net_quantity_unit="kg",
            declared_unit_sale_price=100.0,
            declared_usp_unit="per kg",
            mfg_date="08/2026",
            consumer_care_phone="1800112233",
        )
        res_2kg = self.validator.validate(label_2kg)
        self.assertEqual(res_2kg["math_audit"]["expected_usp_unit"], "per kg")
        self.assertEqual(res_2kg["math_audit"]["expected_usp"], 100.0)
        self.assertEqual(res_2kg["total_violations"], 0)

    def test_rule_6_11_usp_calculation_volume(self):
        """Test Rule 6(11) USP per ml (< 1L) and per L (>= 1L)."""
        # Case 1: Net volume < 1 L (e.g. 200ml, MRP 50) -> must be per ml
        label_200ml = CommodityLabel(
            product_name="Fruit Juice",
            manufacturer_details="Beverages India, Pune, Maharashtra",
            country_of_origin="India",
            mrp=50.0,
            mrp_raw_text="MRP Rs. 50.00 incl. of all taxes",
            net_quantity_value=200.0,
            net_quantity_unit="ml",
            declared_unit_sale_price=0.25,
            declared_usp_unit="per ml",
            mfg_date="08/2026",
            consumer_care_phone="1800112233",
        )
        res_200ml = self.validator.validate(label_200ml)
        self.assertEqual(res_200ml["math_audit"]["expected_usp_unit"], "per ml")
        self.assertEqual(res_200ml["math_audit"]["expected_usp"], 0.25)
        self.assertEqual(res_200ml["total_violations"], 0)

        # Case 2: Net volume >= 1 L (e.g. 1.5L, MRP 150) -> must be per l
        label_1_5l = CommodityLabel(
            product_name="Mustard Oil",
            manufacturer_details="Oil Refineries Ltd, Alwar, Rajasthan",
            country_of_origin="India",
            mrp=150.0,
            mrp_raw_text="MRP Rs. 150.00 incl. of all taxes",
            net_quantity_value=1.5,
            net_quantity_unit="l",
            declared_unit_sale_price=100.0,
            declared_usp_unit="per l",
            mfg_date="08/2026",
            consumer_care_phone="1800112233",
        )
        res_1_5l = self.validator.validate(label_1_5l)
        self.assertEqual(res_1_5l["math_audit"]["expected_usp_unit"], "per l")
        self.assertEqual(res_1_5l["math_audit"]["expected_usp"], 100.0)
        self.assertEqual(res_1_5l["total_violations"], 0)

    def test_rule_6_11_usp_tolerance_threshold(self):
        """Test Rule 6(11) 2.5% tolerance behavior."""
        data = self.base_valid_data.copy()
        # Expected USP = 250 / 5 = 50.0 per kg
        # 2% deviation (within 2.5%): 51.0
        data["declared_unit_sale_price"] = 51.0
        res_within = self.validator.validate(CommodityLabel(**data))
        clauses = [v["clause"] for v in res_within["violations"]]
        self.assertNotIn("Rule 6(11)", clauses)
        self.assertTrue(res_within["math_audit"]["is_within_tolerance"])

        # 3% deviation (exceeds 2.5%): 51.5
        data["declared_unit_sale_price"] = 51.5
        res_exceeds = self.validator.validate(CommodityLabel(**data))
        clauses = [v["clause"] for v in res_exceeds["violations"]]
        self.assertIn("Rule 6(11)", clauses)
        self.assertFalse(res_exceeds["math_audit"]["is_within_tolerance"])

    def test_rule_6_2_consumer_care(self):
        """Test Rule 6(2) requires either phone or email regex match."""
        data = self.base_valid_data.copy()

        # Phone only: Pass
        data["consumer_care_email"] = None
        data["consumer_care_phone"] = "+919876543210"
        res = self.validator.validate(CommodityLabel(**data))
        clauses = [v["clause"] for v in res["violations"]]
        self.assertNotIn("Rule 6(2)", clauses)

        # Toll free phone: Pass
        data["consumer_care_phone"] = "18002001234"
        res = self.validator.validate(CommodityLabel(**data))
        clauses = [v["clause"] for v in res["violations"]]
        self.assertNotIn("Rule 6(2)", clauses)

        # Email only: Pass
        data["consumer_care_phone"] = None
        data["consumer_care_email"] = "care@farmfresh.in"
        res = self.validator.validate(CommodityLabel(**data))
        clauses = [v["clause"] for v in res["violations"]]
        self.assertNotIn("Rule 6(2)", clauses)

        # Both missing / invalid: Fail Rule 6(2)
        data["consumer_care_phone"] = "12345"  # invalid phone
        data["consumer_care_email"] = "invalid-email"
        res = self.validator.validate(CommodityLabel(**data))
        clauses = [v["clause"] for v in res["violations"]]
        self.assertIn("Rule 6(2)", clauses)


if __name__ == "__main__":
    unittest.main()
