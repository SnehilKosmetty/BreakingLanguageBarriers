import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { preloadVoices } from './utils/audio'
import './index.css'
import App from './App.tsx'

preloadVoices()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
