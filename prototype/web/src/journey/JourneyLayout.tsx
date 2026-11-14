import type {ButtonHTMLAttributes,ReactNode} from 'react'
import {CareAction,CareHeading,CareStatus,type CareTone} from '@/components/ui/after-care'
import {TaskLayout,VehicleShell,type AppWindow} from '@/components/ui/after-care-layout'
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
export function JourneyEditorLayout({step,title,description,children,primary,guidanceKey=title}:{step?:string;title:string;description:ReactNode;children:ReactNode;primary?:ReactNode;guidanceKey?:string}) {
  const text=scripts[title as keyof typeof scripts]
  return <>
    <div className="journey-editor-title"><CareHeading eyebrow={step} title={title}/></div>
    <div className="journey-workspace-scroll"><p className="journey-supporting">{description}</p>{text&&<GuidanceControl text={text} contextKey={guidanceKey}/>}{children}</div>
    {primary&&<div className="journey-editor-primary">{primary}</div>}
  </>
}
export function JourneyLayout({device,summary,children,action,navigation,appWindow}:{device:Device;summary:ReactNode;children:ReactNode;action?:ReactNode;navigation?:ReactNode;appWindow?:AppWindow}) {
  const surface=<section className="journey-surface ac-system" data-journey-device={device}>
    <TaskLayout summary={<div className="journey-summary">{summary}</div>} navigation={device==='vehicle'?navigation:undefined} action={action}>
      <div className="journey-response"><div className="journey-content">{children}</div></div>
    </TaskLayout>
  </section>
  if(device==='mobile')return <div className="journey-mobile-viewport">{surface}</div>
  return appWindow?<VehicleShell presentation="bounded" appWindow={appWindow}>{surface}</VehicleShell>:<div className="journey-vehicle-viewport"><VehicleShell>{surface}</VehicleShell></div>
}
