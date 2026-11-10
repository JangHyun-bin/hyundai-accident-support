type Point = [number, number]

// 공유 경계의 양쪽을 같은 normal 거리만큼 이동해 gap 유지.
export function insetEdges(points: Point[], distances: number[]): Point[] {
  const lines = points.map((p, i) => {
    const q = points[(i + 1) % points.length], dx = q[0] - p[0], dy = q[1] - p[1], length = Math.hypot(dx, dy)
    return { x: p[0] - dy / length * distances[i], y: p[1] + dx / length * distances[i], dx, dy }
  })
  return lines.map((b, i) => {
    const a = lines[(i + lines.length - 1) % lines.length]
    const t = ((b.x - a.x) * b.dy - (b.y - a.y) * b.dx) / (a.dx * b.dy - a.dy * b.dx)
    return [a.x + t * a.dx, a.y + t * a.dy]
  })
}

export function roundedPath(points: Point[], radius = 28): string {
  const corners = points.map((p, i) => {
    const a = points[(i + points.length - 1) % points.length], b = points[(i + 1) % points.length]
    const al = Math.hypot(a[0] - p[0], a[1] - p[1]), bl = Math.hypot(b[0] - p[0], b[1] - p[1])
    const u = [(a[0] - p[0]) / al, (a[1] - p[1]) / al], v = [(b[0] - p[0]) / bl, (b[1] - p[1]) / bl]
    const angle = Math.acos(Math.max(-1, Math.min(1, u[0] * v[0] + u[1] * v[1])))
    const d = Math.min(radius / Math.tan(angle / 2), al * .45, bl * .45)
    const handle = 4 / 3 * Math.tan((Math.PI - angle) / 4) * d * Math.tan(angle / 2)
    return {
      start: [p[0] + u[0] * d, p[1] + u[1] * d], end: [p[0] + v[0] * d, p[1] + v[1] * d],
      c1: [p[0] + u[0] * (d - handle), p[1] + u[1] * (d - handle)],
      c2: [p[0] + v[0] * (d - handle), p[1] + v[1] * (d - handle)],
    }
  })
  const xy = (p: number[]) => p.map(n => n.toFixed(3)).join(' ')
  return corners.map((c, i) => `${i ? 'L' : 'M'}${xy(c.start)} C${xy(c.c1)} ${xy(c.c2)} ${xy(c.end)}`).join(' ') + ' Z'
}

function place(node: HTMLElement, points: Point[]) {
  const x = Math.min(...points.map(p => p[0])), y = Math.min(...points.map(p => p[1]))
  const width = Math.max(...points.map(p => p[0])) - x, height = Math.max(...points.map(p => p[1])) - y
  Object.assign(node.style, { position: 'absolute', left: `${x}px`, top: `${y}px`, width: `${width}px`, height: `${height}px`, minHeight: '0' })
  node.style.setProperty('--split-clip', `path("${roundedPath(points.map(p => [p[0] - x, p[1] - y]))}")`)
  node.dataset.splitShape = 'true'
}

export function drawSplit(root: HTMLElement, variant: 'A' | 'B') {
  const layout = root.querySelector<HTMLElement>('.rc-layout')!
  const map = root.querySelector<HTMLElement>('.rc-map')!, safety = root.querySelector<HTMLElement>('.rc-safety')!
  const record = root.querySelector<HTMLElement>('.rc-record')!
  const gap = 16, width = layout.clientWidth, column = (width - gap) / 2
  const height = layout.clientHeight - record.offsetHeight - gap
  const slope = Math.tan(4 * Math.PI / 180)
  if (variant === 'A') {
    const left = height / 2 - column * slope / 2, right = height / 2 + column * slope / 2
    place(map, insetEdges([[0,0],[column,0],[column,right],[0,left]], [0,0,gap/2,0]))
    place(safety, insetEdges([[0,left],[column,right],[column,height],[0,height]], [gap/2,0,0,0]))
    map.style.paddingBottom = `${right-left}px`
    safety.style.paddingTop = `${26+right-left}px`
  } else {
    const call = root.querySelector<HTMLElement>('.rc-call')!
    const top = root.querySelector<HTMLElement>('.rc-condition')!.offsetHeight + gap
    const bottom = layout.clientHeight - root.querySelector<HTMLElement>('.rc-requests')!.offsetHeight - gap
    const centre = column + gap/2, joint: Point = [centre+48,height*.46], lower = centre
    const upperAt = (y: number) => centre+(joint[0]-centre)*y/joint[1]
    const lowerAt = (y: number) => joint[0]+(lower-joint[0])*(y-joint[1])/(height-joint[1])
    const right = joint[1]+(width-joint[0])*slope
    place(call, insetEdges([[0,top],[upperAt(top),top],joint,[lowerAt(bottom),bottom],[0,bottom]], [0,gap/2,gap/2,0,0]))
    place(map, insetEdges([[centre,0],[width,0],[width,right],joint], [0,0,gap/2,gap/2]))
    place(safety, insetEdges([joint,[width,right],[width,height],[lower,height]], [gap/2,0,0,gap/2]))
    map.style.paddingBottom = `${right-joint[1]}px`
    safety.style.paddingTop = `${26+right-joint[1]}px`
  }
}
