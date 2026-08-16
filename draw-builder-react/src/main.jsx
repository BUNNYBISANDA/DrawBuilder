import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import PublicView from './PublicView.jsx'

const isPublicView = new URLSearchParams(window.location.search).get('view') === 'watch';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isPublicView ? <PublicView /> : <App />}
  </StrictMode>,
)
