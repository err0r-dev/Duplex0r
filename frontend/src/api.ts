import type {
  FrontendErrorReport,
  InterlacePayload,
  InterlaceResult,
  SessionDetail,
  SessionSummary,
  SettingsResponse,
  UUID,
} from './types'

export const API_BASE = import.meta.env.VITE_API_BASE ?? '/api'

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      ...(init?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...init?.headers,
    },
    ...init,
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `Request failed with status ${response.status}`)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

export async function createSession(): Promise<SessionSummary> {
  return request<SessionSummary>('/sessions', { method: 'POST' })
}

export async function fetchSession(sessionId: UUID): Promise<SessionDetail> {
  return request<SessionDetail>(`/sessions/${sessionId}`)
}

export async function uploadFiles(
  sessionId: UUID,
  files: File[],
): Promise<SessionDetail> {
  const formData = new FormData()
  files.forEach((file) => formData.append('files', file))

  return request<SessionDetail>(`/sessions/${sessionId}/upload`, {
    method: 'POST',
    body: formData,
  })
}

export async function reorderFiles(
  sessionId: UUID,
  order: UUID[],
): Promise<SessionDetail> {
  return request<SessionDetail>(`/sessions/${sessionId}/order`, {
    method: 'POST',
    body: JSON.stringify({ file_order: order }),
  })
}

export async function interlaceFiles(
  sessionId: UUID,
  payload: InterlacePayload,
): Promise<InterlaceResult> {
  return request<InterlaceResult>(`/sessions/${sessionId}/interlace`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function resetSession(sessionId: UUID): Promise<SessionDetail> {
  return request<SessionDetail>(`/sessions/${sessionId}/reset`, {
    method: 'POST',
  })
}

export async function fetchSettings(): Promise<SettingsResponse> {
  return request<SettingsResponse>('/settings')
}

export async function logFrontendError(payload: FrontendErrorReport): Promise<void> {
  try {
    await request('/logs/errors', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  } catch (error) {
    console.error('Failed to record frontend error', error)
  }
}
