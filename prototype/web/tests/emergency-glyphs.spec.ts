import {expect,test} from '@playwright/test'

test('flat icons convey state with text and remain outside optical effects',async({page})=>{
  await page.goto('/?study=emergency&scenario=SC05&scene=lookup_failed')
  const root=page.locator('.emergency-screen')
  const icons=root.locator('.ac-status svg')
  expect(await icons.count()).toBeGreaterThan(3)
  for(const icon of await icons.all()){
    await expect(icon).toHaveAttribute('aria-hidden','true')
    await expect(icon).toHaveCSS('filter','none')
    expect((await icon.boundingBox())!.width).toBeGreaterThanOrEqual(13)
  }
  await expect(root.locator('[data-request=vehicle]')).toContainText('미확인')
  expect(await root.locator('.rs-material svg.lucide').count()).toBe(0)
})

test('small viewport retains natural icon dimensions and visible state text',async({page})=>{
  await page.setViewportSize({width:360,height:800})
  await page.goto('/?study=emergency&scenario=SC01&scene=connected')
  const phone=page.locator('.ac-call-label svg')
  expect((await phone.boundingBox())!.width).toBe(32)
  await expect(page.locator('[data-request=rescue]')).toContainText('접수 미확인')
})

test('neutral surface labels and state icons have at least 3 to 1 contrast',async({page})=>{
  await page.goto('/?study=emergency&scenario=SC05')
  const ratios=await page.locator('[data-care-slot=requests]').evaluate(root=>{
    const rgb=(v:string)=>v.match(/[\d.]+/g)!.slice(0,3).map(Number)
    const light=(v:number[])=>v.map(c=>c/255<=.04045?c/255/12.92:((c/255+.055)/1.055)**2.4).reduce((s,c,i)=>s+c*[.2126,.7152,.0722][i],0)
    const bg=light(rgb(getComputedStyle(root.querySelector('.ac-solid-source')!).backgroundColor))
    return [...root.querySelectorAll('dt,.ac-status svg')].map(n=>{const c=light(rgb(getComputedStyle(n).color));return (Math.max(c,bg)+.05)/(Math.min(c,bg)+.05)})
  })
  expect(ratios.every(r=>r>=3)).toBe(true)
})
