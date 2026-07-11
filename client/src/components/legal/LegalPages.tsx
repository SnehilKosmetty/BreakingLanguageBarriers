import { LegalModal } from './LegalModal'
import { PrivacyPolicyContent } from './PrivacyPolicyContent'
import { TermsContent } from './TermsContent'
import { CookiePolicyContent } from './CookiePolicyContent'
import { DisclaimerContent } from './DisclaimerContent'
import { ContactContent } from './ContactContent'
import type { LegalPage } from './SiteFooter'

const TITLES: Record<LegalPage, string> = {
  privacy: 'Privacy Policy',
  terms: 'Terms & Conditions',
  cookies: 'Cookie Policy',
  disclaimer: 'Disclaimer',
  contact: 'Contact & Support',
}

interface LegalPagesProps {
  page: LegalPage | null
  onClose: () => void
}

export function LegalPages({ page, onClose }: LegalPagesProps) {
  if (!page) return null

  const content = {
    privacy: <PrivacyPolicyContent />,
    terms: <TermsContent />,
    cookies: <CookiePolicyContent />,
    disclaimer: <DisclaimerContent />,
    contact: <ContactContent />,
  }[page]

  return (
    <LegalModal title={TITLES[page]} open={!!page} onClose={onClose}>
      {content}
    </LegalModal>
  )
}
