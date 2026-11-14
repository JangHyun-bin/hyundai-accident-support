export type FlowStep=1|2|3|4|5|6|7
export type FlowLayout='detect'|'evacuate'|'safe'|'review'|'sending'|'calm'
export type FlowState={step:FlowStep;call:'waiting'|'connected'|'ended';checks:boolean[];note:string;transfer:'idle'|'sending'|'failed'|'sent';driving:boolean}
export type FlowEvent={type:'NEXT'|'CONFIRM_SAFE'|'SEND'|'END_CALL'|'BACK'|'RESET'}|{type:'CHECK';index:number}|{type:'EDIT';note:string}|{type:'RESULT';ok:boolean}|{type:'DRIVING';value:boolean}
export const stageLabels=['상황 확인','119 연결','대피 안내','안전 확보','기록','보험사 전달','완료']
export const checklistLabels=['비상등 켜기','트렁크 열기','대피할 곳 찾기','휴대폰 챙기기']
export function initialFlow():FlowState{return {step:1,call:'waiting',checks:[false,false,false,false],note:'2차로 주행 중 우측 차량과 접촉했습니다. 기억나는 내용부터 확인하고 있어요.',transfer:'idle',driving:false}}
export function flowReducer(s:FlowState,event:FlowEvent):FlowState{
 if(event.type==='RESET')return initialFlow()
 if(event.type==='DRIVING')return {...s,driving:event.value}
 if(event.type==='END_CALL')return s.call==='connected'?{...s,call:'ended'}:s
 if(event.type==='RESULT')return s.transfer==='sending'?{...s,step:event.ok?7:6,transfer:event.ok?'sent':'failed'}:s
 // Emergency call status can change while driving; editing and nonurgent navigation cannot.
 if(s.driving&&!(event.type==='NEXT'&&s.step===1))return s
 switch(event.type){
  case 'NEXT':
   if(s.step===1)return {...s,step:2,call:'connected'}
   if(s.step===2)return {...s,step:3}
   if(s.step===4)return {...s,step:5}
   if(s.step===5&&s.note.trim())return {...s,step:6,transfer:'idle'}
   return s
  case 'CONFIRM_SAFE':return s.step===3?{...s,step:4}:s
  case 'CHECK':return s.step===3&&Number.isInteger(event.index)&&event.index>=0&&event.index<4?{...s,checks:s.checks.map((value,i)=>i===event.index?!value:value)}:s
  case 'EDIT':return s.step===5?{...s,note:event.note.slice(0,500)}:s
  case 'SEND':return s.step===6&&s.transfer!=='sending'&&s.note.trim()?{...s,transfer:'sending'}:s
  case 'BACK':return s.step>1&&s.transfer!=='sending'?{...s,step:(s.step-1) as FlowStep,transfer:'idle'}:s
 }
}
export function layoutFor(s:FlowState):FlowLayout{
 if(s.step===7)return s.call==='connected'?'sending':'calm'
 if(s.step===6)return s.transfer==='sending'?'sending':'review'
 if(s.step>=4)return 'safe'
 return s.step===3?'evacuate':'detect'
}
export const layoutLabels:Record<FlowLayout,string>={detect:'안전 · 긴급 통화',evacuate:'대피 안내 중심',safe:'사고 기록 중심',review:'보낼 내용 확인',sending:'보험사 전달 중심',calm:'숨 고르기'}
export const stepCopy:Record<FlowStep,{title:string;support:string;action:string}>={
 1:{title:'충격이 감지됐어요',support:'119에 연결해 도움을 요청하세요.',action:'119에 연결하기'},
 2:{title:'119와 통화 중이에요',support:'통화하며 안전 안내를 확인할 수 있어요.',action:'안전 안내 보기'},
 3:{title:'안전한 곳으로 이동하세요',support:'안전한 곳에 도착하면 알려주세요.',action:'안전한 곳에 도착했어요'},
 4:{title:'안전한 곳에 도착했어요',support:'이제 기억나는 내용을 남겨주세요.',action:'사고 기록 시작'},
 5:{title:'기억나는 내용을 확인해 주세요',support:'확실한 내용만 남겨도 괜찮아요.',action:'기록 확인하기'},
 6:{title:'보험사에 보낼 내용을 확인하세요',support:'확인한 기록을 보험사에 전달해요.',action:'보험사에 보내기'},
 7:{title:'보험사에 전송했어요',support:'접수 여부는 아직 확인되지 않았어요.',action:'처음부터 보기'},
}
