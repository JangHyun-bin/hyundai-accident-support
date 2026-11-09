import type { Point, Source } from './case'

export type FollowUpDirectoryState = 'ready' | 'stale' | 'empty' | 'failed'
export type FollowUpShop = {
  id: string; name: string; description: string; distanceMeters: number | null; intakeAt: string | null; position: Point | null
}
export type FollowUpDirectory = {
  status: FollowUpDirectoryState; shops: readonly FollowUpShop[]; source: Source | null; sourceLabel: string
  updatedAt: string | null; origin: Point | null
}

// 실제 정비소·거리·입고 조회 결과가 아닌, 재현 가능한 합성 fixture.
const shops: FollowUpShop[] = [
  { id: 'gaon-service', name: '가온 정비센터', description: '차체·일반 정비', distanceMeters: 2400,
    intakeAt: '2026-11-10T13:00:00.000Z', position: { x: .7, y: .35 } },
  { id: 'daon-service', name: '다온 자동차 정비', description: '일반 정비·차량 점검', distanceMeters: 4100,
    intakeAt: null, position: { x: .25, y: .2 } },
]
const ready: FollowUpDirectory = { status: 'ready', shops, source: 'fixture', sourceLabel: '제공된 정비소 정보',
  updatedAt: '2026-11-10T09:12:00.000Z', origin: { x: .4, y: .7 } }
export const followUpDirectories: Record<FollowUpDirectoryState, FollowUpDirectory> = {
  ready,
  stale: { ...ready, status: 'stale', updatedAt: '2026-11-08T09:12:00.000Z' },
  empty: { ...ready, status: 'empty', shops: [], origin: null },
  failed: { ...ready, status: 'failed', shops: [], updatedAt: null, origin: null },
}
export const followUpRepairItems = ['앞 범퍼 외관', '전면등 작동', '차체 정렬'] as const
