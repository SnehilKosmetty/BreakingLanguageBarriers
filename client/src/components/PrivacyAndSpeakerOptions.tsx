import type { SpeakerMode } from '../types'

interface PrivacyAndSpeakerOptionsProps {
  showSpeakerToggle: boolean
  speakerMode: SpeakerMode
  privateMode: boolean
  saveHistory: boolean
  disabled?: boolean
  onSpeakerModeChange: (mode: SpeakerMode) => void
  onPrivateModeChange: (enabled: boolean) => void
  onSaveHistoryChange: (enabled: boolean) => void
}

export function PrivacyAndSpeakerOptions({
  showSpeakerToggle,
  speakerMode,
  privateMode,
  saveHistory,
  disabled,
  onSpeakerModeChange,
  onPrivateModeChange,
  onSaveHistoryChange,
}: PrivacyAndSpeakerOptionsProps) {
  return (
    <div className="pre-options">
      {showSpeakerToggle && (
        <div className="speaker-toggle">
          <div>
            <span className="pre-options-label">Who is speaking?</span>
            <p className="option-hint">
              Choose before Start. Switch when the other person talks on this device.
            </p>
          </div>
          <div className="toggle-group" role="group" aria-label="Speaker">
            <button
              type="button"
              className={speakerMode === 'LocalUser' ? 'active' : ''}
              onClick={() => onSpeakerModeChange('LocalUser')}
              disabled={disabled}
            >
              Me
            </button>
            <button
              type="button"
              className={speakerMode === 'RemoteUser' ? 'active' : ''}
              onClick={() => onSpeakerModeChange('RemoteUser')}
              disabled={disabled}
            >
              Other person
            </button>
          </div>
        </div>
      )}

      <div className="privacy-options">
        <div className="privacy-option-block">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={privateMode}
              onChange={(e) => {
                onPrivateModeChange(e.target.checked)
                if (e.target.checked) onSaveHistoryChange(false)
              }}
              disabled={disabled}
            />
            <span>Private mode</span>
          </label>
          {privateMode && (
            <p className="option-hint privacy-hint">
              Messages are <strong>not stored</strong>. After Stop, refresh, or leaving this page,
              all conversation text is deleted. The end-of-session summary shows counts only — not a transcript.
            </p>
          )}
        </div>

        <div className="privacy-option-block">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={saveHistory}
              onChange={(e) => onSaveHistoryChange(e.target.checked)}
              disabled={disabled || privateMode}
            />
            <span>Save history</span>
          </label>
          {!privateMode && saveHistory && (
            <p className="option-hint privacy-hint">
              Message text is kept on the server while this session exists.
            </p>
          )}
          {!privateMode && !saveHistory && (
            <p className="option-hint privacy-hint">
              History is off — messages disappear when you stop or refresh, like Private mode.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
