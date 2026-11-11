import {expect,test} from '@playwright/test'

async function beginCatalog(page:import('@playwright/test').Page,device='vehicle') {
  await page.goto('/?study=journey-catalog&fixture=partial-evidence&device='+device)
  const preview=page.getByRole('region',{name:'Journey workspace preview'})
  await preview.getByRole('button',{name:'이 상황으로 시작',exact:true}).click()
  return preview
}

test('catalog operates actual vehicle, recording and review components',async({page})=>{
  const preview=await beginCatalog(page)
  await preview.getByRole('button',{name:'차량 상태 보기',exact:true}).click()
  await expect(preview.getByRole('heading',{name:'차량에서 확인한 내용',exact:true})).toBeVisible()
  await preview.getByRole('button',{name:'대응 화면으로',exact:true}).click()
  await preview.getByRole('button',{name:'사고 기록 남기기',exact:true}).click()
  await expect(preview.getByRole('button',{name:'말로 기록하기',exact:true})).toBeVisible()
  await preview.getByRole('button',{name:'내용 확인으로',exact:true}).click()
  await expect(preview.getByRole('heading',{name:'남겨진 자료를 살펴보세요',exact:true})).toBeVisible()
})
for(const width of [360,393])test(`mobile catalog ${width}px keeps real report readable at 200% text`,async({page})=>{
  await page.setViewportSize({width,height:852});await page.emulateMedia({reducedMotion:'reduce'})
  const preview=await beginCatalog(page,'mobile')
  await preview.getByRole('button',{name:'사고 기록 남기기',exact:true}).click()
  await preview.getByRole('button',{name:'내용 확인으로',exact:true}).click()
  await preview.getByRole('button',{name:'경위서',exact:true}).click()
  await page.addStyleTag({content:'html{font-size:200%}'})
  const next=preview.getByRole('button',{name:'보낼 내용 확인',exact:true})
  await next.scrollIntoViewIfNeeded();await expect(next).toBeVisible()
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  expect(await next.evaluate(n=>n.scrollWidth<=n.clientWidth)).toBe(true)
  const surface=preview.locator('.journey-surface:visible')
  await expect(surface).toHaveCSS('word-break','keep-all')
  expect(await surface.evaluate(n=>n.getAnimations({subtree:true}).filter(a=>a.effect?.getTiming().iterations===Infinity).length)).toBe(0)
})

test('vehicle workspace fits wide and smaller desktop without scaling text',async({page})=>{
  for(const width of [2560,1440]){
    await page.setViewportSize({width,height:1500})
    const preview=await beginCatalog(page)
    await preview.getByRole('button',{name:'차량 상태 보기',exact:true}).click()
    const shell=preview.locator('[data-care-component=vehicle-shell]:visible')
    await expect(shell).toHaveCSS('transform','none')
    expect((await shell.boundingBox())!.width).toBeLessThanOrEqual(width)
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  }
})
