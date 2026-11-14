export type Point = [number, number]

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

export function roundedPath(points: Point[], radius: number | readonly number[] = 28): string {
  const corners = points.map((p, i) => {
    const a = points[(i + points.length - 1) % points.length], b = points[(i + 1) % points.length]
    const al = Math.hypot(a[0] - p[0], a[1] - p[1]), bl = Math.hypot(b[0] - p[0], b[1] - p[1])
    const u = [(a[0] - p[0]) / al, (a[1] - p[1]) / al], v = [(b[0] - p[0]) / bl, (b[1] - p[1]) / bl]
    const angle = Math.acos(Math.max(-1, Math.min(1, u[0] * v[0] + u[1] * v[1])))
    const d = Math.min((typeof radius === 'number' ? radius : radius[i]) / Math.tan(angle / 2), al * .45, bl * .45)
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

export type SlotRect = {left:number;top:number;width:number;height:number}
export type SurfaceShape = {left:number;top:number;width:number;height:number;path:string}
export type ResponseShapes = Partial<Record<'primary'|'navigation'|'guidance',SurfaceShape>>

function shapeFor(points:Point[],slot:SlotRect,radius=28):SurfaceShape {
  const x=Math.min(...points.map(p=>p[0])),y=Math.min(...points.map(p=>p[1]))
  return {left:x-slot.left,top:y-slot.top,width:Math.max(...points.map(p=>p[0]))-x,height:Math.max(...points.map(p=>p[1]))-y,path:roundedPath(points.map(p=>[p[0]-x,p[1]-y]),radius)}
}

// 내용의 normal flow를 측정한 뒤 background만 분할. 글자는 shape 변형에 참여하지 않음.
export type SplitOptions = {radius?:number;tiltDeg?:number;junctionBias?:number}
export function responseShapes(width:number,slots:Record<'primary'|'navigation'|'guidance',SlotRect>,gap=16,options:SplitOptions={}):ResponseShapes {
  const {primary,navigation,guidance}=slots
  if(width<=0||navigation.left<primary.width||navigation.height<=0)return {}
  const middle=(primary.width+navigation.left)/2
  const top=navigation.top,bottom=guidance.top+guidance.height
  const joint:Point=[middle+Math.min(48,width*.035),navigation.top+navigation.height+gap/2+(options.junctionBias??0)*(bottom-top)]
  const primaryBottom=primary.top+primary.height
  // 큰 글자나 긴 요약으로 접점이 본문 영역을 벗어나면 직사각형 card로 복귀.
  if(joint[1]<=primary.top+32||joint[1]>=primaryBottom-32||bottom-joint[1]<80)return {}
  const upperAt=(y:number)=>middle+(joint[0]-middle)*(y-top)/(joint[1]-top)
  const lowerAt=(y:number)=>joint[0]+(middle-joint[0])*(y-joint[1])/(bottom-joint[1])
  const right=joint[1]+(width-joint[0])*Math.tan((options.tiltDeg??4)*Math.PI/180)
  return {
    primary:shapeFor(insetEdges([[0,primary.top],[upperAt(primary.top),primary.top],joint,[lowerAt(primaryBottom),primaryBottom],[0,primaryBottom]],[0,gap/2,gap/2,0,0]),primary,options.radius),
    navigation:shapeFor(insetEdges([[middle,top],[width,top],[width,right],joint],[0,0,gap/2,gap/2]),navigation,options.radius),
    guidance:shapeFor(insetEdges([joint,[width,right],[width,bottom],[middle,bottom]],[gap/2,0,0,gap/2]),guidance,options.radius),
  }
}
