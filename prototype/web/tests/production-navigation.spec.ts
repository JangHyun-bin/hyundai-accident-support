import {test,expect} from '@playwright/test'
import {build,preview,type PreviewServer} from 'vite'
import {fileURLToPath} from 'node:url'
let server:PreviewServer
let url:string

test.beforeAll(async()=>{
 const root=fileURLToPath(new URL('../',import.meta.url))
 await build({root,logLevel:'silent'})
 server=await preview({root,preview:{host:'127.0.0.1',port:0,strictPort:true}})
 url=server.resolvedUrls!.local[0]
})
test.afterAll(async()=>{
 if(server)await new Promise<void>((resolve,reject)=>server.httpServer.close(error=>error?reject(error):resolve()))
})
test('production catalog only links to pages included in the production build',async({page})=>{
 await page.goto(url+'?study=design-system')
 await expect(page.getByRole('heading',{name:'AFTER / CARE design system',exact:true})).toBeVisible()
 const developmentLinks=page.locator('a[href*="study=flow"],a[href*="study=interaction"],a[href*="study=response-alts"],a[href*="study=vehicle"],a[href*="study=surroundings"]')
 await expect(developmentLinks).toHaveCount(0)
 await page.getByRole('link',{name:'전체 흐름',exact:false}).click()
 await expect(page.getByRole('heading',{name:'사고 대응 · 전체 여정',exact:true})).toBeVisible()
})
