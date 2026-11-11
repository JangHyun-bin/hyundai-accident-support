import {expect,test} from '@playwright/test'

test('state commits immediately and the shared motion uses its token',async({page})=>{
 await page.goto('/?study=emergency&scenario=SC01&scene=initial')
 await page.getByRole('button',{name:'지금 연결',exact:true}).click()
 await expect(page.getByRole('heading',{name:'119 연결 중',exact:true})).toBeVisible({timeout:400})
 const surface=page.locator('[data-care-motion-key]');await expect(surface).toHaveAttribute('data-care-motion-key','SC01/contact_unknown')
 expect(await surface.evaluate(n=>n.getAnimations().every(a=>Number(a.effect?.getComputedTiming().duration)<=240))).toBe(true)
})
test('reduced motion starts no animation on new information',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/?study=emergency&scenario=SC01&scene=initial')
 await page.getByRole('button',{name:'지금 연결',exact:true}).click()
 await expect(page.getByRole('heading',{name:'119 연결 중',exact:true})).toBeVisible()
 expect(await page.locator('[data-care-motion-key]').evaluate(n=>n.getAnimations({subtree:true}).length)).toBe(0)
})
test('countdown ticks do not replay scene motion',async({page})=>{
 await page.goto('/?study=emergency&scenario=SC01&scene=initial')
 await expect(page.locator('[data-countdown]')).toHaveAttribute('data-countdown','8',{timeout:5000})
 expect(await page.locator('[data-care-motion-key]').evaluate(n=>n.getAnimations().length)).toBe(0)
})
test('countdown digits roll',async({page})=>{
 await page.goto('/?study=emergency&scenario=SC01&scene=initial');await expect(page.locator('[data-countdown] number-flow-react')).toHaveCount(1)
})
test('buttons use a restrained shared press response',async({page})=>{
 await page.goto('/?study=emergency&scenario=SC01&scene=initial');const b=page.getByRole('button',{name:'지금 연결',exact:true});await b.hover();await page.mouse.down();await expect(b).toHaveCSS('opacity','0.85');await expect(b).toHaveCSS('transform','none');await page.mouse.up()
})
test('reduced motion removes press movement',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/?study=emergency&scenario=SC01&scene=initial');const b=page.getByRole('button',{name:'취소',exact:true});await b.hover();await page.mouse.down();await expect(b).toHaveCSS('transform','none');await page.mouse.up()
})
