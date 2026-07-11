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

        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={saveHistory}
            onChange={(e) => onSaveHistoryChange(e.target.checked)}
            disabled={disabled || privateMode}
          />
          <span>Save history</span>
        </label>
      </div>
    </div>
  )
}
