import * as signalR from '@microsoft/signalr'
import type { Session, TranslationResponse } from '../types'
import { getSessionAccessToken } from './api'

const HUB_URL = `${import.meta.env.VITE_API_BASE_URL ?? ''}/hubs/conversation`

export type TranslationHandler = (result: TranslationResponse) => void
export type SessionHandler = (session: Session) => void

export interface ParticipantEvent {
  role?: string
  participantCount: number
}

export type ParticipantHandler = (event: ParticipantEvent) => void

function requireToken(): string {
  const token = getSessionAccessToken()
  if (!token) throw new Error('Session access token is missing.')
  return token
}

export class ConversationHubClient {
  private connection: signalR.HubConnection | null = null

  async connect(): Promise<void> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) return

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL)
      .withAutomaticReconnect()
      .build()

    await this.connection.start()
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.stop()
      this.connection = null
    }
  }

  isConnected(): boolean {
    return this.connection?.state === signalR.HubConnectionState.Connected
  }

  onTranslationReady(handler: TranslationHandler): void {
    this.connection?.on('TranslationReady', handler)
  }

  onConversationStarted(handler: SessionHandler): void {
    this.connection?.on('ConversationStarted', handler)
  }

  onConversationStopped(handler: SessionHandler): void {
    this.connection?.on('ConversationStopped', handler)
  }

  onConversationPaused(handler: SessionHandler): void {
    this.connection?.on('ConversationPaused', handler)
  }

  onConversationResumed(handler: SessionHandler): void {
    this.connection?.on('ConversationResumed', handler)
  }

  onParticipantJoined(handler: ParticipantHandler): void {
    this.connection?.on('ParticipantJoined', handler)
  }

  onParticipantLeft(handler: ParticipantHandler): void {
    this.connection?.on('ParticipantLeft', handler)
  }

  off(event: string): void {
    this.connection?.off(event)
  }

  async joinSession(sessionId: string, role = 'guest'): Promise<void> {
    await this.connection?.invoke('JoinSession', sessionId, requireToken(), role)
  }

  async leaveSession(sessionId: string): Promise<void> {
    await this.connection?.invoke('LeaveSession', sessionId, requireToken())
  }

  async startConversation(sessionId: string): Promise<void> {
    await this.connection?.invoke('StartConversation', sessionId, requireToken())
  }

  async stopConversation(sessionId: string): Promise<void> {
    await this.connection?.invoke('StopConversation', sessionId, requireToken())
  }

  async pauseConversation(sessionId: string): Promise<void> {
    await this.connection?.invoke('PauseConversation', sessionId, requireToken())
  }

  async resumeConversation(sessionId: string): Promise<void> {
    await this.connection?.invoke('ResumeConversation', sessionId, requireToken())
  }

  async submitRecognizedSpeech(request: {
    sessionId: string
    speaker: string
    recognizedText: string
    recognitionConfidence: number
  }): Promise<void> {
    await this.connection?.invoke('SubmitRecognizedSpeech', request, requireToken())
  }
}

export const hubClient = new ConversationHubClient()
