import {createContext,useContext} from 'react'
import type {CellId} from './flow-geometry'
import type {FlowLayout} from './flow-study-model'
import type {Point,SlotRect} from './split-geometry'

export type FlowMode='wide'|'narrow'|'mobile'|'document'
export type FlowMetrics={rem:number;bodyLineHeight:number;headingLineHeight:number;callLineHeight:number;labelLineHeight:number;touch:number}
export type FlowFrameInput={width:number;height:number;device:'vehicle'|'mobile';metrics:FlowMetrics}
export type FlowFrame=FlowFrameInput&{mode:FlowMode;contentHeight:number;statusHeight:number;dockHeight:number;revision:string;reason:string}
export const FlowFrameContext=createContext<FlowFrame|null>(null)
export const useFlowFrame=()=>useContext(FlowFrameContext)

export type FlowShape={polygon:Point[];bounds:SlotRect;path:string;areaFraction:number}
export type FlowShapeFrame=Record<CellId,FlowShape|null>
export type FlowPlannedCell={id:CellId;shape:FlowShape|null;slot:SlotRect;variant:'full'|'summary';visible:boolean;scroll:boolean}
export type FlowPlan={layout:FlowLayout;mode:FlowMode;width:number;height:number;cells:Record<CellId,FlowPlannedCell>}
