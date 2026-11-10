import {expect,test} from '@playwright/test'

for(const width of [1600,2560,1100,1030,960,393,360])test(`response layout remains readable at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:1080})
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message))
  await page.goto('/?study=design-system')
  const preview=page.getByRole('region',{name:'Response layout preview'})
  await expect(preview.getByRole('heading',{name:'119 통화 연결됨'})).toBeVisible()
  await expect(preview.locator('[data-care-slot="guidance"]')).toContainText('가드레일 밖으로')
  await expect.poll(()=>preview.locator('[data-care-layout="response"]').getAttribute('data-layout-ready')).toBe('true')
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  const result=await preview.evaluate(root=>{
    const ctx=document.createElement('canvas').getContext('2d')!;const failures:string[]=[]
    root.querySelectorAll<HTMLElement>('[data-care-slot]').forEach(slot=>{
      const background=slot.querySelector<HTMLElement>('.ac-material-frame')
      const path=background?.dataset.shapePath
      const b=background?.getBoundingClientRect()
      const walker=document.createTreeWalker(slot,NodeFilter.SHOW_TEXT)
      while(walker.nextNode()){
        if(!walker.currentNode.textContent?.trim())continue
        const range=document.createRange();range.selectNodeContents(walker.currentNode)
        for(const r of range.getClientRects()){
          if(!r.width||!r.height)continue
          if(path&&b){
            const p=new Path2D(path)
            if(![[r.left,r.top],[r.right,r.top],[r.right,r.bottom],[r.left,r.bottom]].every(([x,y])=>ctx.isPointInPath(p,x-b.left,y-b.top)))failures.push(slot.dataset.careSlot+': '+walker.currentNode.textContent)
          }else if(r.right>slot.getBoundingClientRect().right+1)failures.push('overflow: '+walker.currentNode.textContent)
        }
      }
    })
    const ids=[...root.querySelectorAll('filter')].map(n=>n.id)
    return {failures,unique:new Set(ids).size===ids.length,shapes:root.querySelectorAll('[data-shape-path]').length}
  })
  expect(result.failures).toEqual([]);expect(result.unique).toBe(true)
  expect(result.shapes).toBe(width>=1100?3:0)
  expect(errors).toEqual([])
})

test('long Korean content and 200% text preserve reading order and controls',async({page})=>{
  await page.setViewportSize({width:393,height:852});await page.emulateMedia({reducedMotion:'reduce'})
  await page.goto('/?study=design-system')
  await page.getByRole('button',{name:'긴 문구 보기'}).click()
  await page.addStyleTag({content:'html{font-size:200%}'})
  const preview=page.getByRole('region',{name:'Response layout preview'})
  await expect(preview).toContainText('현재 위치와 이동 경로가 아직 확인되지 않았어요')
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  const slots=await preview.locator('[data-care-slot]').evaluateAll(nodes=>nodes.map(n=>({name:n.getAttribute('data-care-slot'),top:n.getBoundingClientRect().top})))
  expect(slots.map(s=>s.name)).toEqual(['summary','primary','guidance','requests','navigation','action'])
  expect(slots.every((s,i)=>i===0||s.top>slots[i-1].top)).toBe(true)
  for(const node of await preview.getByRole('button').all())expect((await node.boundingBox())!.height).toBeGreaterThanOrEqual(48)
  expect(await preview.evaluate(n=>n.getAnimations({subtree:true}).filter(a=>a.effect?.getTiming().iterations===Infinity).length)).toBe(0)
})

test('editor previews shared response and task layouts and explicitly applies without replacing presets',async({page,context})=>{
  await page.goto('/?study=design-system')
  await page.evaluate(async()=>{
    const path='/src/design-system/surfaces.ts';const {originalSurfaces}=await import(path)
    localStorage.setItem('response-surface-study-v1',JSON.stringify({version:1,draft:originalSurfaces,presets:[{name:'C',surfaces:originalSurfaces},{name:'C_02',surfaces:originalSurfaces}]}))
  })
  const other=await context.newPage();await other.goto('/?study=design-system')
  await page.goto('/?study=response-alts&focus=surface')
  const contextPreview=page.getByRole('region',{name:'제품 layout 미리보기'})
  await expect(contextPreview.locator('[data-care-layout="response"]')).toBeVisible()
  await page.getByLabel('미리볼 layout').selectOption('task')
  await expect(contextPreview.locator('[data-care-layout="task"]')).toBeVisible()
  await page.getByLabel('미리볼 layout').selectOption('response')
  await page.getByLabel('첫 색',{exact:true}).fill('#abcdef')
  const before=await page.evaluate(()=>localStorage.getItem('response-surface-study-v1'))
  await page.getByRole('button',{name:'제품에 적용',exact:true}).click()
  await expect(page.getByRole('status').filter({hasText:'제품에 적용했어요'})).toBeVisible()
  expect(await page.evaluate(()=>localStorage.getItem('response-surface-study-v1'))).toBe(before)
  await expect.poll(()=>other.locator('[data-care-surface="call"]').first().evaluate(n=>getComputedStyle(n).getPropertyValue('--rs-gradient'))).toContain('#abcdef')
})
