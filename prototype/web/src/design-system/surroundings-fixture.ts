// 시각 검토용 authored scene. 실제 차량 관측·사고 재구성 결과가 아님.
export type Pose={x:number;y:number;heading:number}
type Keyframe=Pose&{time:number}
const own:Keyframe[]=[
  {time:-8,x:278,y:710,heading:0},{time:-5,x:278,y:570,heading:0},
  {time:-3,x:278,y:495,heading:0},{time:-1,x:278,y:425,heading:0},
  {time:0,x:278,y:390,heading:0},{time:1.5,x:278,y:374,heading:0},{time:6,x:278,y:368,heading:0},
]
const other:Keyframe[]=[
  {time:-8,x:450,y:680,heading:0},{time:-5,x:448,y:540,heading:-5},
  {time:-3,x:400,y:400,heading:-26},{time:-1,x:335,y:330,heading:-30},
  {time:0,x:310,y:303,heading:-16},{time:1.5,x:319,y:290,heading:-12},{time:6,x:324,y:284,heading:-10},
]
export const replayStart=-8,replayEnd=6
export const estimatedInterval=[-4.2,-2.6] as const
// Authored fixture의 접촉 부위. 실제 제품에서는 확인된 local 부위 좌표를 전달해야 함.
export const sceneContact={ownEdge:'M364.174 185L365 204L364.799 238',otherEdge:'M233 484C212 477 203 463 201 439',anchor:{x:364.905,y:220}}

const axes=['x','y','heading'] as const
type Curve={keys:Keyframe[];slopes:Pose[]}

// Monotone Hermite interpolation: waypoint를 지나며 각 축의 overshoot와 급격한 접선 변화를 방지.
function curve(keys:Keyframe[]):Curve {
  const slopes=keys.map(()=>({x:0,y:0,heading:0}))
  for(const axis of axes){
    const intervals=keys.slice(1).map((key,i)=>key.time-keys[i].time)
    const deltas=keys.slice(1).map((key,i)=>(key[axis]-keys[i][axis])/intervals[i])
    slopes[0][axis]=deltas[0]
    for(let i=1;i<keys.length-1;i++){
      if(deltas[i-1]*deltas[i]<=0)continue
      const before=intervals[i-1],after=intervals[i],w1=2*after+before,w2=after+2*before
      slopes[i][axis]=(w1+w2)/(w1/deltas[i-1]+w2/deltas[i])
    }
    // 마지막 waypoint에서는 정차하므로 최종 속도 0.
  }
  return {keys,slopes}
}
const ownCurve=curve(own),otherCurve=curve(other)

function evaluate({keys,slopes}:Curve,time:number){
  const t=Math.max(keys[0].time,Math.min(keys[keys.length-1].time,time))
  const index=Math.max(1,keys.findIndex(key=>key.time>=t)),a=keys[index-1],b=keys[index]
  const h=b.time-a.time,u=(t-a.time)/h,u2=u*u,u3=u2*u
  const pose:Pose={x:0,y:0,heading:0},velocity:Pose={x:0,y:0,heading:0}
  for(const axis of axes){
    const start=slopes[index-1][axis],end=slopes[index][axis]
    pose[axis]=(2*u3-3*u2+1)*a[axis]+(u3-2*u2+u)*h*start+(-2*u3+3*u2)*b[axis]+(u3-u2)*h*end
    velocity[axis]=(6*u2-6*u)*(a[axis]-b[axis])/h+(3*u2-4*u+1)*start+(3*u2-2*u)*end
  }
  return {pose,velocity}
}

export function replayFrame(time:number){
  const t=Math.max(replayStart,Math.min(replayEnd,time))
  return {own:evaluate(ownCurve,t).pose,other:evaluate(otherCurve,t).pose,estimated:t>=estimatedInterval[0]&&t<=estimatedInterval[1],contact:Math.abs(t)<=.22}
}

export function currentFrame(time:number){
  const pass=(time%14)/14
  return {own:evaluate(ownCurve,6).pose,other:evaluate(otherCurve,6).pose,passing:{x:130,y:730-pass*900,heading:0},phase:pass<.34?'좌측 후방 차량 접근':pass<.65?'좌측 차량 통과 중':'주변 상황 확인 중'}
}

export function trailSegments(actor:'own'|'other',time:number){
  const source=actor==='own'?ownCurve:otherCurve,end=Math.min(replayEnd,time),start=Math.max(replayStart,end-4.8)
  if(end<=start)return []
  const boundaries=[...new Set([start,end,...Array.from({length:23},(_,i)=>start+(end-start)*(i+1)/24),...source.keys.map(key=>key.time),...estimatedInterval].filter(t=>t>=start&&t<=end))].sort((a,b)=>a-b)
  const point=(x:number,y:number)=>`${x.toFixed(3)} ${y.toFixed(3)}`
  let distance=0
  return boundaries.slice(1).map((to,i)=>{
    const from=boundaries[i],a=evaluate(source,from),b=evaluate(source,to),dt=(to-from)/3,age=((from+to)/2-start)/(end-start)
    const path=`M${point(a.pose.x,a.pose.y)}C${point(a.pose.x+a.velocity.x*dt,a.pose.y+a.velocity.y*dt)} ${point(b.pose.x-b.velocity.x*dt,b.pose.y-b.velocity.y*dt)} ${point(b.pose.x,b.pose.y)}`
    const offset=distance,middle=evaluate(source,(from+to)/2).velocity
    distance+=(to-from)/6*(Math.hypot(a.velocity.x,a.velocity.y)+4*Math.hypot(middle.x,middle.y)+Math.hypot(b.velocity.x,b.velocity.y))
    return {path,offset,opacity:Math.pow(age,1.6)*.72,estimated:actor==='other'&&(from+to)/2>=estimatedInterval[0]&&(from+to)/2<=estimatedInterval[1]}
  })
}

export function relativeTime(time:number){return `${time<0?'−':time>0?'+':''}${Math.abs(time).toFixed(1).padStart(4,'0')}초`}
