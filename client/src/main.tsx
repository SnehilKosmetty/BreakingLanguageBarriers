import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { preloadVoices } from './utils/audio'
import { applyTheme, getPreferredTheme } from './utils/theme'
import './index.css'
import App from './App.tsx'

applyTheme(getPreferredTheme())
preloadVoices()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
