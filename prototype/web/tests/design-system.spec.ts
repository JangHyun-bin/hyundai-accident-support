import {expect, test} from '@playwright/test'

test('catalog exposes actual semantic components and the selected material', async ({page}) => {
  await page.goto('/?study=design-system')
  await expect(page.getByRole('heading', {name:'AFTER / CARE design system', exact:true})).toBeVisible()
  await expect(page.locator('[data-care-component="status"]')).toHaveCount(5)
  await expect(page.locator('[data-care-surface="call"]')).toBeVisible()
  await expect(page.locator('[data-care-surface="safety"]')).toBeVisible()
  await expect(page.locator('[data-care-surface="call"] feImage[result="grain"]')).toHaveCount(1)
})

test('applying a theme updates another tab while preserving named presets and draft', async ({page,context}) => {
  await page.goto('/?study=design-system')
  await expect(page.locator('[data-care-surface="call"]')).toBeVisible()
  const other=await context.newPage();await other.goto('/?study=design-system')
  const before=await page.evaluate(async () => {
    const path='/src/design-system/surfaces.ts'
    const {originalSurfaces}=await import(path)
    const raw=JSON.stringify({version:1,draft:originalSurfaces,presets:[{name:'C',surfaces:originalSurfaces},{name:'C_02',surfaces:originalSurfaces}]})
    localStorage.setItem('response-surface-study-v1',raw)
    const themePath='/src/design-system/SurfaceTheme.tsx'
    const {applySurfaceTheme,readAppliedTheme}=await import(themePath)
    const pair=readAppliedTheme().surfaces
    pair.call.top='#aabbcc'
    if(!applySurfaceTheme(pair).ok)throw new Error('apply failed')
    return raw
  })
  for(const tab of [page,other])await expect.poll(()=>tab.locator('[data-care-surface="call"]').evaluate(n=>getComputedStyle(n).getPropertyValue('--rs-gradient'))).toContain('#aabbcc')
  await other.reload()
  await expect.poll(()=>other.locator('[data-care-surface="call"]').evaluate(n=>getComputedStyle(n).getPropertyValue('--rs-gradient'))).toContain('#aabbcc')
  expect(await page.evaluate(()=>localStorage.getItem('response-surface-study-v1'))).toBe(before)
})

test('invalid stored theme remains intact and reports fallback; invalid input cannot replace it', async ({page}) => {
  await page.addInitScript(()=>localStorage.setItem('after-care-theme-v1','{"version":1,"surfaces":null}'))
  await page.goto('/?study=design-system')
  await expect(page.getByRole('status')).toContainText('적용한 theme를 읽지 못했어요')
  const result=await page.evaluate(async()=>{
    const path='/src/design-system/SurfaceTheme.tsx'
    const {applySurfaceTheme}=await import(path)
    return {result:applySurfaceTheme({call:{grain:Infinity}}),raw:localStorage.getItem('after-care-theme-v1')}
  })
  expect(result.result.ok).toBe(false)
  expect(result.raw).toBe('{"version":1,"surfaces":null}')
})

test('catalog supports 200% text and reduced motion on mobile', async ({page}) => {
  await page.setViewportSize({width:393,height:852})
  await page.emulateMedia({reducedMotion:'reduce'})
  await page.goto('/?study=design-system')
  await expect(page.locator('[data-care-surface="call"]')).toBeVisible()
  await page.addStyleTag({content:'html{font-size:200%}'})
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  expect(await page.locator('.ac-system').evaluate(n=>n.getAnimations({subtree:true}).filter(a=>a.effect?.getTiming().iterations===Infinity).length)).toBe(0)
  for(const target of await page.locator('.ac-action').all()){
    const r=await target.boundingBox();expect(r?.height).toBeGreaterThanOrEqual(48)
  }
})
