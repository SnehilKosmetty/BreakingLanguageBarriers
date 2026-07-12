interface WaitingStateProps {
  icon?: string
  title: string
  description: string
  compact?: boolean
}

export function WaitingState({
  icon = '💬',
  title,
  description,
  compact = false,
}: WaitingStateProps) {
  return (
    <div className={`waiting-state ${compact ? 'waiting-state--compact' : ''}`}>
      <span className="waiting-state-icon" aria-hidden="true">
        {icon}
      </span>
      <div className="waiting-state-copy">
        <p className="waiting-state-title">{title}</p>
        <p className="waiting-state-desc">{description}</p>
      </div>
    </div>
  )
}
