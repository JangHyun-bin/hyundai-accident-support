import { createRoot } from 'react-dom/client'
import App from './App'
import { ToolsStudy } from './ToolsStudy'
import { EmergencyStudy } from './emergency/EmergencyStudy'
import { EmergencyCatalog } from './emergency/EmergencyCatalog'
import './styles.css'

const study = new URLSearchParams(location.search).get('study')
createRoot(document.getElementById('root')!).render(study === 'emergency-catalog' ? <EmergencyCatalog /> : study === 'emergency' ? <EmergencyStudy /> : study === 'tools' ? <ToolsStudy /> : <App />)
