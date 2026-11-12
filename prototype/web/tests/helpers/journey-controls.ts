import type {Page} from '@playwright/test'

export async function journeyControl(page:Page,name:string,withoutFocus=false) {
 const control=page.getByRole('button',{name,exact:true})
 const options=page.locator('.journey-flow:visible .journey-flow-options')
 if(!await control.isVisible()&&await options.count()&&!await options.evaluate(node=>(node as HTMLDetailsElement).open)) {
  if(withoutFocus)await options.locator('summary').evaluate((node:HTMLElement)=>node.click())
  else await options.locator('summary').click()
 }
 return control
}
