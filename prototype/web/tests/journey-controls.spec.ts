import {test,expect} from '@playwright/test'

test('one controller advances the representative flow and contains all demo settings',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'})
 await page.goto('/')
 await page.getByRole('button',{name:'이 상황으로 시작',exact:true}).click()
 const controls=page.getByRole('region',{name:'여정 조작'})
 const next=controls.getByTestId('journey-primary')
 await expect(next).toHaveText(/다음/)
 await expect(controls.getByRole('button',{name:'이전 단계',exact:true})).toBeDisabled()
 await next.click()
 await expect(controls).toContainText('시연: 통화 연결 확인')
 await next.click()
 await expect(page.getByTestId('journey-flow')).toHaveAttribute('data-step','2')
 await next.click()
 await next.click()
 await next.click()
 await expect(page.getByTestId('journey-flow')).toHaveAttribute('data-step','5')
 await expect(next).toBeDisabled()
 await page.getByRole('button',{name:'직접 입력',exact:true}).click()
 await page.getByRole('textbox',{name:'사고 기록',exact:true}).fill('우측 차량과 접촉한 뒤 정차했어요.')
 await page.getByRole('button',{name:'기록 저장',exact:true}).click()
 await expect(next).toBeEnabled()
 const shell=page.locator('.journey-flow [data-care-component=vehicle-shell]')
 const before=(await shell.boundingBox())!
 await controls.getByText('시연 설정',{exact:true}).click()
 for(const label of ['시연 설정','외부 결과 시연','대표 흐름 결과 시연']) {
  await expect(controls.getByRole('region',{name:label,exact:true})).toBeVisible()
 }
 await expect(page.locator('.journey-study>.journey-product-tools,.journey-study>.journey-review-controls,.journey-flow>.journey-flow-events')).toHaveCount(0)
 expect((await shell.boundingBox())!.height).toBe(before.height)
 await controls.getByRole('button',{name:'시연 event: 차량 감지 자료',exact:true}).click()
 await expect(controls.locator('details')).not.toHaveAttribute('open')
 await expect(controls.locator('summary')).toBeFocused()
 await controls.locator('summary').click()
 await page.keyboard.press('Escape')
 await expect(controls.locator('details')).not.toHaveAttribute('open')
 await expect(controls.locator('summary')).toBeFocused()
})

for(const width of [1440,1920,2560])test(`Connect Standard frame keeps 16:9 at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:1440})
 await page.emulateMedia({reducedMotion:'reduce'})
 await page.goto('/')
 await page.getByRole('button',{name:'이 상황으로 시작',exact:true}).click()
 const shell=page.locator('.journey-flow [data-care-component=vehicle-shell]')
 await expect(shell).toHaveAttribute('data-flow-mode','wide')
 await expect.poll(async()=>{const box=(await shell.boundingBox())!;return Math.abs(box.width/box.height-16/9)}).toBeLessThan(.001)
 const before=(await shell.boundingBox())!
 expect(before.width).toBe(width)
 if(width===2560)expect(before.height).toBe(1440)
 await expect(shell.getByRole('region',{name:'여정 조작'})).toHaveCount(0)
 await expect(shell.locator('.fs-stages,.fs-step-copy,.journey-flow-options')).toHaveCount(0)
 const controller=(await page.locator('.journey-flow-header').boundingBox())!
 expect(controller.y).toBeGreaterThanOrEqual(before.y+before.height)
 const status=(await shell.locator('.ac-vehicle-status').boundingBox())!
 const content=(await shell.locator('.ac-vehicle-content').boundingBox())!
 const dock=(await shell.locator('.ac-vehicle-dock').boundingBox())!
 expect(content.y-status.y-status.height).toBeCloseTo(16,0)
 expect(dock.y-content.y-content.height).toBeCloseTo(16,0)
 expect(before.y+await page.evaluate(()=>scrollY)).toBeCloseTo(0,0)
 await page.getByTestId('journey-primary').click()
 await page.getByTestId('journey-primary').click()
 await page.getByTestId('journey-primary').click()
 await expect(page.getByTestId('journey-flow')).toHaveAttribute('data-step','3')
 const after=(await shell.boundingBox())!
 expect(after.width).toBe(before.width);expect(after.height).toBe(before.height)
 const left=(await page.locator('.journey-flow-scene').boundingBox())!,right=(await page.getByTestId('flow-board').boundingBox())!
 expect(Math.abs(left.y-right.y)).toBeLessThanOrEqual(1)
 expect(Math.abs(left.height-right.height)).toBeLessThanOrEqual(1)
})
