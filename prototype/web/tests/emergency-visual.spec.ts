import {mkdirSync} from 'node:fs'
import {expect,test} from '@playwright/test'
import manifest from '../../../specs/emergency-experience/scenarios.json' with {type:'json'}

for(const size of ['desktop','mobile'] as const)for(const scenario of manifest.scenarios)test(`${size} ${scenario.id}: every scene remains readable in normal document flow`,async({page})=>{
  test.setTimeout(90000);await page.setViewportSize(size==='desktop'?{width:2560,height:1800}:{width:375,height:900});await page.emulateMedia({reducedMotion:'reduce'})
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message))
  const dir=`evidence/emergency-system/${size}`;mkdirSync(dir,{recursive:true})
  for(const scene of scenario.states){
    await page.goto(`/?study=emergency&scenario=${scenario.id}&scene=${scene.id}`)
    const root=page.locator('.emergency-screen');await expect(root).toHaveAttribute('data-scene',scene.id)
    await page.evaluate(()=>document.fonts.ready)
    const issues=await root.evaluate(root=>{
      const issues:string[]=[]
      for(const n of root.querySelectorAll<HTMLElement>('h1,h2,p,button,textarea,fieldset,.ac-workflow,.ac-request-line')){
        if(n.clientWidth&&n.scrollWidth>n.clientWidth+2&&n.tagName!=='TEXTAREA')issues.push('horizontal clip: '+n.textContent)
        if(n.tagName==='BUTTON'&&n.getBoundingClientRect().height<48)issues.push('small target')
      }
      const primary=root.querySelector('[data-care-slot=primary]')!.getBoundingClientRect(),requests=root.querySelector('[data-care-slot=requests]')!.getBoundingClientRect()
      if(primary.bottom>requests.top)issues.push('primary overlaps requests')
      return issues
    })
    expect(issues,`${scenario.id}/${scene.id}`).toEqual([])
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
    await root.screenshot({path:`${dir}/${scenario.id}-${scene.id}.png`,animations:'disabled'})
  }
  expect(errors).toEqual([])
})

test('catalog exposes the real editable scope and record components',async({page})=>{
  await page.goto('/?study=emergency-catalog')
  await expect(page.getByRole('heading',{name:'AFTER / CARE design system',exact:true})).toBeVisible()
  await page.getByLabel('Scenario',{exact:true}).selectOption('SC04')
  await page.getByLabel('State',{exact:true}).selectOption('review')
  await page.getByRole('checkbox',{name:'사고 위치',exact:true}).uncheck()
  await expect(page.getByRole('checkbox',{name:'사고 위치',exact:true})).not.toBeChecked()
  await page.getByLabel('State',{exact:true}).selectOption('record')
  await page.locator('#accident-record').fill('Catalog input')
  await expect(page.locator('#accident-record')).toHaveValue('Catalog input')
})
