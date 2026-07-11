export function DisclaimerContent() {
  return (
    <article className="legal-doc">
      <p className="legal-updated">Last updated: July 2026</p>

      <section>
        <h3>Translation accuracy</h3>
        <p>
          AI translation is not perfect. Meaning, tone, idioms, and cultural context may be lost or changed.
          Do not rely solely on this Service for medical advice, legal contracts, financial decisions,
          emergencies, or safety-critical communication.
        </p>
      </section>

      <section>
        <h3>Not a substitute for professional interpreters</h3>
        <p>
          For courts, hospitals, immigration, or certified interpretation, use qualified human interpreters
          where required by law or policy.
        </p>
      </section>

      <section>
        <h3>Microphone &amp; environment</h3>
        <p>
          Background noise, accents, and device quality affect recognition. Use in a quiet environment when
          possible and verify important messages with the other person.
        </p>
      </section>

      <section>
        <h3>Third-party services</h3>
        <p>
          Translation and speech services may be provided by external APIs (MyMemory, Microsoft Azure, browser
          vendors). Their availability and accuracy are outside our full control.
        </p>
      </section>

      <section>
        <h3>Beta / development</h3>
        <p>
          Features may change. The Service may be unavailable during maintenance. Use at your own discretion.
        </p>
      </section>
    </article>
  )
}
