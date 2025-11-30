import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import TombolaPrizeManager from './App'
import { storage } from './storage'

;(window as any).storage = storage

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TombolaPrizeManager />
  </React.StrictMode>,
)
