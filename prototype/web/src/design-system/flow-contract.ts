import {createContext,useContext} from 'react'
import type {CellId,FlowLayout} from './flow-study-model'
import type {Point,SlotRect} from './split-geometry'

export type FlowMode='wide'|'narrow'|'mobile'|'document'
export type FlowMetrics={rem:number;bodyLineHeight:number;headingLineHeight:number;callLineHeight:number;labelLineHeight:number;touch:number}
export type FlowFrameInput={width:number;height:number;device:'vehicle'|'mobile';metrics:FlowMetrics}
export type FlowFrame=FlowFrameInput&{mode:FlowMode;contentHeight:number;statusHeight:number;dockHeight:number;revision:string;reason:string}
export const FlowFrameContext=createContext<FlowFrame|null>(null)
export const useFlowFrame=()=>useContext(FlowFrameContext)

export type FlowShape={polygon:Point[];bounds:SlotRect;path:string;areaFraction:number}
// Weighted Voronoi (power diagram): a board point belongs to the cell whose plane is highest there.
export type FlowPlane={x:number;y:number;offset:number}
export type FlowShapeFrame={width:number;height:number;planes:Record<CellId,FlowPlane>;shapes:Record<CellId,FlowShape|null>}
export type FlowPlannedCell={id:CellId;shape:FlowShape|null;slot:SlotRect;variant:'full'|'summary';visible:boolean;scroll:boolean}
export type FlowPlan={layout:FlowLayout;mode:FlowMode;width:number;height:number;planes:Record<CellId,FlowPlane>;cells:Record<CellId,FlowPlannedCell>}
