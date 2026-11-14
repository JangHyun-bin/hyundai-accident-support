import {test,expect,type Page} from '@playwright/test'

test('known immobility remains an attention state instead of becoming unknown',async({page})=>{
  await page.goto('/?study=vehicle')
  const state=await page.evaluate(async()=>{
    const sessionPath='/src/emergency/session.ts',casePath='/src/journey/case.ts',viewPath='/src/journey/vehicle-state.ts'
    const {createSession}=await import(/* @vite-ignore */ sessionPath) as typeof import('../src/emergency/session')
    const {createCase}=await import(/* @vite-ignore */ casePath) as typeof import('../src/journey/case')
    const {vehicleContourState}=await import(/* @vite-ignore */ viewPath) as typeof import('../src/journey/vehicle-state')
    return vehicleContourState(createCase(createSession('SC02'),'immobility-test',new Date().toISOString()))
  })
  expect(state.mobility).toEqual({value:'이동 불가',tone:'failed',source:'예시 자료'})
})

test('unknown and conflicting directions do not highlight a vehicle location',async({page})=>{
  await page.goto('/?study=vehicle')
  const contour=page.locator('[data-care-component="vehicle-contour"]')
  await expect(contour).toHaveAttribute('data-impact-direction','우측 전방')
  await expect(contour.locator('[data-vehicle-impact]')).toHaveCount(1)
  await expect(contour).toContainText('가능 여부 미확인')
  await page.getByRole('button',{name:'전체 미확인',exact:true}).click()
  await expect(contour.locator('[data-vehicle-impact],[data-vehicle-hazards]')).toHaveCount(0)
  await expect(contour.locator('[data-vehicle-part="비상등"]')).toContainText('미확인')
  await expect(contour).toContainText('가능 여부 미확인')
  await page.getByRole('button',{name:'정보 충돌',exact:true}).click()
  await expect(contour.locator('[data-vehicle-impact]')).toHaveCount(0)
  await expect(contour.locator('[data-vehicle-part="충격 방향"]')).toContainText('정보 확인 필요')
})

test('part states distinguish requested, user confirmed, fixture confirmed and unavailable',async({page})=>{
  await page.goto('/?study=vehicle')
  const hazard=page.locator('[data-vehicle-part="비상등"]')
  await expect(hazard).toContainText('예시 자료')
  await page.getByLabel('예시 비상등 상태').selectOption('requested')
  await expect(hazard).toContainText('확인 중')
  await expect(page.locator('[data-vehicle-hazards]')).toHaveCount(0)
  await page.getByLabel('예시 비상등 상태').selectOption('user-confirmed')
  await expect(hazard).toContainText('켜짐')
  await expect(hazard).toContainText('직접 확인')
  await expect(hazard).not.toContainText('차량 확인')
  await page.getByLabel('예시 트렁크 상태').selectOption('unavailable')
  await expect(page.locator('[data-vehicle-part="트렁크"]')).toContainText('지금 할 수 없음')
})

test('all directions retain readable callouts across viewport and text sizes',async({page})=>{
  const errors:string[]=[]
  page.on('pageerror',error=>errors.push(error.message))
  await page.goto('/?study=vehicle')
  await page.getByLabel('예시 트렁크 상태').selectOption('unavailable')
  for(const [width,textSize] of [[1920,16],[1440,16],[393,16],[360,16],[1440,32],[393,32]]){
    await page.setViewportSize({width,height:1050})
    await page.evaluate(size=>{document.documentElement.style.fontSize=size+'px'},textSize)
    for(const direction of ['전방','우측 전방','우측','우측 후방','후방','좌측 후방','좌측','좌측 전방']){
      await page.getByLabel('예시 충격 방향').selectOption(direction)
      await expect(page.getByRole('img',{name:direction+' 충격 방향',exact:true})).toBeVisible()
      await expect.poll(()=>page.locator('[data-care-component="vehicle-contour"]').evaluate(root=>{
        const labels=[...root.querySelectorAll('.ac-contour-label')].map(n=>n.getBoundingClientRect())
        const overlap=labels.some((a,i)=>labels.some((b,j)=>j>i&&a.left<b.right&&b.left<a.right&&a.top<b.bottom&&b.top<a.bottom))
        const clipped=[...root.querySelectorAll('.ac-contour-label')].some(n=>n.scrollWidth>n.clientWidth+1)
        return {overlap,clipped,overflow:document.documentElement.scrollWidth>innerWidth+1}
      }),{message:`${width}px / ${textSize}px / ${direction}`}).toEqual({overlap:false,clipped:false,overflow:false})
    }
  }
  expect(errors).toEqual([])
})

test('selecting a part slides the car aside and closing restores the origin and focus',async({page})=>{
  await page.goto('/?study=vehicle')
  await expect(page.getByText('움직일 수 있으면',{exact:true})).toHaveCount(0)
  const car=page.locator('.ac-contour-car')
  const initial=(await car.boundingBox())!.x
  const trigger=page.getByRole('button',{name:'충격 방향 자세히 보기',exact:true})
  await trigger.click()
  const detail=page.getByRole('region',{name:'차량 상태 상세'})
  await expect(detail).toBeVisible()
  await expect(detail.getByRole('heading',{name:'충격 방향',exact:true})).toBeFocused()
  await expect(detail).toContainText('차량 앞쪽 오른편에서 확인된 충격이에요.')
  await expect.poll(async()=>(await car.boundingBox())!.x).toBeLessThan(initial-70)
  await detail.getByRole('tab',{name:'트렁크',exact:true}).click()
  await expect(detail).toContainText('트렁크의 열림 여부가 아직 확인되지 않았어요.')
  await detail.getByRole('button',{name:'전체 보기',exact:true}).click()
  await expect(detail).toBeHidden()
  await expect(trigger).toBeFocused()
  await expect.poll(async()=>Math.abs((await car.boundingBox())!.x-initial)).toBeLessThan(1)
})

test('details support keyboard tabs and live state changes without asserting confirmation',async({page})=>{
  await page.goto('/?study=vehicle')
  const trigger=page.getByRole('button',{name:'비상등 자세히 보기',exact:true})
  await trigger.focus();await page.keyboard.press('Enter')
  const detail=page.getByRole('region',{name:'차량 상태 상세'})
  await expect(detail).toContainText('비상등 작동이 확인됐어요.')
  await page.getByLabel('예시 비상등 상태').selectOption('requested')
  await expect(detail).toContainText('비상등 작동 확인을 기다리고 있어요.')
  await expect(page.locator('[data-vehicle-hazards]')).toHaveCount(0)
  await detail.getByRole('tab',{name:'비상등',exact:true}).focus()
  await page.keyboard.press('ArrowRight')
  await expect(detail.getByRole('tab',{name:'트렁크',exact:true})).toBeFocused()
  await expect(detail.getByRole('tab',{name:'트렁크',exact:true})).toHaveAttribute('aria-selected','true')
  await page.keyboard.press('Escape')
  await expect(detail).toBeHidden()
  await expect(trigger).toBeFocused()
})

test('expanded details fit mobile, enlarged text and reduced motion',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'})
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message))
  await page.goto('/?study=vehicle')
  await page.getByRole('button',{name:'트렁크 자세히 보기',exact:true}).click()
  const detail=page.getByRole('region',{name:'차량 상태 상세'})
  for(const [width,size] of [[1440,16],[393,16],[360,16],[1440,32],[393,32]]){
    await page.setViewportSize({width,height:1050})
    await page.evaluate(value=>{document.documentElement.style.fontSize=value+'px'},size)
    for(const name of ['트렁크','비상등','충격 방향']){
      await detail.getByRole('tab',{name,exact:true}).click()
      await expect(detail.getByRole('heading',{name,exact:true})).toBeVisible()
      const dimensions=await detail.evaluate(node=>{
        const box=node.getBoundingClientRect(),car=node.parentElement!.querySelector('.ac-contour-car')!.getBoundingClientRect()
        return {overflow:document.documentElement.scrollWidth>innerWidth+1,clipped:node.scrollWidth>node.clientWidth+1,overlap:box.left<car.right&&car.left<box.right&&box.top<car.bottom&&car.top<box.bottom}
      })
      expect(dimensions,`${width}px / ${size}px / ${name}`).toEqual({overflow:false,clipped:false,overlap:false})
    }
  }
  expect(errors).toEqual([])
})

// The fixture module loads only after the React refresh preamble is installed, hence the import inside the page script.
const cellsPage=`<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;background:#09090c}.vcp{padding:32px;box-sizing:border-box}.vcp-event{margin-bottom:16px}.vcp-wrap{position:relative}.vcp-board{display:flex;gap:32px;align-items:flex-start}.vcp-column,.vcp-pair{display:grid;gap:24px;justify-items:start;align-content:start}.vcp-pair{gap:12px}.vcp-caption{color:#777;font:20px/1.2 ui-monospace,monospace}.vcp-cell .ac-solid-source,.vcp-cell .ac-material-idle{background:var(--ac-control);box-shadow:none}.vcp-body.fs-cell-body{position:relative}</style></head><body><div id="host"></div><script type="module">
import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;
await import('/tests/fixtures/vehicle-cells.tsx');
</script></body></html>`

async function openCells(page:Page){
  await page.setViewportSize({width:2560,height:1440})
  await page.route('**/vehicle-cells-fixture',route=>route.fulfill({contentType:'text/html',body:cellsPage}))
  await page.goto('/vehicle-cells-fixture')
  await expect(page.locator('.vc-scene').first()).toBeVisible()
  await page.evaluate(()=>document.fonts.ready)
}
const fullColumn=(page:Page,state:string)=>page.locator(`.vcp-column[data-variant=full][data-state=${state}]`)

test('vehicle cells show only case values and turn warm only when something needs attention',async({page})=>{
  await openCells(page)
  const unknown=fullColumn(page,'unknown'),normal=fullColumn(page,'normal'),attention=fullColumn(page,'attention')
  for(const row of ['impact','airbag','hazard','trunk'])await expect(unknown.locator(`[data-vehicle-row="${row}"] dd`)).toHaveText('미확인')
  await expect(unknown.locator('[data-vehicle-row="mobility"] dd')).toHaveText('가능 여부 미확인')
  await expect(unknown.locator('.vc-detail')).not.toContainText('예시 자료')
  await expect(unknown.locator('[data-scene-contact]')).toHaveCount(0)
  for(const text of ['우측 전방','예시 자료'])await expect(normal.locator('[data-vehicle-row="impact"] dd')).toContainText(text)
  await expect(normal.locator('[data-vehicle-note="road"]')).toContainText('고속도로')
  await expect(normal.locator('[data-scene-contact]')).toHaveCount(1)
  for(const column of [unknown,normal])await expect(column.locator('.vc-detail')).toHaveAttribute('data-attention','false')
  await expect(attention.locator('.vc-detail')).toHaveAttribute('data-attention','true')
  await expect(attention.locator('[data-cell=vehicle]')).toHaveAttribute('data-care-surface','call')
  await expect(attention.locator('[data-vehicle-row="airbag"] dd')).toContainText('펼쳐짐')
  await expect(attention.locator('[data-vehicle-note="risk"]')).toHaveText('새로운 위험 감지')
  await expect(attention.locator('.vc-chips')).toContainText('새로운 위험 감지')
  await expect(attention.locator('[data-request="rescue"] dd')).toContainText('접수 미확인')
  for(const cell of await page.locator('.vcp-column[data-variant=full] .vc-cell').all())expect(await cell.evaluate(node=>node.scrollHeight<=node.clientHeight+1)).toBe(true)
})

test('scene timeline scrubs from five seconds before contact to now and marks contact only after it',async({page})=>{
  await openCells(page)
  const scene=fullColumn(page,'normal').locator('.vc-scene'),slider=scene.getByRole('slider',{name:'사고 장면 시점'})
  await expect(slider).toHaveAttribute('aria-valuetext','지금')
  await expect(scene.locator('.ss-source')).toHaveText('현재 · 시연')
  await slider.focus();await page.keyboard.press('Home')
  await expect(slider).toHaveAttribute('aria-valuetext','충돌 5.0초 전')
  await expect(scene.locator('.ss-source')).toHaveText('사고 재생 · 시연')
  await expect(scene.locator('[data-scene-contact]')).toHaveCount(0)
  await slider.fill('0')
  await expect(slider).toHaveAttribute('aria-valuetext','충돌')
  await expect(scene.locator('[data-scene-contact]')).toHaveCount(1)
})

test('expand covers the board with the full surroundings and hands focus back',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'})
  await openCells(page)
  const scene=fullColumn(page,'normal').locator('.vc-scene'),board=page.locator('.fs-board'),dialog=page.getByRole('dialog',{name:'주변 상황'})
  const expand=scene.getByRole('button',{name:'주변 상황 크게 보기',exact:true})
  await expand.click()
  await expect(dialog.locator('.ss-surface')).toHaveAttribute('data-scene-view','current')
  const [cover,wrap]=[await dialog.boundingBox(),await page.locator('.fs-board-wrap').boundingBox()]
  for(const key of ['x','y','width','height'] as const)expect(Math.abs(cover![key]-wrap![key])).toBeLessThanOrEqual(1)
  expect(await board.evaluate(node=>node instanceof HTMLElement&&node.inert)).toBe(true)
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(expand).toBeFocused()
  expect(await board.evaluate(node=>node instanceof HTMLElement&&node.inert)).toBe(false)
  await scene.getByRole('slider',{name:'사고 장면 시점'}).fill('0')
  await expand.click()
  await expect(dialog.locator('.ss-surface')).toHaveAttribute('data-scene-view','replay')
  await expect(dialog.getByRole('slider',{name:'사고 시점 이동'})).toHaveValue('0')
  await dialog.getByRole('button',{name:'닫기',exact:true}).click()
  await expect(dialog).toHaveCount(0)
  await scene.getByRole('button',{name:'내 차량 상태 보기',exact:true}).click()
  await expect(dialog.locator('.ss-surface')).toHaveAttribute('data-scene-view','vehicle')
  await page.getByRole('button',{name:'시연: 정상 상태에 위험 추가',exact:true}).click()
  await expect(dialog).toHaveCount(0)
  await expect(scene.locator('.vc-chips')).toContainText('새로운 위험 감지')
})

test('compact cells keep one line and lead with what needs attention',async({page})=>{
  await openCells(page)
  for(const cell of await page.locator('.vcp-pair .vc-cell').all())expect(await cell.evaluate(node=>node.scrollHeight<=node.clientHeight+1)).toBe(true)
  const normal=page.locator('.vcp-pair[data-state=normal]'),attention=page.locator('.vcp-pair[data-state=attention]')
  expect(await normal.locator('.vc-scene .vc-title>span').evaluate(node=>node.scrollWidth<=node.clientWidth)).toBe(true)
  await expect(attention.locator('.vc-scene .vc-line')).toHaveText('새로운 위험 감지')
  const reason=attention.locator('.vc-detail .vc-line>.vc-pair').first()
  await expect(reason).toContainText('펼쳐짐')
  expect(await reason.evaluate(node=>{const box=node.getBoundingClientRect(),line=node.parentElement!.getBoundingClientRect();return box.top>=line.top-1&&box.bottom<=line.bottom+1})).toBe(true)
})
