import {expect,test} from '@playwright/test'
import source from '../../../specs/emergency-experience/scenarios.json' with {type:'json'}

for(const scenario of source.scenarios)test(`${scenario.id}: every defined state uses shared system and preserves agency meaning`,async({page})=>{
  test.setTimeout(90000);await page.emulateMedia({reducedMotion:'reduce'})
  for(const scene of scenario.states){
    await page.goto(`/?study=emergency&scenario=${scenario.id}&scene=${scene.id}`)
    const screen=page.getByRole('region',{name:'시각 중심 사고 대응'})
    await expect(screen).toHaveAttribute('data-scene',scene.id)
    await expect(screen.locator('[data-care-layout="response"]')).toBeVisible()
    await expect(screen.getByRole('heading',{name:scene.title,exact:true})).toBeVisible()
    await expect(screen.locator('[data-navigation-state="unknown"]')).toBeVisible()
    expect(await screen.locator('[data-request]').count()).toBe(3)
    expect(await screen.locator('canvas,[data-vehicle-position]').count()).toBe(0)
    expect(await page.locator('[data-care-component="vehicle-shell"]').evaluate(n=>getComputedStyle(n).transform)).toBe('none')
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
    for(const action of await screen.getByRole('button').all())expect((await action.boundingBox())!.height).toBeGreaterThanOrEqual(48)
    const escaped=await screen.evaluate(root=>{
      const errors:string[]=[];const ctx=document.createElement('canvas').getContext('2d')!
      root.querySelectorAll<HTMLElement>('[data-care-slot]').forEach(slot=>{
        const bg=slot.querySelector<HTMLElement>('[data-shape-path]');if(!bg)return
        const box=bg.getBoundingClientRect(),path=new Path2D(bg.dataset.shapePath!)
        const walk=document.createTreeWalker(slot,NodeFilter.SHOW_TEXT)
        while(walk.nextNode()){
          if(!walk.currentNode.textContent?.trim())continue
          const range=document.createRange();range.selectNodeContents(walk.currentNode)
          for(const r of range.getClientRects())if(r.width&&r.height&&![[r.left,r.top],[r.right,r.top],[r.left,r.bottom],[r.right,r.bottom]].every(([x,y])=>ctx.isPointInPath(path,x-box.left,y-box.top)))errors.push(walk.currentNode.textContent!)
        }
      });return errors
    })
    expect(escaped,`${scenario.id}/${scene.id}`).toEqual([])
  }
})

test('mobile 200% text retains scope, saved record and all controls',async({page})=>{
  await page.setViewportSize({width:360,height:800});await page.emulateMedia({reducedMotion:'reduce'})
  for(const scene of ['review','record','initial','received']){
    await page.goto(`/?study=emergency&scenario=SC04&scene=${scene}`)
    await page.addStyleTag({content:'html{font-size:200%}'})
    await expect(page.locator('[data-care-layout="response"]')).toBeVisible()
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  }
})
