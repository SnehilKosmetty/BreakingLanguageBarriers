export const ACTIVE_SESSION_KEY = 'blb-active-session'

export interface SavedActiveSession {
  role: 'host' | 'guest'
  sessionId: string
  accessToken: string
  myLanguageCode: string
  otherLanguageCode: string
}

export function saveActiveSession(data: SavedActiveSession): void {
  try {
    sessionStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(data))
  } catch {
    // Private browsing or storage full
  }
}

export function loadActiveSession(): SavedActiveSession | null {
  try {
    const raw = sessionStorage.getItem(ACTIVE_SESSION_KEY)
    if (!raw) return null
    return JSON.parse(raw) as SavedActiveSession
  } catch {
    return null
  }
}

export function clearActiveSession(): void {
  try {
    sessionStorage.removeItem(ACTIVE_SESSION_KEY)
  } catch {
    // Ignore
  }
}
