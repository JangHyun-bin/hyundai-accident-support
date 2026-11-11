import {test,expect} from '@playwright/test'

test('known immobility remains an attention state instead of becoming unknown',async({page})=>{
  await page.goto('/?study=vehicle')
  const state=await page.evaluate(async()=>{
    const sessionPath='/src/emergency/session.ts',casePath='/src/journey/case.ts',viewPath='/src/journey/vehicle-state.ts'
    const {createSession}=await import(/* @vite-ignore */ sessionPath) as typeof import('../src/emergency/session')
    const {createCase}=await import(/* @vite-ignore */ casePath) as typeof import('../src/journey/case')
    const {vehicleContourState}=await import(/* @vite-ignore */ viewPath) as typeof import('../src/journey/vehicle-state')
    return vehicleContourState(createCase(createSession('SC02'),'immobility-test',new Date().toISOString()))
  })
  expect(state.mobility).toEqual({value:'이동 불가',tone:'failed'})
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
  await expect(hazard).toContainText('사용자 확인')
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
      const layout=await page.locator('[data-care-component="vehicle-contour"]').evaluate(root=>{
        const labels=[...root.querySelectorAll('.ac-contour-label')].map(n=>n.getBoundingClientRect())
        const overlap=labels.some((a,i)=>labels.some((b,j)=>j>i&&a.left<b.right&&b.left<a.right&&a.top<b.bottom&&b.top<a.bottom))
        const clipped=[...root.querySelectorAll('.ac-contour-label')].some(n=>n.scrollWidth>n.clientWidth+1)
        return {overlap,clipped,overflow:document.documentElement.scrollWidth>innerWidth+1}
      })
      expect(layout,`${width}px / ${textSize}px / ${direction}`).toEqual({overlap:false,clipped:false,overflow:false})
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
