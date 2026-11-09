import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { applyTheme, getInitialTheme } from './lib/theme'
import { useLocaleStore } from './store/useLocaleStore'

applyTheme(getInitialTheme())

const container = document.getElementById('root')
if (!container) throw new Error('Root container not found')

document.documentElement.lang = useLocaleStore.getState().locale

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
