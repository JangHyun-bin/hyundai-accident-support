import type {currentFrame,Pose} from './surroundings-fixture'
import './front-scene.css'

export function FrontScene({width,height,frame}:{width:number;height:number;frame:ReturnType<typeof currentFrame>}){
  const horizon=height*.29,center=width*.36,focal=Math.min(width*.78,height*1.02),eyeHeight=82,near=60
  const angle=frame.own.heading*Math.PI/180,cos=Math.cos(angle),sin=Math.sin(angle)
  const relative=(pose:Pose)=>{const x=pose.x-frame.own.x,y=pose.y-frame.own.y;return {x:x*cos+y*sin,z:x*sin-y*cos+150}}
  const project=(x:number,z:number,elevation=0)=>({x:center+x*focal/z,y:horizon+(eyeHeight-elevation)*focal/z})
  const point=(x:number,z:number,elevation=0)=>{const p=project(x-frame.own.x,z,elevation);return `${p.x},${p.y}`}
  const depths=[90,130,185,260,370,520,740,1050,1500,2200]
  const actors=[{name:'other',pose:frame.other},{name:'passing',pose:frame.passing}].map(actor=>{
    const local=relative(actor.pose),yaw=(actor.pose.heading-frame.own.heading)*Math.PI/180
    const depth=local.z-Math.abs(Math.cos(yaw))*76
    return {...actor,depth,local,yaw}
  }).filter(actor=>actor.depth>near).sort((a,b)=>b.depth-a.depth)
  return <g className="ss-front-scene" aria-hidden="true">
    <path d={`M0 ${horizon}H${width}`} className="ss-front-horizon"/>
    <path d={`M${point(58,near)}L${point(58,2400)}L${point(542,2400)}L${point(542,near)}Z`} className="ss-front-road"/>
    <path d={`M${point(58,near)}L${point(58,2400)}M${point(542,near)}L${point(542,2400)}`} className="ss-front-road-edge"/>
    {[220,380].map(x=><g key={x} className="ss-front-lanes">{[85,160,260,410,630,940,1380,2000].map(z=><path key={z} d={`M${point(x,z)}L${point(x,z+Math.min(55,z*.18))}`}/>)}</g>)}
    <g className="ss-front-guardrail">
      <path d={`M${point(558,near,30)}L${point(558,2400,30)}M${point(558,near,40)}L${point(558,2400,40)}`}/>
      {depths.map(z=><path key={z} d={`M${point(558,z,40)}L${point(558,z)}`}/>)}
    </g>
    {actors.map(({name,local,depth,yaw})=>{
      const ground=project(local.x,depth),scale=focal/depth*.7,rear=Math.cos(yaw)>=0,lean=Math.sin(yaw)*13
      return <g key={name} className={`ss-front-car ss-front-car-${name}`} data-front-car={name} data-front-face={rear?'rear':'front'} transform={`translate(${ground.x} ${ground.y}) scale(${scale})`} opacity={Math.min(1,(depth-near)/80)}>
        <ellipse className="ss-front-shadow" cx="0" cy="-1" rx="53" ry="6"/>
        <path className="ss-front-tires" d="M-45 -21V-4Q-45 0-41 0H-33V-17M45 -21V-4Q45 0 41 0H33V-17"/>
        <path className="ss-front-body" d={`M-48 -18L-49 -36Q-49 -43-42 -46L${-31+lean} -69Q${-28+lean} -74 ${-19+lean} -75H${20+lean}Q${29+lean} -74 ${33+lean} -68L43 -45Q49 -42 49 -36L48 -18Q47 -10 39 -9H-39Q-47 -10-48 -18Z`}/>
        <path className="ss-front-glass" d={`M${-30+lean} -66Q${-27+lean} -70 ${-18+lean} -71H${18+lean}Q${26+lean} -70 ${29+lean} -65L36 -48Q0 -44-36 -48Z`}/>
        <path className="ss-front-secondary" d={`M-42 -45Q0 -40 43 -45M-46 -23Q0 -19 46 -23M-36 -47L${-31+lean} -65M36 -47L${29+lean} -65M-47 -35L-55 -38V-44L-41 -43M47 -35L55 -38V-44L41 -43`}/>
        <path className={rear?'ss-front-rear-lights':'ss-front-headlights'} d="M-43 -36L-26 -34L-25 -29L-43 -30ZM43 -36L26 -34L25 -29L43 -30Z"/>
        <path className="ss-front-secondary" d={rear?'M-8 -28H8V-22H-8ZM-15 -15H15':'M-18 -31H18L14 -25H-14Z'}/>
        <path className="ss-front-body-line" d={`M${-19+lean} -75Q${lean} -78 ${20+lean} -75`}/>
      </g>
    })}
    <path className="ss-front-hood" d={`M${width*.08} ${height}Q${width*.1} ${height*.93} ${width*.25} ${height*.91}Q${width*.48} ${height*.88} ${width*.72} ${height*.92}Q${width*.85} ${height*.94} ${width*.9} ${height}Z`}/>
    <path className="ss-front-hood-line" d={`M${width*.25} ${height*.935}Q${width*.48} ${height*.908} ${width*.72} ${height*.946}`}/>
  </g>
}
