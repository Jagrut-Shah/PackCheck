import json
from legal_metrology_engine import LegalMetrologyValidator, CommodityLabel

validator = LegalMetrologyValidator()

# Replace these values with what is physically printed on your item
my_item = CommodityLabel(
    product_name="Instant Noodles",
    brand_name="Maggi",
    manufacturer_details="Nestle India Limited, 100/101, World Trade Centre, Barakhamba Lane, New Delhi-110001",
    country_of_origin="India",
    mrp=14.00,
    mrp_raw_text="MRP Rs. 14.00 (inclusive of all taxes)",
    net_quantity_value=70.0,
    net_quantity_unit="g",
    declared_unit_sale_price=0.20,
    declared_usp_unit="per g",
    mfg_date="07/2026",
    consumer_care_phone="18001031947",
    consumer_care_email="wecare@in.nestle.com"
)

report = validator.validate(my_item.model_dump())
print(report)
print(json.dumps(report, indent=2))