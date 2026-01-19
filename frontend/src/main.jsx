import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { ThemeProvider } from './contexts/ThemeContext'
import { ActivityProvider } from './contexts/ActivityContext'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <ActivityProvider>
        <App />
      </ActivityProvider>
    </ThemeProvider>
  </React.StrictMode>,
)
