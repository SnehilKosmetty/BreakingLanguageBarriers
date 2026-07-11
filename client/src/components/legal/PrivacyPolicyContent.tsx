export function PrivacyPolicyContent() {
  return (
    <article className="legal-doc">
      <p className="legal-updated">Last updated: July 2026</p>

      <section>
        <h3>1. Introduction</h3>
        <p>
          Breaking Language Barriers with AI (&quot;we&quot;, &quot;our&quot;, &quot;the Service&quot;) provides real-time
          voice translation between languages. We are committed to protecting your privacy and handling
          your data responsibly, in line with GDPR, CCPA/CPRA, and India&apos;s Digital Personal Data Protection
          (DPDP) Act principles.
        </p>
      </section>

      <section>
        <h3>2. Data we collect</h3>
        <ul>
          <li><strong>Speech &amp; text:</strong> Audio is processed in your browser. Recognized text is sent to our servers for translation.</li>
          <li><strong>Session data:</strong> Language choices, session state, and a secure session token.</li>
          <li><strong>Technical data:</strong> IP address (for rate limiting and security), browser type, and connection logs — not conversation content.</li>
        </ul>
        <p>We do <strong>not</strong> require account registration, email, or phone number to use the Service.</p>
      </section>

      <section>
        <h3>3. How we use your data</h3>
        <ul>
          <li>To translate and deliver your conversation in real time</li>
          <li>To secure your session and prevent abuse</li>
          <li>To improve reliability of the Service (without using your chat content for AI training)</li>
        </ul>
      </section>

      <section>
        <h3>4. Private mode (default)</h3>
        <p>
          Private mode is enabled by default. In private mode we do <strong>not</strong> store your
          conversation on our servers. When you press Stop (solo or as session host), the session and
          related data are deleted from our servers.
        </p>
      </section>

      <section>
        <h3>5. Third-party services</h3>
        <p>
          Translation may be processed by third-party providers (e.g. MyMemory or Microsoft Azure Translator).
          Only the text required for translation is sent. Review their privacy policies when using production
          deployments. Speech recognition may use your browser&apos;s built-in service (e.g. Chrome Web Speech API).
        </p>
      </section>

      <section>
        <h3>6. Your rights</h3>
        <ul>
          <li><strong>Access:</strong> View your live conversation on screen while the session is active</li>
          <li><strong>Deletion:</strong> Clear display, Stop, or Delete session to remove data</li>
          <li><strong>Opt-out of storage:</strong> Keep Private mode on (default)</li>
          <li><strong>Portability:</strong> Copy text from your screen during an active session</li>
          <li><strong>Objection:</strong> Do not use the Service if you disagree with this policy</li>
        </ul>
        <p>
          EU/UK users may lodge a complaint with their local data protection authority. California residents
          may exercise CCPA rights by contacting us (see Contact).
        </p>
      </section>

      <section>
        <h3>7. Data retention</h3>
        <p>
          Private sessions: deleted on Stop. Optional history: held in server memory only until the server
          restarts — not written to a permanent database in the current version.
        </p>
      </section>

      <section>
        <h3>8. Security</h3>
        <p>
          We use HTTPS, session access tokens (stored as hashes), rate limiting, and security headers.
          Only people with your full invite link (session ID + secret token) can join a two-person conversation.
        </p>
      </section>

      <section>
        <h3>9. Children</h3>
        <p>
          The Service is not directed at children under 13 (or 16 in the EU without parental consent).
          We do not knowingly collect data from children.
        </p>
      </section>

      <section>
        <h3>10. Changes</h3>
        <p>We may update this Privacy Policy. Continued use after changes means you accept the updated policy.</p>
      </section>

      <section>
        <h3>11. Contact</h3>
        <p>For privacy requests, use the Contact &amp; Support section in the footer.</p>
      </section>
    </article>
  )
}
