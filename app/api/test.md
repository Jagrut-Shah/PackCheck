# 1. Test health check
curl http://localhost:3000/api/health

# 2. Upload image (use any image you have)
RESPONSE=$(curl -X POST http://localhost:3000/api/inspections \
  -F "file=@/path/to/image.jpg" \
  -F "product_type=Biscuits" \
  -F "inspector_id=inspector-001")
echo $RESPONSE

# Extract inspection_id from response and save it
INSPECTION_ID="your-uuid-from-response"

# 3. Store extracted fields
curl -X POST http://localhost:3000/api/inspections/$INSPECTION_ID/extracted-fields \
  -H "Content-Type: application/json" \
  -d '{
    "fields": [
      {"field_name": "MRP", "extracted_value": "₹99", "confidence_score": 0.95, "source": "LLM"},
      {"field_name": "Quantity", "extracted_value": "500g", "confidence_score": 0.87, "source": "LLM"}
    ]
  }'

# 4. Store corrections
curl -X POST http://localhost:3000/api/inspections/$INSPECTION_ID/corrections \
  -H "Content-Type: application/json" \
  -d '{"corrections": [{"field_name": "MRP", "original_value": "₹99", "corrected_value": "₹99"}]}'

# 5. Store compliance results
curl -X POST http://localhost:3000/api/inspections/$INSPECTION_ID/compliance-results \
  -H "Content-Type: application/json" \
  -d '{
    "status": "FAIL",
    "findings": [
      {"rule_id": "Rule-12", "rule_name": "Allergen", "violation_type": "MISSING", "severity": "HIGH", "message": "Missing allergen warning"}
    ]
  }'

# 6. Get history
curl "http://localhost:3000/api/inspections?limit=10&offset=0"

# 7. Get report data
curl "http://localhost:3000/api/inspections/$INSPECTION_ID/report-data"

# 8. Get analytics
curl "http://localhost:3000/api/analytics/violations?group_by=product_type"