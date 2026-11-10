import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, RotateCcw, RotateCw, Undo2 } from 'lucide-react'
import { JourneyAction } from './JourneyLayout'
import type { Diagram, Point } from './case'
import './reconstruction.css'

type Target = 'own' | 'other' | 'contact'
const labels: Record<Target, string> = { own: '내 차량', other: '상대 차량', contact: '접촉 위치' }
const clamp = (n: number) => Math.round(Math.min(1, Math.max(0, n)) * 1000) / 1000
const geometry = (value: Diagram) => JSON.stringify([value.road, value.vehicles, value.contact])

export function DiagramEditor({ value, original: providedOriginal, onChange, onDirtyChange, readOnly = false }: {
  value: Diagram; original?: Diagram; onChange?: (next: Diagram) => void; readOnly?: boolean; onDirtyChange?: (dirty: boolean) => void
}) {
  const [initial] = useState(() => structuredClone(value))
  const [draft, setDraft] = useState(() => structuredClone(value))
  const [undo, setUndo] = useState<Diagram[]>([])
  const [target, setTarget] = useState<Target>(value.vehicles[0]?.id ?? 'contact')
  const [showOriginal, setShowOriginal] = useState(false)
  const canvas = useRef<SVGSVGElement>(null)
  const drag = useRef<{ pointer: number; target: Target; before: Diagram; offset: Point } | null>(null)
  const latest = useRef(draft)
  const locked = readOnly || showOriginal
  const dirty = !readOnly && geometry(draft) !== geometry(value)
  const shown = readOnly ? value : showOriginal ? providedOriginal ?? initial : draft
  const selected = draft.vehicles.find(car => car.id === target)
  const savedGeometry = geometry(value)

  useEffect(() => {
    setDraft(structuredClone(value)); latest.current = value; setUndo([])
  }, [value.revision, savedGeometry])

  useEffect(() => { onDirtyChange?.(dirty) }, [dirty, onDirtyChange])

  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  function edit(next: Diagram, remember = true) {
    if (locked || geometry(next) === geometry(latest.current)) return
    const before = structuredClone(latest.current)
    if (remember) setUndo(previous => [...previous.slice(-49), before])
    latest.current = next
    setDraft(next)
  }

  function position(id: Target, point: Point, remember = true) {
    const next = structuredClone(latest.current)
    const normalized = { x: clamp(point.x), y: clamp(point.y) }
    if (id === 'contact') next.contact = normalized
    else {
      const car = next.vehicles.find(item => item.id === id)
      if (!car) return
      car.position = normalized
    }
    edit(next, remember)
  }

  function move(dx: number, dy: number, id = target) {
    const point = id === 'contact' ? latest.current.contact : latest.current.vehicles.find(car => car.id === id)?.position
    if (point) position(id, { x: point.x + dx, y: point.y + dy })
  }

  function rotate(amount: number) {
    const next = structuredClone(latest.current)
    const car = next.vehicles.find(item => item.id === target)
    if (car) { car.heading = (car.heading + amount + 360) % 360; edit(next) }
  }

  function keyMove(event: KeyboardEvent<SVGGElement>, id: Target) {
    const directions: Record<string, [number, number]> = { ArrowUp: [0, -.05], ArrowDown: [0, .05], ArrowLeft: [-.05, 0], ArrowRight: [.05, 0] }
    if (!directions[event.key] || locked) return
    event.preventDefault(); setTarget(id); move(...directions[event.key], id)
  }

  function pointerPosition(event: PointerEvent<SVGElement>): Point {
    const box = canvas.current!.getBoundingClientRect()
    return { x: (event.clientX - box.left) / box.width, y: (event.clientY - box.top) / box.height }
  }

  function startDrag(event: PointerEvent<SVGGElement>, id: Target) {
    if (locked) return
    const point = id === 'contact' ? draft.contact : draft.vehicles.find(car => car.id === id)?.position
    if (!point) return
    const pointer = pointerPosition(event)
    setTarget(id)
    drag.current = { pointer: event.pointerId, target: id, before: structuredClone(draft), offset: { x: pointer.x - point.x, y: pointer.y - point.y } }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function dragTo(event: PointerEvent<SVGSVGElement>) {
    const current = drag.current
    if (!current || current.pointer !== event.pointerId) return
    const point = pointerPosition(event)
    position(current.target, { x: point.x - current.offset.x, y: point.y - current.offset.y }, false)
  }

  function finishDrag() {
    const before = drag.current?.before
    if (before && geometry(before) !== geometry(latest.current)) setUndo(previous => [...previous.slice(-49), before])
    drag.current = null
  }

  // shortcut: 직선 도로·두 차량만 표현. 교차로·다중 차량 지원 시 geometry와 편집 범위 확장 필요.
  if (value.road !== 'straight' || value.vehicles.length > 2) return <section className="journey-diagram-unavailable">
    <h2>이 도로는 도식으로 표현하기 어려워요</h2><p>도식 없이도 기억나는 내용을 남기고 다음 단계로 갈 수 있어요.</p>
  </section>

  return <section className="journey-diagram-editor" aria-label={readOnly ? "보낼 사고 도식" : "사고 도식 편집"} data-readonly={readOnly}>
    {!readOnly && <><div className="journey-reconstruction-heading"><div><h2>사고 상황을 확인해주세요</h2><p>차량 위치와 방향이 기억과 다르면 고칠 수 있어요.</p></div></div>
    <div className="journey-diagram-toolbar"><span>{showOriginal ? '처음 제안된 도식' : dirty || value.origin === 'user' ? '사용자 정정' : '추정 도식'}</span>
      <button type="button" className="journey-text-action" onClick={() => setShowOriginal(v => !v)}>{showOriginal ? '정정본 보기' : '원본 보기'}</button></div></>}
    <svg ref={canvas} className="journey-diagram-canvas" data-testid="diagram-canvas" viewBox="0 0 1000 1000" aria-label="차량 위치와 접촉 위치 도식"
      onPointerMove={dragTo} onPointerUp={finishDrag} onPointerCancel={finishDrag}>
      <rect className="journey-diagram-ground" width="1000" height="1000" rx="32" />
      <path className="journey-diagram-road" d="M160 0H840V1000H160Z" />
      <path className="journey-diagram-edge" d="M185 0V1000M815 0V1000" />
      <path className="journey-diagram-lane" d="M500 0V1000" />
      {shown.vehicles.map(car => <g key={car.id} role={readOnly ? "img" : "button"} tabIndex={locked ? -1 : 0} aria-label={labels[car.id] + ' 위치'}
        aria-pressed={readOnly ? undefined : !locked && target === car.id} className={`journey-diagram-car${target === car.id && !locked ? ' is-selected' : ''}`}
        transform={`translate(${car.position.x * 1000} ${car.position.y * 1000})`} onPointerDown={event => startDrag(event, car.id)}
        onKeyDown={event => keyMove(event, car.id)} onClick={() => !locked && setTarget(car.id)}>
        <rect className="journey-diagram-hit-target" x="-100" y="-130" width="200" height="260" />
        <g transform={`rotate(${car.heading})`}><rect className="journey-diagram-car-body" x="-57" y="-96" width="114" height="192" rx="27" />
          <path className="journey-diagram-window" d="M-42-37L-31-66H31L42-37ZM-41 44H41L32 68H-32Z" />
          <path className="journey-diagram-direction" d="M0-130V-172M-14-156L0-172L14-156" /></g>
        <text y="140" textAnchor="middle">{labels[car.id]}</text>
      </g>)}
      {shown.contact && <g className={`journey-diagram-contact${target === 'contact' && !locked ? ' is-selected' : ''}`} role={readOnly ? "img" : "button"} tabIndex={locked ? -1 : 0}
        aria-label="접촉 위치 표시" aria-pressed={readOnly ? undefined : !locked && target === 'contact'} transform={`translate(${shown.contact.x * 1000} ${shown.contact.y * 1000})`}
        onPointerDown={event => startDrag(event, 'contact')} onKeyDown={event => keyMove(event, 'contact')} onClick={() => !locked && setTarget('contact')}>
        <circle r="90" className="journey-diagram-hit-target" /><circle r="19" /><path d="M-9 0H9M0-9V9" />
      </g>}
    </svg>
    <p className="journey-reconstruction-note">도식은 사고 경위 확인을 돕는 그림이에요. 과실이나 충돌 사실을 확정하지 않아요.</p>
    {!readOnly && <><div className="journey-diagram-targets" role="group" aria-label="수정할 항목">
      {([...value.vehicles.map(car => car.id), 'contact'] as Target[]).map(id => <button key={id} type="button" aria-pressed={target === id} disabled={showOriginal}
        onClick={() => { setTarget(id); if (id === 'contact' && !draft.contact) position('contact', { x: .5, y: .5 }) }}>{labels[id]}</button>)}
    </div>
    <div className="journey-diagram-controls" role="group" aria-label={labels[target] + ' 정정'}>
      <span className="journey-diagram-control-label">위치</span>
      <div className="journey-diagram-moves">
        {([{ label: '왼쪽으로 이동', Icon: ArrowLeft, dx: -.05, dy: 0 }, { label: '위로 이동', Icon: ArrowUp, dx: 0, dy: -.05 },
          { label: '아래로 이동', Icon: ArrowDown, dx: 0, dy: .05 }, { label: '오른쪽으로 이동', Icon: ArrowRight, dx: .05, dy: 0 }]).map(({ label, Icon, dx, dy }) =>
          <button key={label} type="button" aria-label={label} disabled={showOriginal || target === 'contact' && !draft.contact} onClick={() => move(dx, dy)}><Icon aria-hidden="true" /></button>)}
      </div>
      {selected && <><span className="journey-diagram-control-label">진행 방향 <strong>{selected.heading}°</strong></span><div className="journey-diagram-turns">
        <button type="button" disabled={showOriginal} aria-label="반시계 방향으로 회전" onClick={() => rotate(-15)}><RotateCcw aria-hidden="true" />15°</button>
        <button type="button" disabled={showOriginal} aria-label="시계 방향으로 회전" onClick={() => rotate(15)}><RotateCw aria-hidden="true" />15°</button>
      </div></>}
    </div>
    <div className="journey-diagram-save"><button className="journey-text-action" type="button" disabled={!undo.length || showOriginal} onClick={() => {
      const previous = undo.at(-1)!
      setUndo(history => history.slice(0, -1)); latest.current = previous; setDraft(previous)
    }}><Undo2 aria-hidden="true" />되돌리기</button>
      <JourneyAction disabled={!dirty || showOriginal} onClick={() => onChange?.({ ...structuredClone(draft), origin: 'user', revision: value.revision + 1, confirmedRevision: null })}><Check aria-hidden="true" />도식 정정 저장</JourneyAction>
    </div></>}
  </section>
}
