import type { Language, Session, TranslationResponse, AiProviderStatus } from '../types'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''

function fetchCredentials(): RequestCredentials {
  if (!API_BASE) return 'same-origin'
  try {
    return new URL(API_BASE).origin !== window.location.origin ? 'include' : 'same-origin'
  } catch {
    return 'same-origin'
  }
}

let sessionAccessToken: string | null = null

export function setSessionAccessToken(token: string | null): void {
  sessionAccessToken = token
}

export function getSessionAccessToken(): string | null {
  return sessionAccessToken
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string> | undefined),
  }

  if (sessionAccessToken) {
    headers['X-Session-Token'] = sessionAccessToken
  }

  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      credentials: fetchCredentials(),
    })
  } catch {
    throw new Error('Could not reach the API. Check your connection and try again.')
  }

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Session not found or access denied.')
    }
    const error = await response.json().catch(() => ({ error: response.statusText }))
    throw new Error(error.error ?? `Request failed: ${response.status}`)
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export interface CreateSessionResult {
  session: Session
  accessToken: string
}

function normalizeCreateSession(raw: Record<string, unknown>): CreateSessionResult {
  const session = (raw.session ?? raw.Session) as Session
  const accessToken = String(raw.accessToken ?? raw.AccessToken ?? '')
  if (!accessToken) throw new Error('Server did not return a session access token.')
  return { session, accessToken }
}

export const api = {
  getHealth: () => request<{ status: string; mission: string }>('/api/v1/health'),

  getAiStatus: () => request<AiProviderStatus>('/api/v1/ai-status'),

  getLanguages: () => request<Language[]>('/api/v1/languages'),

  getIndianLanguages: () => request<Language[]>('/api/v1/languages/indian'),

  getInternationalLanguages: () => request<Language[]>('/api/v1/languages/international'),

  getSession: (sessionId: string) =>
    request<Session>(`/api/v1/sessions/${sessionId}`),

  createSession: async (body: {
    myLanguageCode: string
    otherPersonLanguageCode: string
    saveHistory: boolean
    privacyMode: string
  }): Promise<CreateSessionResult> => {
    const raw = await request<Record<string, unknown>>('/api/v1/sessions', {
      method: 'POST',
      body: JSON.stringify(body),
    })
    return normalizeCreateSession(raw)
  },

  startSession: (sessionId: string) =>
    request<Session>(`/api/v1/sessions/${sessionId}/start`, { method: 'POST' }),

  stopSession: (sessionId: string) =>
    request<Session>(`/api/v1/sessions/${sessionId}/stop`, { method: 'POST' }),

  pauseSession: (sessionId: string) =>
    request<Session>(`/api/v1/sessions/${sessionId}/pause`, { method: 'POST' }),

  resumeSession: (sessionId: string) =>
    request<Session>(`/api/v1/sessions/${sessionId}/resume`, { method: 'POST' }),

  translate: (sessionId: string, body: {
    sessionId: string
    speaker: string
    recognizedText: string
    recognitionConfidence: number
  }) =>
    request<TranslationResponse>(`/api/v1/sessions/${sessionId}/translate`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getHistory: (sessionId: string) =>
    request<import('../types').ConversationTurn[]>(`/api/v1/sessions/${sessionId}/history`),

  clearServerHistory: (sessionId: string) =>
    request<void>(`/api/v1/sessions/${sessionId}/history`, { method: 'DELETE' }),

  deleteSession: (sessionId: string) =>
    request<void>(`/api/v1/sessions/${sessionId}`, { method: 'DELETE' }),

  speak: async (sessionId: string, body: { text: string; languageCode: string }) => {
    const raw = await request<Record<string, unknown>>(`/api/v1/sessions/${sessionId}/speak`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
    return {
      audioBase64: String(raw.audioBase64 ?? raw.AudioBase64 ?? ''),
      audioContentType: String(raw.audioContentType ?? raw.AudioContentType ?? 'audio/wav'),
    }
  },
}
