import { useEffect, useState } from 'react'
import { DiagramEditor } from './DiagramEditor'
import { JourneyAction } from './JourneyLayout'
import { useCaseData } from './case-data'
import { followUpDirectories } from './follow-up-fixtures'
import type { AssetWrite, CaseCommand, Evidence, JourneyCase } from './case'
import type { Recovery } from './useJourneyCase'

function RecoveryFile({ caseId, evidence, pending }: { caseId: string; evidence: Evidence; pending?: AssetWrite }) {
  const data = useCaseData()
  const [url, setUrl] = useState('')
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let cancelled = false, created = ''
    setUrl(''); setFailed(false)
    void (pending ? Promise.resolve(pending.blob) : evidence.assetId ? data.readAsset(caseId, evidence.assetId) : Promise.resolve(null)).then(blob => {
      if (cancelled) return
      if (!blob) { setFailed(true); return }
      created = URL.createObjectURL(blob); setUrl(created)
    }).catch(() => { if (!cancelled) setFailed(true) })
    return () => { cancelled = true; if (created) URL.revokeObjectURL(created) }
  }, [data, caseId, evidence.assetId, pending])
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
    <p>현재 기록과 따로 남긴 내용이에요. 다시 불러오면 새 편집이 돼요. 적용한 내용을 다시 확인해주세요.</p>
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

export function JourneyRecovery({ entries, current, onRestore, durable=false }: { entries: Recovery[]; current: JourneyCase; onRestore: (command: CaseCommand) => void; durable?:boolean }) {
  if (!entries.length) return null
  return <details className="journey-recovery"><summary>내 임시 기록 확인</summary>
    <p>{durable ? '이 기기에 따로 보관한 초안이에요. 필요한 내용만 다시 불러오고 확인해주세요.' : '화면을 닫으면 임시 기록을 잃을 수 있어요. 필요한 내용을 다시 저장하거나 사본을 내려받아주세요.'} 이전 승인 기록은 바뀌지 않아요.</p>
    {entries.map((entry, index) => <RecoveryEntry key={index} entry={entry} index={index} current={current} onRestore={onRestore} />)}
  </details>
}
