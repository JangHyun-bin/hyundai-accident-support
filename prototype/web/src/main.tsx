import { createRoot } from 'react-dom/client'
import App from './App'
import { ToolsStudy } from './ToolsStudy'
import { EmergencyStudy } from './emergency/EmergencyStudy'
import { EmergencyCatalog } from './emergency/EmergencyCatalog'
import { JourneyCatalog } from './journey/JourneyCatalog'
import { JourneyStudy } from './journey/JourneyStudy'
import { ResponseConceptStudy } from './journey/ResponseConceptStudy'
import { ResponseNumeralStudy } from './journey/ResponseNumeralStudy'
import { ResponseSurfaceStudy } from './journey/ResponseSurfaceStudy'
import { ResponseSplitStudy } from './journey/ResponseSplitStudy'
import { SurfaceThemeProvider } from './design-system/SurfaceTheme'
import { DesignSystemCatalog } from './design-system/DesignSystemCatalog'
import './styles.css'

const study = new URLSearchParams(location.search).get('study')
const focus = new URLSearchParams(location.search).get('focus')
createRoot(document.getElementById('root')!).render(<SurfaceThemeProvider>{study === 'design-system' ? <DesignSystemCatalog /> : study === 'response-alts' && import.meta.env.DEV ? focus === 'split' ? <ResponseSplitStudy /> : focus === 'surface' ? <ResponseSurfaceStudy /> : focus === 'numeral' ? <ResponseNumeralStudy /> : <ResponseConceptStudy /> : study === 'journey' ? <JourneyStudy /> : study === 'journey-catalog' ? <JourneyCatalog /> : study === 'emergency-catalog' ? <EmergencyCatalog /> : study === 'emergency' ? <EmergencyStudy /> : study === 'tools' ? <ToolsStudy /> : study === 'legacy' ? <App /> : <JourneyStudy />}</SurfaceThemeProvider>)
