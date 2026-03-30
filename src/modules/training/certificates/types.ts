// =============================================
// Certificates - Certyfikaty ukonczenia
// Tabela: certificates
// Moze byc powiazany z product, program lub obydwoma
// =============================================

export interface Certificate {
  id: string
  workspace_id: string
  user_id: string
  product_id: string | null
  program_id: string | null
  enrollment_id: string | null
  certificate_number: string
  issued_at: string
  file_url: string | null
  template_data: CertificateTemplateData
  created_at: string
}

export interface CertificateTemplateData {
  member_name?: string
  product_title?: string
  program_title?: string
  workspace_name?: string
  completion_date?: string
  custom_fields?: Record<string, string>
}

export interface CertificateWithRelations extends Certificate {
  products?: { name: string; type: string } | null
  programs?: { name: string } | null
  member?: { display_name: string } | null
  workspace?: { name: string } | null
}
