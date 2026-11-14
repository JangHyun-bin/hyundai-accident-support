import { test, expect, type Page } from '@playwright/test'

type Theme = 'light' | 'dark'
type Box = { x: number; y: number; width: number; height: number }
type Run = { cell: string; text: string; color: string; alpha: number; boxes: Box[] }
const keyCells = ['guide', 'record', 'vehicle', 'emergency']
const hideText = '[data-cell] *, [data-cell] *::placeholder { color: transparent !important; -webkit-text-fill-color: transparent !important; text-shadow: none !important; }'

// Text sits on gradients, grain and blur, so contrast is read against the rendered pixels under each line of text, with the text itself hidden.
async function cellContrast(page: Page) {
  const runs = await page.evaluate(cells => cells.flatMap(cell => {
    const body = document.querySelector(`[data-cell="${cell}"] .fs-cell-body`)
    if (!body) return []
    const found: Run[] = []
    const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT)
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const element = node.parentElement
      if (!element || !node.textContent?.trim() || element.closest('[hidden],[inert],svg,button:disabled,[aria-hidden=true]')) continue
      const style = getComputedStyle(element)
      if (style.visibility !== 'visible') continue
      let alpha = 1
      for (let ancestor: Element | null = element; ancestor; ancestor = ancestor.parentElement) alpha *= Number(getComputedStyle(ancestor).opacity)
      const range = document.createRange()
      range.selectNodeContents(node)
      const boxes = [...range.getClientRects()].filter(box => box.width > 1 && box.height > 1).map(({ x, y, width, height }) => ({ x, y, width, height }))
      if (boxes.length) found.push({ cell, text: node.textContent.trim().slice(0, 40), color: style.color, alpha, boxes })
    }
    return found
  }), keyCells)
  const hidden = await page.addStyleTag({ content: hideText })
  const screenshot = (await page.screenshot()).toString('base64')
  await hidden.evaluate(node => { node.parentNode?.removeChild(node) })
  return page.evaluate(async ({ screenshot, runs }) => {
    const image = new Image()
    image.src = `data:image/png;base64,${screenshot}`
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = image.width
    canvas.height = image.height
    const context = canvas.getContext('2d')!
    context.drawImage(image, 0, 0)
    const channel = (value: number) => { const v = value / 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4 }
    const luminance = ([r, g, b]: number[]) => .2126 * channel(r) + .7152 * channel(g) + .0722 * channel(b)
    return runs.map(run => {
      const [r, g, b, a = 1] = run.color.match(/[\d.]+/g)!.map(Number)
      const alpha = a * run.alpha
      let ratio = Infinity
      for (const box of run.boxes) {
        const pixels = context.getImageData(Math.round(box.x), Math.round(box.y), Math.max(1, Math.round(box.width)), Math.max(1, Math.round(box.height))).data
        for (let i = 0; i < pixels.length; i += 4) {
          const background = [pixels[i], pixels[i + 1], pixels[i + 2]]
          const [high, low] = [luminance([r, g, b].map((value, k) => value * alpha + background[k] * (1 - alpha))), luminance(background)].sort((x, y) => y - x)
          ratio = Math.min(ratio, (high + .05) / (low + .05))
        }
      }
      return { cell: run.cell, text: run.text, ratio: Math.round(ratio * 100) / 100 }
    })
  }, { screenshot, runs })
}

for (const theme of ['light', 'dark'] as const satisfies readonly Theme[]) {
  test(`the journey follows the ${theme} OS theme and keeps AA text contrast in the guide, record, vehicle and 119 cells`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' })
    await page.goto('/')
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
    await page.getByRole('button', { name: '이 상황으로 시작', exact: true }).click()
    await page.getByRole('button', { name: '다친 사람이 있거나 위험해요', exact: true }).click()
    const board = page.getByTestId('flow-board')
    await expect(board).toHaveAttribute('data-emergency', 'true')
    await expect(board).toHaveAttribute('data-moving', 'false')
    await page.evaluate(() => document.fonts.ready)
    const measured = await cellContrast(page)
    expect([...new Set(measured.map(item => item.cell))].sort()).toEqual([...keyCells].sort())
    expect(measured.filter(item => item.ratio < 4.5)).toEqual([])
  })
}

test('inside the Pleos app the host theme wins over the OS theme and follows its live changes', async ({ page }) => {
  await page.addInitScript(() => {
    window.ChabunNative = { host: () => JSON.stringify({ version: 1, demo: false, sdk: '2.3.2', environment: 'emulator', theme: 'light' }), handoff: () => {}, dial: () => 'opened' }
  })
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' })
  await page.goto('/?host=pleos-app')
  const root = page.locator('html')
  const app = page.locator('body')
  await expect(root).toHaveAttribute('data-theme', 'light')
  await expect(root).toHaveCSS('color-scheme', 'light')
  const lightBackground = await app.evaluate(node => getComputedStyle(node).backgroundColor)
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('chabun:host-theme', { detail: { theme: 'dark' } })))
  await expect(root).toHaveAttribute('data-theme', 'dark')
  await expect(root).toHaveCSS('color-scheme', 'dark')
  await expect(app).not.toHaveCSS('background-color', lightBackground)
  await page.emulateMedia({ colorScheme: 'light' })
  await expect(root).toHaveAttribute('data-theme', 'dark')
})
