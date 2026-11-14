import {test,expect} from '@playwright/test'

test('IVI status bar keeps the Figma geometry and original local asset',async({page})=>{
  await page.setViewportSize({width:2560,height:1080})
  await page.goto('/?study=surroundings')
  await page.evaluate(()=>document.fonts.ready)
  await page.addStyleTag({content:'.ac-vehicle{position:fixed;left:0;top:0;box-sizing:border-box;max-width:none;width:2560px;padding:0;margin:0}'})
  const bar=page.getByRole('region',{name:'차량 상태 표시'})
  const result=await bar.evaluate(node=>{
    const rect=node.getBoundingClientRect(),css=getComputedStyle(node)
    const image=node.querySelector('img')!,mark=image.getBoundingClientRect()
    return {width:rect.width,height:rect.height,font:css.fontSize,lineHeight:css.lineHeight,padding:css.paddingLeft,modeColor:getComputedStyle(node.querySelector('.ac-vehicle-mode')!).color,loaded:image.complete&&image.naturalWidth===14&&image.naturalHeight===14,src:image.getAttribute('src'),mark:[mark.width,mark.height],positions:[...node.children].map(child=>{const r=child.getBoundingClientRect();return {x:r.x-rect.x,y:r.y-rect.y}})}
  })
  expect(result).toMatchObject({width:2560,height:72,font:'26px',lineHeight:'34px',padding:'56px',modeColor:'rgb(242, 165, 65)',loaded:true,src:'/figma/ivi-status-bar/mode-indicator.svg',mark:[14,14]})
  for(const [index,x] of [56,1154,2393].entries()){
    expect(Math.abs(result.positions[index].x-x)).toBeLessThan(1)
    expect(result.positions[index].y).toBe(19)
  }
  await bar.screenshot({path:test.info().outputPath('ivi-status-bar.png')})
})

test('status remains readable at narrow widths and with enlarged text',async({page})=>{
  await page.goto('/?study=surroundings')
  const bar=page.getByRole('region',{name:'차량 상태 표시'})
  for(const [width,font] of [[1600,16],[1100,16],[393,16],[360,16],[1600,32],[393,32],[360,32]]){
    await page.setViewportSize({width,height:1050})
    await page.evaluate(size=>{document.documentElement.style.fontSize=size+'px'},font)
    await expect(bar).toContainText('오후 9:12')
    await expect(bar).toContainText('차분 · 사고 대응 모드')
    await expect(bar).toContainText('5G   18°C')
    await expect.poll(()=>bar.evaluate(node=>{
      const b=node.getBoundingClientRect(),rects=[...node.children].map(n=>n.getBoundingClientRect())
      return {clipped:node.scrollWidth>node.clientWidth+1,inside:rects.every(r=>r.left>=b.left&&r.right<=b.right&&r.top>=b.top&&r.bottom<=b.bottom),overlap:rects.some((a,i)=>rects.slice(i+1).some(c=>a.left<c.right&&c.left<a.right&&a.top<c.bottom&&c.top<a.bottom))}
    }),{message:`Status at ${width}px / ${font}px`}).toEqual({clipped:false,inside:true,overlap:false})
    const indicator=await bar.locator('img').evaluate(image=>({width:image.getBoundingClientRect().width,font:parseFloat(getComputedStyle(image).fontSize)}))
    expect(indicator.width).toBeCloseTo(indicator.font*14/26,2)
  }
})

test('the shared status appears on each simulated vehicle route without browser errors',async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message))
  for(const study of ['emergency','vehicle','surroundings']){
    await page.goto('/?study='+study)
    const bar=page.getByRole('region',{name:'차량 상태 표시'})
    await expect(bar).toBeVisible()
    await expect(bar.getByText('차분 · 사고 대응 모드',{exact:true})).toBeVisible()
    await expect.poll(()=>bar.locator('img').evaluate(image=>(image as HTMLImageElement).complete&&(image as HTMLImageElement).naturalWidth>0)).toBe(true)
  }
  expect(errors).toEqual([])
})
