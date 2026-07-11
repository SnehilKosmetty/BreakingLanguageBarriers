import { DemoVisual } from './DemoVisual'

type GuideMode = 'solo' | 'two-person'

interface AppGuideProps {
  defaultMode?: GuideMode
}

const specialties = [
  {
    icon: '⚡',
    title: 'Start once, talk freely',
    text: 'Press Start once and keep talking — no mic tap after every sentence.',
  },
  {
    icon: '🇮🇳',
    title: 'Indian languages first',
    text: 'Telugu, Hindi, Marathi, Tamil, Kannada, Bengali, and more.',
  },
  {
    icon: '💬',
    title: 'Real conversation flow',
    text: 'You speak → it translates → it speaks back automatically.',
  },
  {
    icon: '🔗',
    title: 'One phone or two',
    text: 'Solo on one device, or share a link for two people.',
  },
]

const useCases = [
  { icon: '👨‍👩‍👧', label: 'Family', hint: 'Talk to relatives in another language' },
  { icon: '🏥', label: 'Daily life', hint: 'Doctor, shop, neighbor, office' },
  { icon: '✈️', label: 'Travel', hint: 'Directions, food, new friends' },
  { icon: '📞', label: 'Remote calls', hint: 'Family abroad or another state' },
]

const soloSteps = [
  'Pick **My language** and **Other person\'s language**.',
  'Choose **Me** or **Other person** for who is talking on this device.',
  'Press **Start conversation** and allow the microphone.',
  'Speak one sentence, pause — translation appears and plays.',
  'Switch to **Other person** when they talk on the same phone.',
  'Press **Stop** when finished.',
]

const twoPersonSteps = [
  'Choose **Two people (share link)** and pick both languages.',
  'Press **Start & invite**, then copy and send the link.',
  'Your friend opens the link on their device.',
  'Each person speaks their own language — translations flow both ways.',
  'Press **Stop** when finished.',
]

const tips = [
  'Use **Chrome** or **Edge** for best microphone support.',
  'Speak **one sentence at a time**, then pause.',
  'A **quiet place** helps the mic hear you clearly.',
]

function renderStep(text: string) {
  const parts = text.split(/\*\*(.+?)\*\*/g)
  return parts.map((part, i) => (i % 2 === 1 ? <strong key={i}>{part}</strong> : part))
}

export function AppGuide({ defaultMode = 'solo' }: AppGuideProps) {
  const steps = defaultMode === 'two-person' ? twoPersonSteps : soloSteps
  const modeLabel = defaultMode === 'two-person' ? 'Two people' : 'Solo'

  return (
    <section className="app-guide" id="guide">
      <h2 className="guide-heading">What makes it different</h2>
      <ul className="specialty-grid">
        {specialties.map((item) => (
          <li key={item.title} className="specialty-card">
            <span className="specialty-icon" aria-hidden="true">{item.icon}</span>
            <h3>{item.title}</h3>
            <p>{item.text}</p>
          </li>
        ))}
      </ul>

      <div className="guide-block">
        <h2 className="guide-heading">Best for</h2>
        <ul className="use-case-grid">
          {useCases.map((item) => (
            <li key={item.label} className="use-case-card">
              <span className="use-case-icon" aria-hidden="true">{item.icon}</span>
              <strong>{item.label}</strong>
              <span>{item.hint}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="guide-block demo-block">
        <h2 className="guide-heading">Quick demo — {modeLabel}</h2>
        <DemoVisual mode={defaultMode} />
        <ol className="demo-steps">
          {steps.map((step, i) => (
            <li key={i}>
              <span className="demo-step-num">{i + 1}</span>
              <span className="demo-step-text">{renderStep(step)}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="guide-block guide-tips">
        <h2 className="guide-heading">Tips</h2>
        <ul className="tips-list">
          {tips.map((tip) => (
            <li key={tip}>{renderStep(tip)}</li>
          ))}
        </ul>
      </div>
    </section>
  )
}
