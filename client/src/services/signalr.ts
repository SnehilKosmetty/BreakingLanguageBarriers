import * as signalR from '@microsoft/signalr'
import type { Session, TranslationResponse } from '../types'
import { getSessionAccessToken } from './api'

const HUB_URL = `${import.meta.env.VITE_API_BASE_URL ?? ''}/hubs/conversation`

function hubCredentials(): boolean {
  if (!import.meta.env.VITE_API_BASE_URL) return false
  try {
    return new URL(import.meta.env.VITE_API_BASE_URL).origin !== window.location.origin
  } catch {
    return false
  }
}

export type TranslationHandler = (result: TranslationResponse) => void
export type SessionHandler = (session: Session) => void

export interface ParticipantEvent {
  role?: string
  participantCount: number
}

export type ParticipantHandler = (event: ParticipantEvent) => void
export type RejoinHandler = () => void | Promise<void>

function requireToken(): string {
  const token = getSessionAccessToken()
  if (!token) throw new Error('Session access token is missing.')
  return token
}

export class ConversationHubClient {
  private connection: signalR.HubConnection | null = null
  private readonly translationHandlers = new Set<TranslationHandler>()
  private readonly conversationStartedHandlers = new Set<SessionHandler>()
  private readonly conversationStoppedHandlers = new Set<SessionHandler>()
  private readonly conversationPausedHandlers = new Set<SessionHandler>()
  private readonly conversationResumedHandlers = new Set<SessionHandler>()
  private readonly participantJoinedHandlers = new Set<ParticipantHandler>()
  private readonly participantLeftHandlers = new Set<ParticipantHandler>()
  private readonly rejoinHandlers = new Set<RejoinHandler>()

  onRejoin(handler: RejoinHandler): void {
    this.rejoinHandlers.add(handler)
  }

  offRejoin(handler: RejoinHandler): void {
    this.rejoinHandlers.delete(handler)
  }

  private bindHandlers(connection: signalR.HubConnection): void {
    for (const handler of this.translationHandlers) {
      connection.on('TranslationReady', handler)
    }
    for (const handler of this.conversationStartedHandlers) {
      connection.on('ConversationStarted', handler)
    }
    for (const handler of this.conversationStoppedHandlers) {
      connection.on('ConversationStopped', handler)
    }
    for (const handler of this.conversationPausedHandlers) {
      connection.on('ConversationPaused', handler)
    }
    for (const handler of this.conversationResumedHandlers) {
      connection.on('ConversationResumed', handler)
    }
    for (const handler of this.participantJoinedHandlers) {
      connection.on('ParticipantJoined', handler)
    }
    for (const handler of this.participantLeftHandlers) {
      connection.on('ParticipantLeft', handler)
    }
  }

  async connect(): Promise<void> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) return

    if (this.connection) {
      try {
        await this.connection.stop()
      } catch {
        // Previous connection may already be closed
      }
      this.connection = null
    }

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL, {
        withCredentials: hubCredentials(),
        transport:
          signalR.HttpTransportType.WebSockets |
          signalR.HttpTransportType.ServerSentEvents |
          signalR.HttpTransportType.LongPolling,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .build()

    this.bindHandlers(connection)

    connection.onreconnected(async () => {
      for (const handler of this.rejoinHandlers) {
        await handler()
      }
    })

    this.connection = connection

    try {
      await connection.start()
    } catch (err) {
      this.connection = null
      const msg = err instanceof Error ? err.message : 'Could not connect to conversation hub.'
      throw new Error(msg)
    }
  }

  async ensureConnected(): Promise<void> {
    const state = this.connection?.state
    if (state === signalR.HubConnectionState.Connected) return
    if (state === signalR.HubConnectionState.Connecting || state === signalR.HubConnectionState.Reconnecting) {
      await this.waitForConnected(15000)
      return
    }
    await this.connect()
  }

  private waitForConnected(timeoutMs: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const connection = this.connection
      if (!connection) {
        reject(new Error('No hub connection.'))
        return
      }
      if (connection.state === signalR.HubConnectionState.Connected) {
        resolve()
        return
      }

      const timer = window.setTimeout(() => {
        connection.off('close', onClose)
        reject(new Error('Timed out waiting for hub connection.'))
      }, timeoutMs)

      const onClose = () => {
        window.clearTimeout(timer)
        reject(new Error('Hub connection closed.'))
      }

      const poll = window.setInterval(() => {
        if (connection.state === signalR.HubConnectionState.Connected) {
          window.clearTimeout(timer)
          window.clearInterval(poll)
          connection.off('close', onClose)
          resolve()
        }
      }, 200)
    })
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
    this.translationHandlers.add(handler)
    this.connection?.on('TranslationReady', handler)
  }

  onConversationStarted(handler: SessionHandler): void {
    this.conversationStartedHandlers.add(handler)
    this.connection?.on('ConversationStarted', handler)
  }

  onConversationStopped(handler: SessionHandler): void {
    this.conversationStoppedHandlers.add(handler)
    this.connection?.on('ConversationStopped', handler)
  }

  onConversationPaused(handler: SessionHandler): void {
    this.conversationPausedHandlers.add(handler)
    this.connection?.on('ConversationPaused', handler)
  }

  onConversationResumed(handler: SessionHandler): void {
    this.conversationResumedHandlers.add(handler)
    this.connection?.on('ConversationResumed', handler)
  }

  onParticipantJoined(handler: ParticipantHandler): void {
    this.participantJoinedHandlers.add(handler)
    this.connection?.on('ParticipantJoined', handler)
  }

  onParticipantLeft(handler: ParticipantHandler): void {
    this.participantLeftHandlers.add(handler)
    this.connection?.on('ParticipantLeft', handler)
  }

  off(event: string, handler?: unknown): void {
    if (!this.connection) return

    if (event === 'TranslationReady' && handler) {
      this.translationHandlers.delete(handler as TranslationHandler)
      this.connection.off('TranslationReady', handler as TranslationHandler)
      return
    }
    if (event === 'ConversationStarted' && handler) {
      this.conversationStartedHandlers.delete(handler as SessionHandler)
      this.connection.off('ConversationStarted', handler as SessionHandler)
      return
    }
    if (event === 'ConversationStopped' && handler) {
      this.conversationStoppedHandlers.delete(handler as SessionHandler)
      this.connection.off('ConversationStopped', handler as SessionHandler)
      return
    }
    if (event === 'ConversationPaused' && handler) {
      this.conversationPausedHandlers.delete(handler as SessionHandler)
      this.connection.off('ConversationPaused', handler as SessionHandler)
      return
    }
    if (event === 'ConversationResumed' && handler) {
      this.conversationResumedHandlers.delete(handler as SessionHandler)
      this.connection.off('ConversationResumed', handler as SessionHandler)
      return
    }
    if (event === 'ParticipantJoined' && handler) {
      this.participantJoinedHandlers.delete(handler as ParticipantHandler)
      this.connection.off('ParticipantJoined', handler as ParticipantHandler)
      return
    }
    if (event === 'ParticipantLeft' && handler) {
      this.participantLeftHandlers.delete(handler as ParticipantHandler)
      this.connection.off('ParticipantLeft', handler as ParticipantHandler)
      return
    }

    this.connection.off(event)
  }

  async joinSession(sessionId: string, role = 'guest'): Promise<void> {
    await this.ensureConnected()
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
