export type UUID = string

export interface SessionSummary {
  id: UUID
  created_at: string
}

export interface SessionFile {
  id: UUID
  original_filename: string
  sort_index: number
  file_size: number
  preview_url: string
}

export interface SessionDetail {
  id: UUID
  created_at: string
  files: SessionFile[]
}

export interface InterlacePayload {
  file_order: UUID[]
  desired_name?: string
}

export interface InterlaceResult {
  job_id: UUID
  download_url: string
  preview_url: string
}

export interface SettingsResponse {
  database: Record<string, string>
}

export interface FrontendErrorReport {
  session_id?: UUID | null
  location: string
  message: string
  stack?: string | null
  metadata?: Record<string, unknown> | null
}
