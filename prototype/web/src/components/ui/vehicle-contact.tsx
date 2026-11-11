import {motion,useReducedMotion} from 'motion/react'
import './vehicle-contact.css'

type Pose={x:number;y:number;heading:number}
type Point={x:number;y:number}
export type VehicleContactGeometry={ownEdge:string;otherEdge:string;anchor:Point}

// Contour asset의 local 좌표를 차량 pose에 붙임. 화면 좌표나 차량 간 겹침으로 접촉점을 추론하지 않음.
export function contactWorldPoint(pose:Pose,anchor:Point):Point {
  const x=(anchor.x-280)*.34,y=(anchor.y-265)*.34,angle=pose.heading*Math.PI/180
  return {x:pose.x+x*Math.cos(angle)-y*Math.sin(angle),y:pose.y+x*Math.sin(angle)+y*Math.cos(angle)}
}
const carTransform=(pose:Pose)=>`translate(${pose.x} ${pose.y}) rotate(${pose.heading}) scale(.34) translate(-280 -265)`

export function CareVehicleContact({own,other,geometry,scale,selected,labelId,onToggle}:{
  own:Pose;other:Pose;geometry:VehicleContactGeometry;scale:number;selected:boolean;labelId:string;onToggle:()=>void
}){
  const reduce=useReducedMotion(),point=contactWorldPoint(own,geometry.anchor)
  return <motion.g className="ac-vehicle-contact" data-contact-marker data-selected={selected} initial={{opacity:0}} animate={{opacity:1}} transition={{duration:reduce?0:.24}}>
    <g transform={carTransform(other)} data-contact-edge="other" aria-hidden="true"><path className="ac-contact-edge" d={geometry.otherEdge}/></g>
    <g transform={carTransform(own)} data-contact-edge="own" aria-hidden="true"><path className="ac-contact-edge" d={geometry.ownEdge}/><path className="ac-contact-core" d={geometry.ownEdge}/></g>
    <g transform={`translate(${point.x} ${point.y}) scale(${1/scale})`} className="ac-contact-target" data-contact-trigger role="button" tabIndex={0} aria-label="접촉 부위 자세히 보기" aria-expanded={selected} aria-controls={selected?labelId:undefined} onClick={event=>{event.stopPropagation();onToggle()}} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();onToggle()}}}>
      <circle className="ac-contact-hit" cx="8" r="32"/>
      <circle className="ac-contact-dot" r={selected?3.5:2.2} aria-hidden="true"/>
    </g>
  </motion.g>
}
