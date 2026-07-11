export function ContactContent() {
  return (
    <article className="legal-doc">
      <section>
        <h3>Contact &amp; Support</h3>
        <p>
          For privacy requests, data deletion questions, terms inquiries, or security concerns, contact the
          operator of your deployed instance of Breaking Language Barriers with AI.
        </p>
      </section>

      <section>
        <h3>Privacy requests (GDPR / CCPA / DPDP)</h3>
        <p>You may request:</p>
        <ul>
          <li>Confirmation of what data we hold (typically none in private mode after Stop)</li>
          <li>Deletion of session data — use <strong>Delete session</strong> or <strong>Stop</strong> in the app</li>
          <li>Information about third-party processors used for translation</li>
        </ul>
        <p>
          <strong>Email:</strong> privacy@your-domain.com<br />
          <em>(Replace with your real contact email before public launch.)</em>
        </p>
      </section>

      <section>
        <h3>Security issues</h3>
        <p>
          If you discover a vulnerability, please report it privately — do not post it publicly. Email:
          security@your-domain.com
        </p>
      </section>

      <section>
        <h3>Response time</h3>
        <p>We aim to respond to privacy and support requests within 30 days (45 days where CCPA allows).</p>
      </section>
    </article>
  )
}
