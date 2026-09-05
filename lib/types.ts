// Inspection Types
export interface Inspection {
  id: string
  inspector_id: string
  product_type: string
  image_url: string
  image_path: string
  status: 'PENDING' | 'REVIEWING' | 'PASS' | 'FAIL' | 'MANUAL_REVIEW'
  created_at: string
  updated_at: string
}

// Extracted Fields
export interface ExtractedField {
  id: string
  inspection_id: string
  field_name: string
  extracted_value: string
  confidence_score: number
  source: 'OCR' | 'LLM'
  created_at: string
}

// Inspector Corrections
export interface InspectorCorrection {
  id: string
  inspection_id: string
  field_name: string
  original_value: string
  corrected_value: string
  timestamp: string
}

// Compliance Findings
export interface ComplianceFinding {
  id: string
  inspection_id: string
  rule_id: string
  rule_name: string
  violation_type: string
  severity: 'HIGH' | 'MEDIUM' | 'LOW'
  message: string
  evidence: string
  created_at: string
}

// Final Results
export interface FinalResult {
  id: string
  inspection_id: string
  status: 'PASS' | 'FAIL' | 'MANUAL_REVIEW'
  total_violations_count: number
  high_severity_count: number
  findings_json: any
  created_at: string
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export interface UploadResponse {
  inspection_id: string
  image_url: string
  status: string
}