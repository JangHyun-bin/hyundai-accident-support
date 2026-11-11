import {test,expect} from '@playwright/test'

const scenes=[{view:'front',title:'전방 상황',label:'전방 시점'},{view:'current',title:'현재 주변 상황',label:'현재 주변'},{view:'replay',title:'사고 재생',label:'사고 재생'}]

test('in-vehicle navigation reaches front from current and replay with one selected view',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'})
  for(const start of ['current','replay']){
    await page.goto(`/?study=surroundings&view=${start}`)
    const views=page.getByRole('group',{name:'주변 view 선택'})
    await expect(views.getByRole('button')).toHaveText(scenes.map(scene=>scene.label))
    if(start==='replay')await page.getByRole('button',{name:'충격 시점',exact:true}).click()
    for(const view of ['front',start,'front']){
      const scene=scenes.find(scene=>scene.view===view)!
      await views.getByRole('button',{name:scene.label,exact:true}).click()
      await expect(page.locator('.ss-surface')).toHaveAttribute('data-scene-view',view)
      await expect(page).toHaveURL(new RegExp(`view=${view}`))
      await expect(views.locator('[aria-pressed=true]')).toHaveText(scene.label)
      if(view==='front')await expect(page.locator('[data-front-car="other"]')).toBeVisible()
      if(view==='replay')await expect(page.getByRole('slider',{name:'사고 시점 이동'})).toHaveValue('0')
    }
  }
})

test('scene pages open directly, reload, and use real links with browser history',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'})
  for(const scene of scenes){
    await page.goto(`/?study=surroundings&view=${scene.view}`)
    await expect(page.getByRole('heading',{level:1,name:scene.title,exact:true})).toBeVisible()
    await expect(page).toHaveTitle(`${scene.title} · B / Contour`)
    const links=page.getByRole('navigation',{name:'상황 page'})
    await expect(links.getByRole('link',{name:scene.label,exact:true})).toHaveAttribute('aria-current','page')
    await page.reload()
    await expect(page.locator('.ss-surface')).toHaveAttribute('data-scene-view',scene.view)
    await expect(page.locator('.vcs-response')).toContainText('119 통화 연결됨')
  }
  const links=page.getByRole('navigation',{name:'상황 page'})
  await links.getByRole('link',{name:'전방 시점',exact:true}).click()
  await expect(page).toHaveURL(/view=front/)
  await links.getByRole('link',{name:'현재 주변',exact:true}).click()
  await expect(page).toHaveURL(/view=current/)
  await page.goBack()
  await expect(page.locator('.ss-surface')).toHaveAttribute('data-scene-view','front')
  await page.getByRole('button',{name:'내 차 상태로',exact:true}).click()
  await expect(links.locator('[aria-current]')).toHaveCount(0)
  await expect(page).toHaveURL(/view=vehicle/)
  await page.goto('/?study=surroundings&view=invalid')
  await expect(page.locator('.ss-surface')).toHaveAttribute('data-scene-view','vehicle')
  await page.goto('/?study=surroundings')
  await expect(page.getByRole('heading',{level:2,name:'내 차 상태',exact:true})).toBeVisible()
})

test('front projection clips rearward traffic, moves, pauses, and freezes with signal',async({page})=>{
  await page.clock.install()
  await page.goto('/?study=surroundings&view=front')
  const other=page.locator('[data-front-car="other"]'),passing=page.locator('[data-front-car="passing"]')
  await expect(other).toBeVisible()
  await expect(other).toHaveAttribute('data-front-face','rear')
  await expect(passing).toHaveCount(0)
  await expect(page.locator('[data-contact-marker]')).toHaveCount(0)
  await expect(page.locator('[data-scene-car="own"]')).toHaveCount(0)
  await page.clock.runFor(8500)
  await expect(passing).toBeVisible()
  const moving=await passing.getAttribute('transform')
  await page.clock.runFor(300)
  expect(await passing.getAttribute('transform')).not.toBe(moving)
  await page.getByRole('button',{name:'주변 움직임 일시정지',exact:true}).click()
  const paused=await passing.getAttribute('transform')
  await page.clock.runFor(500)
  expect(await passing.getAttribute('transform')).toBe(paused)
  await page.getByRole('button',{name:'주변 움직임 재생',exact:true}).click()
  await page.clock.runFor(300)
  expect(await passing.getAttribute('transform')).not.toBe(paused)
  await page.getByRole('button',{name:'신호 끊김 시연',exact:true}).click()
  const frozen=await passing.getAttribute('transform')
  await page.clock.runFor(500)
  expect(await passing.getAttribute('transform')).toBe(frozen)
  await expect(page.locator('.ss-source')).toContainText('신호 없음')
  await page.getByRole('button',{name:'신호 복원',exact:true}).click()
  await page.clock.runFor(300)
  expect(await passing.getAttribute('transform')).not.toBe(frozen)
  await page.getByRole('button',{name:'현재 주변',exact:true}).click()
  const birdPassing=page.locator('.ss-passing [data-scene-car]'),birdPosition=await birdPassing.getAttribute('transform')
  await page.clock.runFor(300)
  expect(await birdPassing.getAttribute('transform')).not.toBe(birdPosition)
})

test('direct replay starts before contact and preserves seek, playback and pause',async({page})=>{
  await page.goto('/?study=surroundings&view=replay')
  const slider=page.getByRole('slider',{name:'사고 시점 이동'})
  await expect(slider).toHaveValue('-8')
  await expect(page.locator('[data-contact-marker]')).toHaveCount(0)
  await page.getByRole('button',{name:'충격 시점',exact:true}).click()
  await expect(slider).toHaveValue('0')
  await expect(page.locator('[data-contact-marker]')).toBeVisible()
  await page.getByRole('button',{name:'사고 재생 시작',exact:true}).click()
  await expect.poll(()=>slider.inputValue()).not.toBe('0')
  await page.getByRole('button',{name:'사고 재생 일시정지',exact:true}).click()
  const paused=await slider.inputValue()
  await page.waitForTimeout(150)
  await expect(slider).toHaveValue(paused)
  await slider.focus();await page.keyboard.press('Home')
  await expect(slider).toHaveValue('-8')
  await expect(page.locator('[data-contact-marker]')).toHaveCount(0)
})

test('scene pages fit mobile and 200 percent text with 48px controls',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'})
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message))
  for(const scene of scenes){
    await page.goto(`/?study=surroundings&view=${scene.view}`)
    for(const [width,font] of [[1600,16],[393,16],[393,32]]){
      await page.setViewportSize({width,height:1050})
      await page.evaluate(size=>{document.documentElement.style.fontSize=size+'px'},font)
      await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),{message:`${scene.view} at ${width}px / ${font}px`}).toBe(true)
      const links=page.getByRole('navigation',{name:'상황 page'}).getByRole('link')
      for(const link of await links.all())expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(48)
      const views=page.getByRole('group',{name:'주변 view 선택'}).getByRole('button')
      await expect(views).toHaveCount(3)
      for(const button of await views.all()){
        await expect(button).toBeVisible()
        const bounds=(await button.boundingBox())!
        expect(bounds.height).toBeGreaterThanOrEqual(48)
        expect(bounds.x).toBeGreaterThanOrEqual(0)
        expect(bounds.x+bounds.width).toBeLessThanOrEqual(width+1)
      }
      if(scene.view==='front')await expect(page.getByRole('button',{name:'주변 움직임 재생',exact:true})).toBeVisible()
    }
  }
  expect(errors).toEqual([])
})
