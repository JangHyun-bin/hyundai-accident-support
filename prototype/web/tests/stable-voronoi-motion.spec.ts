import {test,expect} from '@playwright/test'
import {writeFile} from 'node:fs/promises'

test('normal motion keeps vehicle boundaries and the live call text anchored',async({page},testInfo)=>{
 await page.setViewportSize({width:1440,height:900})
 await page.emulateMedia({reducedMotion:'no-preference'})
 await page.goto('/')
 await page.getByRole('button',{name:'이 상황으로 시작',exact:true}).click()
 await page.evaluate(()=>document.fonts.ready)
 await page.getByTestId('journey-primary').click()
 await page.getByRole('button',{name: /^(?:다음 · )?시연 event: 통화 연결 확인$/,exact:true}).click()
 await page.evaluate(()=>{
  const samples:unknown[]=[]
  const state={samples,stop:false};Object.assign(window,{motionAudit:state})
  const frame=()=>{
   const board=document.querySelector<HTMLElement>('.fs-board')!
   const shell=document.querySelector('.ac-vehicle')!.getBoundingClientRect(),scene=document.querySelector('.journey-flow-scene')!.getBoundingClientRect(),b=board.getBoundingClientRect()
   const p=board.querySelector<HTMLElement>('[data-cell=emergency] p')!
   const r=p.getBoundingClientRect(),css=getComputedStyle(p),range=document.createRange();range.selectNodeContents(p)
   let opacity=1;for(let e:HTMLElement|null=p;e&&e!==board;e=e.parentElement)opacity*=Number(getComputedStyle(e).opacity)
   samples.push({paths:[...board.querySelectorAll<HTMLElement>('.ac-material-frame')].map(node=>node.dataset.shapePath).join('/'),time:performance.now(),moving:board.dataset.moving==='true',target:board.dataset.target,
    shell:{height:shell.height,top:shell.top,bottom:shell.bottom},scene:{height:scene.height,top:scene.top,bottom:scene.bottom},board:{height:b.height,top:b.top,bottom:b.bottom},
    call:{x:r.x-b.x,y:r.y-b.y,width:r.width,font:css.fontSize,lineHeight:css.lineHeight,spacing:css.letterSpacing,lines:range.getClientRects().length,opacity,text:p.textContent}})
   if(!state.stop)requestAnimationFrame(frame)
  };requestAnimationFrame(frame)
 })
 await page.getByTestId('journey-primary').click()
 await expect(page.getByTestId('flow-board')).toHaveAttribute('data-moving','true')
 await expect(page.getByTestId('flow-board')).toHaveAttribute('data-layout','evacuate',{timeout:8000})
 await expect(page.getByTestId('flow-board')).toHaveAttribute('data-moving','false')
 const samples=await page.evaluate(()=>{const s=(window as unknown as {motionAudit:{samples:any[];stop:boolean}}).motionAudit;s.stop=true;return s.samples})
 await writeFile('.audit/stable-voronoi-normal-motion.json',JSON.stringify(samples,null,2))
 await testInfo.attach('normal-motion.json',{body:JSON.stringify(samples,null,2),contentType:'application/json'})
 const moving=samples.filter(s=>s.moving)
 expect(new Set(moving.map(s=>s.paths)).size,'must measure actual changing geometry, not only fade').toBeGreaterThanOrEqual(10)
 expect(moving.length,'must measure actual normal-motion intermediate frames').toBeGreaterThanOrEqual(10)
 for(const part of ['shell','scene','board'])for(const key of ['height','top','bottom']){
  const values=moving.map(s=>s[part][key]);expect(Math.max(...values)-Math.min(...values),`${part}.${key}`).toBeLessThanOrEqual(1)
 }
 for(const key of ['x','y','width']){const v=moving.map(s=>s.call[key]);expect(Math.max(...v)-Math.min(...v),`critical call ${key}`).toBeLessThanOrEqual(1)}
 expect(new Set(moving.map(s=>[s.call.font,s.call.lineHeight,s.call.spacing,s.call.lines].join('/'))).size).toBe(1)
 expect(Math.min(...moving.map(s=>s.call.opacity)),'call facts must never fade during a geometry transition').toBeGreaterThanOrEqual(.999)
})

test('editors wait for a full slot and decorative numerals never cross a moving surface',async({page})=>{
 await page.setViewportSize({width:1920,height:1080});await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/')
 await page.getByRole('button',{name:'이 상황으로 시작',exact:true}).click();await page.getByTestId('journey-primary').click();await page.getByRole('button',{name: /^(?:다음 · )?시연 event: 통화 연결 확인$/,exact:true}).click()
 await page.evaluate(()=>{
  const state={stop:false,frames:0,violations:[] as string[]};Object.assign(window,{slotAudit:state});const canvas=document.createElement('canvas').getContext('2d')!
  function sample(){
   const board=document.querySelector<HTMLElement>('.fs-board')!;if(board.dataset.moving==='true')state.frames++
   const call=board.querySelector<HTMLElement>('.fs-call-core')!;let callOpacity=1;for(let e:HTMLElement|null=call;e;e=e.parentElement)callOpacity*=+getComputedStyle(e).opacity
   if(callOpacity<.999)state.violations.push('critical call faded by an ancestor')
   for(const editor of board.querySelectorAll<HTMLElement>('.journey-flow-workspace'))if(editor.getClientRects().length&&editor.closest('[data-compact=true]'))state.violations.push('editor visible in summary slot')
   const decoration=board.querySelector<HTMLElement>('.fs-call-decoration')
   if(decoration?.getClientRects().length){
    let opacity=1;for(let e:HTMLElement|null=decoration;e&&e!==board;e=e.parentElement)opacity*=+getComputedStyle(e).opacity
    if(opacity>.001){const material=board.querySelector<HTMLElement>('[data-cell=emergency] .ac-material-frame')!,m=material.getBoundingClientRect(),path=new Path2D(material.dataset.shapePath!),r=decoration.getBoundingClientRect()
     if([[r.left,r.top],[r.right,r.top],[r.right,r.bottom],[r.left,r.bottom]].some(([x,y])=>!canvas.isPointInPath(path,x-m.left,y-m.top)))state.violations.push('decoration outside rounded surface')
    }
   }
   if(!state.stop)requestAnimationFrame(sample)
  };requestAnimationFrame(sample)
 })
 for(let i=0;i<3;i++){
  await page.getByTestId('journey-primary').click()
  await expect(page.getByTestId('flow-board')).toHaveAttribute('data-moving','false',{timeout:8000})
 }
 await page.getByRole('button',{name:'직접 입력',exact:true}).click();await page.getByRole('textbox',{name:'사고 기록',exact:true}).fill('확인한 사고 내용');await page.getByRole('button',{name:'기록 저장',exact:true}).click();await page.getByTestId('journey-primary').click()
 await expect(page.getByTestId('flow-board')).toHaveAttribute('data-layout','review',{timeout:8000});await expect(page.getByTestId('flow-board')).toHaveAttribute('data-moving','false')
 const audit=await page.evaluate(()=>{const state=(window as unknown as {slotAudit:{stop:boolean;frames:number;violations:string[]}}).slotAudit;state.stop=true;return state})
 expect(audit.frames).toBeGreaterThanOrEqual(30);expect([...new Set(audit.violations)]).toEqual([])
})

for(const study of ['','?study=flow'])test(`live reduced-motion preference stops ${study||'Journey'} immediately`,async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/'+study)
 if(!study){await page.getByRole('button',{name:'이 상황으로 시작',exact:true}).click();await page.getByTestId('journey-primary').click();await page.getByRole('button',{name: /^(?:다음 · )?시연 event: 통화 연결 확인$/,exact:true}).click()}
 else await page.getByTestId('flow-primary').click()
 await page.getByTestId(study?'flow-primary':'journey-primary').click()
 await expect(page.getByTestId('flow-board')).toHaveAttribute('data-moving','true')
 await page.emulateMedia({reducedMotion:'reduce'})
 await expect(page.getByTestId('flow-board')).toHaveAttribute('data-quiet','true')
 await expect(page.getByTestId('flow-board')).toHaveAttribute('data-moving','false')
 await expect(page.getByTestId('flow-board')).toHaveAttribute('data-layout','evacuate')
 await page.emulateMedia({reducedMotion:'no-preference'})
 await expect(page.getByTestId('flow-board')).toHaveAttribute('data-quiet','false')
})
