// =============================================
// Resources - Biblioteka materialow
// Odpowiedzialnosc: upload, katalog, tagi, download tracking
// =============================================

export type ResourceFileType =
  | 'pdf'
  | 'template'
  | 'workbook'
  | 'checklist'
  | 'sop'
  | 'recording'
  | 'video'
  | 'audio'
  | 'link'
  | 'other'

export interface Resource {
  id: string
  workspace_id: string
  product_id: string | null
  title: string
  description: string | null
  type: ResourceFileType
  file_url: string | null
  file_name: string | null
  file_size: number | null
  external_url: string | null
  thumbnail_url: string | null
  is_premium: boolean
  download_count: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ResourceWithTags extends Resource {
  resource_tags?: Array<{ tags: { name: string; color: string } }>
}

// Labels
export const RESOURCE_TYPE_LABELS: Record<ResourceFileType, string> = {
  pdf: 'PDF',
  template: 'Szablon',
  workbook: 'Zeszyt cwiczen',
  checklist: 'Checklista',
  sop: 'Procedura',
  recording: 'Nagranie',
  video: 'Wideo',
  audio: 'Audio',
  link: 'Link',
  other: 'Inne',
}

export const RESOURCE_TYPE_ICONS: Record<ResourceFileType, string> = {
  pdf: 'PDF',
  template: 'TPL',
  workbook: 'WB',
  checklist: 'CHL',
  sop: 'SOP',
  recording: 'REC',
  video: 'VID',
  audio: 'AUD',
  link: 'LNK',
  other: 'DOC',
}
