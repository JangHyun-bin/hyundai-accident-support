import type {ButtonHTMLAttributes,ReactNode} from 'react'
import {CareAction,CareHeading,CareStatus,type CareTone} from '@/components/ui/after-care'
import {TaskLayout,VehicleShell} from '@/components/ui/after-care-layout'
import type {Device} from './case'
export type {Device} from './case'
import './journey.css'
import {GuidanceControl} from '@/audio/GuidanceControl'
import scripts from '@/audio/journey-guidance.json'

export type JourneyTone=CareTone
export function JourneyStatus({tone,children}:{tone:JourneyTone;children:ReactNode}) {
  return <CareStatus tone={tone} className="journey-status">{children}</CareStatus>
}
export function JourneyAction({className='',...props}:ButtonHTMLAttributes<HTMLButtonElement>&{secondary?:boolean}) {
  return <CareAction {...props} className={`journey-action ${className}`}/>
}
export function JourneyHeading({step,title,children,guidanceKey=title}:{step?:string;title:string;children?:ReactNode;guidanceKey?:string}) {
  const text=scripts[title as keyof typeof scripts]
  return <div className="ac-task-heading"><CareHeading eyebrow={step} title={title}>{children}</CareHeading>{text&&<GuidanceControl text={text} contextKey={guidanceKey}/>}</div>
}
export function JourneyVehicleFrame({children}:{children:ReactNode;navigation?:ReactNode}) {
  return <div className="journey-vehicle-viewport"><VehicleShell>{children}</VehicleShell></div>
}
export function JourneyLayout({device,summary,children,action,navigation}:{device:Device;summary:ReactNode;children:ReactNode;action?:ReactNode;navigation?:ReactNode}) {
  const surface=<section className="journey-surface ac-system" data-journey-device={device}>
    <TaskLayout summary={<div className="journey-summary">{summary}</div>} navigation={device==='vehicle'?navigation:undefined} action={action}>
      <div className="journey-response"><div className="journey-content">{children}</div></div>
    </TaskLayout>
  </section>
  return device==='vehicle'?<JourneyVehicleFrame>{surface}</JourneyVehicleFrame>:<div className="journey-mobile-viewport">{surface}</div>
}
