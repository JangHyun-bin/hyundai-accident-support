import {expect,test} from '@playwright/test'

test('material is isolated from flat text and icons; agency rows align',async({page})=>{
  await page.goto('/?study=emergency&scenario=SC01&scene=connected')
  const root=page.locator('.emergency-screen')
  const result=await root.evaluate(root=>{
    const rows=[...root.querySelectorAll('[data-request]')].map(n=>{const r=n.getBoundingClientRect();return {top:r.top,height:r.height,label:n.querySelector('dt')!.getBoundingClientRect().top,status:n.querySelector('dd')!.getBoundingClientRect().top}})
    const textInEffects=root.querySelectorAll('.rs-material :is(h1,h2,p,button)').length
    const filtered=[...root.querySelectorAll('h1,h2,button,svg.lucide')].filter(n=>getComputedStyle(n).filter!=='none').length
    return {rows,textInEffects,filtered}
  })
  expect(result.textInEffects).toBe(0);expect(result.filtered).toBe(0)
  for(const key of ['top','height','label','status'] as const){const values=result.rows.map(r=>r[key]);expect(Math.max(...values)-Math.min(...values)).toBeLessThan(1)}
  await expect(root.locator('[data-care-slot=primary] .rs-material')).toBeVisible()
})

test('legacy material parameter does not override the selected global theme',async({page})=>{
  await page.setViewportSize({width:375,height:900})
  await page.goto('/?study=emergency&material=satin&scenario=SC01&scene=connected')
  await expect(page.getByRole('heading',{name:'119 통화 연결됨',exact:true})).toBeVisible()
  await expect.poll(()=>new URL(page.url()).searchParams.get('material')).toBeNull()
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
})
