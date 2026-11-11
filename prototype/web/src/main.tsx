import {lazy,Suspense} from 'react'
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
import type {SurroundingsView} from './design-system/SurroundingsStudy'

const FlowStudy=import.meta.env.DEV?lazy(()=>import('./design-system/FlowStudy').then(module=>({default:module.FlowStudy}))):null

const InteractionStudy=import.meta.env.DEV?lazy(()=>import('./design-system/InteractionStudy').then(module=>({default:module.InteractionStudy}))):null
const VehicleContourStudy=import.meta.env.DEV?lazy(()=>import('./design-system/VehicleContourStudy').then(module=>({default:module.VehicleContourStudy}))):null

const SurroundingsStudy=import.meta.env.DEV?lazy(()=>import('./design-system/SurroundingsStudy').then(module=>({default:module.SurroundingsStudy}))):null

const study = new URLSearchParams(location.search).get('study')
const focus = new URLSearchParams(location.search).get('focus')
const requestedView = new URLSearchParams(location.search).get('view')
const surroundingsView:SurroundingsView = requestedView==='front'||requestedView==='current'||requestedView==='replay'?requestedView:'vehicle'
createRoot(document.getElementById('root')!).render(<SurfaceThemeProvider>{study === 'flow' && FlowStudy ? <Suspense fallback={<p>Study 불러오는 중</p>}><FlowStudy/></Suspense> : study === 'surroundings' && SurroundingsStudy ? <Suspense fallback={<p>Study 불러오는 중</p>}><SurroundingsStudy initialView={surroundingsView}/></Suspense> : study === 'vehicle' && VehicleContourStudy ? <Suspense fallback={<p>Study 불러오는 중</p>}><VehicleContourStudy/></Suspense> : study === 'interaction' && InteractionStudy ? <Suspense fallback={<p>Study 불러오는 중</p>}><InteractionStudy/></Suspense> : study === 'design-system' ? <DesignSystemCatalog /> : study === 'response-alts' && import.meta.env.DEV ? focus === 'split' ? <ResponseSplitStudy /> : focus === 'surface' ? <ResponseSurfaceStudy /> : focus === 'numeral' ? <ResponseNumeralStudy /> : <ResponseConceptStudy /> : study === 'journey' ? <JourneyStudy /> : study === 'journey-catalog' ? <JourneyCatalog /> : study === 'emergency-catalog' ? <EmergencyCatalog /> : study === 'emergency' ? <EmergencyStudy /> : study === 'tools' ? <ToolsStudy /> : study === 'legacy' ? <App /> : <JourneyStudy />}</SurfaceThemeProvider>)
