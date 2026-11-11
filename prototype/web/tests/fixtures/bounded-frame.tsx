import React, {useContext} from 'react'
import {createRoot} from 'react-dom/client'
import {VehicleShell} from '../../src/components/ui/after-care-layout'
import {SurroundingsScene} from '../../src/design-system/SurroundingsStudy'
import {FlowFrameContext} from '../../src/design-system/flow-contract'
import '../../src/styles.css'

const host=document.getElementById('host')!
function FrameReadout(){
 const frame=useContext(FlowFrameContext)
 return <output data-testid="frame-revision" data-revision={frame?.revision} data-width={frame?.width} hidden/>
}
createRoot(host).render(<VehicleShell presentation="bounded" device={host.dataset.device==='mobile'?'mobile':'vehicle'} previewHeight={Number(host.dataset.height)} header={<div className="test-header">사고 대응 진행<FrameReadout/></div>}>
 <div className="test-panes"><SurroundingsScene bounded/><div className="test-editor"><textarea aria-label="긴 기록" defaultValue="기록"/><div id="long-content">기록</div></div></div>
</VehicleShell>)
