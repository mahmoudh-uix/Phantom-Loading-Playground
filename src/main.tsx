import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './ds-tokens.css'
import { PhantomPlayground } from './PhantomPlayground'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PhantomPlayground />
  </StrictMode>,
)
