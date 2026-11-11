import {test,expect,type Page} from '@playwright/test'

async function openSurroundings(page:Page){
  await page.goto('/?study=surroundings')
  await page.getByRole('button',{name:'주변 상황 보기',exact:true}).click()
}

test('replay timeline labels remain separate with enlarged mobile text',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'})
  await page.goto('/?study=surroundings&view=replay')
  const labels=page.locator('.ss-time-labels>span')
  await expect(labels).toHaveText(['−08초','충격 00초','+06초'])
  for(const [width,font] of [[1440,16],[393,16],[360,32],[393,32]]){
    await page.setViewportSize({width,height:852})
    await page.evaluate(size=>{document.documentElement.style.fontSize=size+'px'},font)
    await expect.poll(()=>labels.evaluateAll(nodes=>{
      const rects=nodes.map(node=>node.getBoundingClientRect())
      return rects.some((a,i)=>rects.slice(i+1).some(b=>a.left<b.right&&b.left<a.right&&a.top<b.bottom&&b.top<a.bottom))
    }),{message:`Timeline labels at ${width}px / ${font}px`}).toBe(false)
  }
})

test('own vehicle is the home view and surroundings has one explicit entry',async({page})=>{
  await page.goto('/?study=surroundings')
  const surface=page.locator('.ss-surface')
  const car=page.locator('[data-scene-car="own"] .ac-contour-car')
  await expect(surface).toHaveAttribute('data-scene-focus','vehicle')
  await expect(surface.getByRole('heading',{name:'내 차 상태',exact:true})).toBeVisible()
  await expect(page.getByRole('button',{name:'주변 상황 보기',exact:true})).toHaveCount(1)
  await expect(page.getByRole('button',{name:'사고 재생',exact:true})).toHaveCount(0)
  await expect(page.getByRole('button',{name:'현재 주변',exact:true})).toHaveCount(0)
  for(const part of ['충격 방향','비상등','트렁크'])await expect(page.getByRole('button',{name:part+' 자세히 보기',exact:true})).toBeVisible()
  await expect.poll(async()=>{
    const body=(await car.boundingBox())!,scene=(await page.locator('.ss-scene').boundingBox())!
    return body.height/scene.height
  }).toBeGreaterThan(.7)
  const identity=await car.locator('.ac-contour-body').getAttribute('fill')
  expect(identity).toMatch(/^url\(#.+-body\)$/)
  await page.getByRole('button',{name:'주변 상황 보기',exact:true}).click()
  await expect(surface).toHaveAttribute('data-scene-focus','surroundings')
  await expect(page.getByRole('button',{name:'현재 주변',exact:true})).toBeFocused()
  await expect(page.getByRole('button',{name:'사고 재생',exact:true})).toBeVisible()
  await expect.poll(async()=>{
    const body=(await car.boundingBox())!,scene=(await page.locator('.ss-scene').boundingBox())!
    return body.height/scene.height
  }).toBeLessThan(.55)
  expect(await car.locator('.ac-contour-body').getAttribute('fill')).toBe(identity)
  await page.getByRole('button',{name:'내 차 상태로',exact:true}).click()
  await expect(surface).toHaveAttribute('data-scene-focus','vehicle')
  await expect(surface.getByRole('heading',{name:'내 차 상태',exact:true})).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(surface).toHaveAttribute('data-scene-focus','vehicle')
})

test('current scene keeps moving after reselecting its mode and freezes on lost signal',async({page})=>{
  await openSurroundings(page)
  const passing=page.locator('.ss-passing [data-scene-car]')
  const position=()=>passing.getAttribute('transform')
  const initial=await position()
  await expect.poll(position).not.toBe(initial)
  await page.getByRole('button',{name:'현재 주변',exact:true}).click()
  const reselected=await position()
  await expect.poll(position).not.toBe(reselected)
  await page.getByRole('button',{name:'신호 끊김 시연',exact:true}).click()
  const frozen=await position()
  await page.waitForTimeout(200)
  expect(await position()).toBe(frozen)
  await expect(page.locator('.ss-source')).toContainText('신호 없음')
  await page.getByRole('button',{name:'신호 복원',exact:true}).click()
  await expect.poll(position).not.toBe(frozen)
})

test('replay scrubs, marks estimates and contact, and stays independent from live signal',async({page})=>{
  await openSurroundings(page)
  await page.getByRole('button',{name:'사고 재생',exact:true}).click()
  const slider=page.getByRole('slider',{name:'사고 시점 이동'})
  await expect(slider).toHaveValue('-8')
  await expect(page.locator('[data-scene-car="own"] .ac-contour-hazards')).toHaveCount(0)
  await page.getByRole('button',{name:'충격 시점',exact:true}).click()
  await expect(slider).toHaveValue('0')
  await expect(page.locator('[data-contact-marker]')).toBeVisible()
  await slider.focus()
  for(let i=0;i<60;i++)await page.keyboard.press('ArrowLeft')
  await expect(slider).toHaveValue('-3')
  await expect(page.locator('.ss-car-estimated')).toBeVisible()
  await page.getByRole('combobox',{name:'사고 재생 속도'}).selectOption('2')
  await page.getByRole('button',{name:'사고 재생 시작',exact:true}).click()
  await expect.poll(()=>slider.inputValue()).not.toBe('-3')
  await page.getByRole('button',{name:'신호 끊김 시연',exact:true}).click()
  const time=await slider.inputValue()
  await expect.poll(()=>slider.inputValue()).not.toBe(time)
  await page.getByRole('button',{name:'사고 재생 일시정지',exact:true}).click()
  await slider.focus();await page.keyboard.press('End')
  await expect(slider).toHaveValue('6')
  await page.keyboard.press('ArrowLeft')
  await page.getByRole('button',{name:'사고 재생 시작',exact:true}).click()
  await expect(slider).toHaveValue('6')
  await expect(page.getByRole('button',{name:'사고 재생 시작',exact:true})).toBeVisible()
  await page.getByRole('button',{name:'현재로 돌아가기',exact:true}).click()
  await expect(slider).toHaveCount(0)
  await expect(page.locator('.ss-source')).toContainText('신호 없음')
  await expect(page.locator('.vcs-response')).toContainText('119 통화 연결됨')
})

test('the same car zooms into view and details slide aside with keyboard return',async({page})=>{
  await openSurroundings(page)
  await page.getByRole('button',{name:'사고 재생',exact:true}).click()
  await page.getByRole('button',{name:'충격 시점',exact:true}).click()
  const car=page.locator('[data-scene-car="own"] .ac-contour-car')
  await page.getByRole('button',{name:'내 차량 상태 보기',exact:true}).click()
  await expect.poll(async()=>{
    const body=(await car.boundingBox())!,area=(await page.locator('.ss-scene').boundingBox())!
    return body.height/area.height
  }).toBeGreaterThan(.7)
  const centered=(await car.boundingBox())!
  const stage=(await page.locator('.ss-scene').boundingBox())!
  expect(centered.x).toBeGreaterThan(stage.x)
  expect(centered.y).toBeGreaterThan(stage.y)
  expect(centered.y+centered.height).toBeLessThan(stage.y+stage.height)
  const trigger=page.getByRole('button',{name:'충격 방향 자세히 보기',exact:true})
  await trigger.click()
  const detail=page.getByRole('region',{name:'차량 부위 상세'})
  await expect(detail.getByRole('heading',{name:'충격 방향',exact:true})).toBeFocused()
  await expect.poll(async()=>(await car.boundingBox())!.x).toBeLessThan(centered.x-50)
  await page.keyboard.press('Escape')
  await expect(detail).toHaveCount(0)
  await expect(trigger).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.locator('.ss-surface')).toHaveAttribute('data-scene-focus','vehicle')
  await page.getByRole('button',{name:'주변 상황 보기',exact:true}).click()
  await expect(page.locator('.ss-surface')).toHaveAttribute('data-scene-mode','current')
  await page.getByRole('button',{name:'사고 재생',exact:true}).click()
  await expect(page.getByRole('slider',{name:'사고 시점 이동'})).toHaveValue('0')
})

test('reduced motion, mobile and enlarged text keep details readable',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'})
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message))
  await openSurroundings(page)
  await expect(page.getByRole('button',{name:'주변 움직임 재생',exact:true})).toBeVisible()
  for(const [width,font] of [[1920,16],[1440,16],[393,16],[360,16],[1440,32],[393,32]]){
    await page.setViewportSize({width,height:1050})
    await page.evaluate(size=>{document.documentElement.style.fontSize=size+'px'},font)
    await expect.poll(async()=>{
      const car=(await page.locator('[data-scene-car="own"] .ac-contour-car').boundingBox())!
      const area=(await page.locator('.ss-scene').boundingBox())!
      return car.height/area.height
    },{message:`Default car framing at ${width}px / ${font}px`}).toBeGreaterThan(.42)
    await page.getByRole('button',{name:'내 차 상태로',exact:true}).click()
    await page.getByRole('button',{name:'트렁크 자세히 보기',exact:true}).click()
    await expect(page.getByRole('region',{name:'차량 부위 상세'})).toContainText('아직 확인되지 않았어요')
    const layout=()=>page.evaluate(()=>{
      const detail=document.querySelector('.ss-part-detail')!,d=detail.getBoundingClientRect()
      const c=document.querySelector('[data-scene-car="own"] .ac-contour-car')!.getBoundingClientRect()
      const f=document.querySelector('.ss-focus-footer')!.getBoundingClientRect()
      return {overflow:document.documentElement.scrollWidth>innerWidth+1,clipped:detail.scrollWidth>detail.clientWidth+1,overlap:d.left<c.right&&c.left<d.right&&d.top<c.bottom&&c.top<d.bottom,footerOverlap:d.bottom>f.top}
    })
    await expect.poll(layout,{message:`${width}px / ${font}px`}).toEqual({overflow:false,clipped:false,overlap:false,footerOverlap:false})
    await page.getByRole('button',{name:'주변 상황 보기',exact:true}).click()
  }
  expect(errors).toEqual([])
})

test('contact contours reveal the selected annotation and never appear before contact',async({page})=>{
  await openSurroundings(page)
  const trigger=page.getByRole('button',{name:'접촉 부위 자세히 보기',exact:true})
  const detail=page.getByRole('region',{name:'접촉 부위 설명'})
  await expect(page.locator('[data-contact-edge]')).toHaveCount(2)
  await trigger.focus();await page.keyboard.press('Enter')
  await expect(detail).toContainText('접촉 기록')
  await expect(detail).toContainText('우측 전방')
  await expect(trigger).toHaveAttribute('aria-expanded','true')
  await expect(page.locator('.ss-surface')).toHaveAttribute('data-scene-focus','surroundings')
  await page.keyboard.press('Escape')
  await expect(detail).toHaveCount(0)
  await expect(trigger).toBeFocused()
  await page.getByRole('button',{name:'사고 재생',exact:true}).click()
  await expect(trigger).toHaveCount(0)
  await page.getByRole('button',{name:'충격 시점',exact:true}).click()
  await page.getByRole('button',{name:'사고 재생 시작',exact:true}).click()
  await trigger.click()
  await expect(detail).toBeVisible()
  await expect(page.getByRole('button',{name:'사고 재생 시작',exact:true})).toBeVisible()
  const slider=page.getByRole('slider',{name:'사고 시점 이동'})
  const time=await slider.inputValue();await page.waitForTimeout(150)
  await expect(slider).toHaveValue(time)
  await slider.focus();await page.keyboard.press('Home')
  await expect(trigger).toHaveCount(0)
  await expect(detail).toHaveCount(0)
  await page.keyboard.press('End')
  await expect(trigger).toBeVisible()
  await expect(trigger).toHaveAttribute('aria-expanded','false')
})

test('contact annotations fit mobile and enlarged text with a consistent touch target',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'})
  await openSurroundings(page)
  const trigger=page.getByRole('button',{name:'접촉 부위 자세히 보기',exact:true})
  const detail=page.getByRole('region',{name:'접촉 부위 설명'})
  for(const [width,font] of [[1920,16],[1440,16],[393,16],[360,16],[1440,32],[393,32]]){
    await page.setViewportSize({width,height:1050})
    await page.evaluate(size=>{document.documentElement.style.fontSize=size+'px'},font)
    await trigger.click()
    await expect.poll(()=>detail.evaluate(node=>{
      const d=node.getBoundingClientRect(),root=node.closest('.ss-visual')!.getBoundingClientRect(),legend=node.parentElement!.querySelector('.ss-scene-key')!.getBoundingClientRect()
      const hit=node.parentElement!.querySelector('.ac-contact-hit')!.getBoundingClientRect()
      return {inside:d.left>=root.left-1&&d.right<=root.right+1&&d.bottom<=root.bottom+1,overflow:document.documentElement.scrollWidth>innerWidth+1,clipped:node.scrollWidth>node.clientWidth+1,legendOverlap:d.left<legend.right&&legend.left<d.right&&d.top<legend.bottom&&legend.top<d.bottom,touch:Math.abs(hit.width-64)<1&&Math.abs(hit.height-64)<1}
    }),{message:`Contact at ${width}px / ${font}px`}).toEqual({inside:true,overflow:false,clipped:false,legendOverlap:false,touch:true})
    await page.getByRole('button',{name:'접촉 설명 닫기'}).click()
    await expect(detail).toHaveCount(0)
    await expect(trigger).toBeFocused()
  }
})
