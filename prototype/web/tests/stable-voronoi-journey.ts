import {expect,type Page} from '@playwright/test'

// The real journey only shows 119 after the driver reports danger, and only calls after 119에 연결.
export async function startLiveCall(page:Page){
 await page.goto('/')
 await page.getByRole('button',{name:'이 상황으로 시작',exact:true}).click()
 await page.evaluate(()=>document.fonts.ready)
 await page.getByRole('button',{name:'다친 사람이 있거나 위험해요',exact:true}).click()
 await page.getByRole('button',{name:'119에 연결',exact:true}).click()
 await page.getByRole('button',{name:/^(?:다음 · )?시연 event: 통화 연결 확인$/,exact:true}).click()
 const board=page.getByTestId('flow-board')
 await expect(board).toHaveAttribute('data-layout','emergency',{timeout:8000})
 await expect(board).toHaveAttribute('data-moving','false',{timeout:8000})
}
