import { useEffect, useState } from 'react'
import { DiagramEditor } from './DiagramEditor'
import { JourneyAction } from './JourneyLayout'
import { readAsset } from './case-store'
import { followUpDirectories } from './follow-up-fixtures'
import type { AssetWrite, CaseCommand, Evidence, JourneyCase } from './case'
import type { Recovery } from './useJourneyCase'

function RecoveryFile({ caseId, evidence, pending }: { caseId: string; evidence: Evidence; pending?: AssetWrite }) {
  const [url, setUrl] = useState('')
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let cancelled = false, created = ''
    void (pending ? Promise.resolve(pending.blob) : evidence.assetId ? readAsset(caseId, evidence.assetId) : Promise.resolve(null)).then(blob => {
      if (cancelled) return
      if (!blob) { setFailed(true); return }
      created = URL.createObjectURL(blob); setUrl(created)
    })
    return () => { cancelled = true; if (created) URL.revokeObjectURL(created) }
  }, [caseId, evidence.assetId, pending])
  return <p>{evidence.label} · {url ? <a href={url} download={`${evidence.label}.${evidence.metadata.mime.split('/')[1].split(';')[0]}`}>자료 사본 내려받기</a> : failed ? '원본을 열 수 없어요' : '자료 확인 중'}</p>
}

function RecoveryEntry({ entry, index, current, onRestore }: { entry: Recovery; index: number; current: JourneyCase; onRestore: (command: CaseCommand) => void }) {
  const [url, setUrl] = useState('')
  const value = entry.value
  const sameCase = value.id === current.id
  useEffect(() => {
    const created = URL.createObjectURL(new Blob([JSON.stringify({ ...value, localDrafts: entry.commands }, null, 2)], { type: 'application/json' }))
    setUrl(created)
    return () => URL.revokeObjectURL(created)
  }, [value, entry.commands])
  const shop = followUpDirectories.ready.shops.find(item => item.id === value.followUp.shopId)
  return <article aria-label={`임시 기록 ${index + 1}`}>
    <h3>임시 기록 {index + 1}</h3>
    <p>이 내용은 현재 기록과 별도로 보관 중이에요. 다시 불러오면 새 편집으로 보관되며, 전송 전 내용을 다시 확인해야 해요.</p>
    {value.statements.length > 0 && <section><h4>남긴 이야기</h4>{value.statements.map(item => <p key={item.id}>{item.text}</p>)}</section>}
    {entry.commands.map((command, index) => command.type === 'voice-save' && command.statement &&
      !value.statements.some(item => item.id === command.statement!.id && item.text === command.statement!.text) &&
      <section key={index}><h4>저장하지 못한 이야기</h4><p>{command.statement.text}</p></section>)}
    {value.report && <section><h4>경위서</h4>{value.report.paragraphs.map(item => <p key={item.id}>{item.text}</p>)}
      {sameCase && <JourneyAction secondary onClick={() => onRestore({ type: 'report-restore', report: value.report! })}>이 경위서 다시 불러오기</JourneyAction>}
    </section>}
    {entry.commands.filter(command => command.type === 'paragraph-edit' && !value.report?.paragraphs.some(p => p.id === command.id && p.text === command.text))
      .map((command, index) => command.type === 'paragraph-edit' && <section key={index}><h4>저장하지 못한 경위서 문장</h4><p>{command.text}</p></section>)}
    {value.diagram && <section><h4>사고 도식</h4><DiagramEditor value={value.diagram} readOnly />
      {sameCase && <JourneyAction secondary onClick={() => onRestore({ type: 'diagram-edit', diagram: value.diagram! })}>이 도식 다시 불러오기</JourneyAction>}
    </section>}
    {(value.followUp.shopId || value.followUp.repairItems.length > 0) && <section><h4>후속 처리 선택</h4><p>{shop?.name ?? '정비소 이름 확인 필요'}</p>
      {value.followUp.repairItems.map(item => <p key={item}>{item}</p>)}
      {sameCase && <JourneyAction secondary onClick={() => onRestore({ type: 'follow-up', now: new Date().toISOString(), value: { ...current.followUp,
        shopId: value.followUp.shopId, repairItems: value.followUp.repairItems, source: 'user', updatedAt: new Date().toISOString() } })}>점검 선택 다시 불러오기</JourneyAction>}
    </section>}
    {value.evidence.length > 0 && <section><h4>남긴 자료</h4>{value.evidence.map(item => <RecoveryFile key={item.id} caseId={value.id} evidence={item} pending={entry.assets.find(asset => asset.id === item.assetId)} />)}</section>}
    {entry.commands.flatMap(command => command.type === 'voice-save' ? command.evidence : [])
      .filter(item => !value.evidence.some(evidence => evidence.id === item.id))
      .map(item => <RecoveryFile key={item.id} caseId={value.id} evidence={item} pending={entry.assets.find(asset => asset.id === item.assetId)} />)}
    <a href={url} download={`incident-draft-${index + 1}.json`}>전체 기록 사본 내려받기</a>
  </article>
}

export function JourneyRecovery({ entries, current, onRestore }: { entries: Recovery[]; current: JourneyCase; onRestore: (command: CaseCommand) => void }) {
  if (!entries.length) return null
  return <details className="journey-recovery"><summary>내 임시 기록 확인</summary>
    <p>이 화면을 닫으면 임시 기록은 사라져요. 필요한 내용을 다시 불러오거나 사본을 보관해주세요. 기관별 요청 결과와 승인 이력은 바뀌지 않아요.</p>
    {entries.map((entry, index) => <RecoveryEntry key={index} entry={entry} index={index} current={current} onRestore={onRestore} />)}
  </details>
}
