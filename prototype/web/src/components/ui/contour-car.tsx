import {useId} from 'react'
import './vehicle-contour.css'

export const contourBodyPath='M231 49C250 39 310 39 329 49C349 58 358 80 361 112L365 204L364 373L359 439C357 463 348 477 327 484C302 491 258 491 233 484C212 477 203 463 201 439L196 373L195 204L199 112C202 80 211 58 231 49Z'

// B / Contour의 공용 차체. 상세 view와 주변 scene에서 같은 geometry 사용.
export function ContourCar(){
  const id=useId().replaceAll(':','')
  return <>
    <defs>
      <linearGradient id={`${id}-body`} x1="0" y1="0" x2="1" y2="0"><stop stopColor="var(--ac-control)" stopOpacity=".15"/><stop offset=".48" stopColor="var(--ac-muted)" stopOpacity=".09"/><stop offset="1" stopColor="var(--ac-control)" stopOpacity=".2"/></linearGradient>
      <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="var(--ac-muted)" stopOpacity=".12"/><stop offset="1" stopColor="var(--ac-background)" stopOpacity=".45"/></linearGradient>
    </defs>
        <g className="ac-contour-car" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path className="ac-contour-tires" d="M195 155V213M365 155V213M195 367V428M365 367V428"/>
          <path className="ac-contour-body" fill={`url(#${id}-body)`} d={contourBodyPath}/>
          <path className="ac-contour-secondary" d="M230 59C251 49 309 49 330 59C346 67 350 86 353 114L356 204L355 375L350 438Q348 465 325 473Q280 488 235 473Q212 465 210 438L205 375L204 204L207 114C210 86 214 67 230 59Z"/>
          <path className="ac-contour-secondary" d="M211 119Q280 100 349 119M218 119L222 150M342 119L338 150M238 59L232 105M322 59L328 105"/>
          <path className="ac-contour-glass" fill={`url(#${id}-glass)`} d="M218 165Q280 136 342 165L329 222Q280 207 231 222Z"/>
          <path className="ac-contour-secondary" d="M221 174Q280 149 339 174M233 214Q280 200 327 214"/>
          <path className="ac-contour-roof" fill={`url(#${id}-glass)`} d="M233 233Q280 221 327 233L332 345Q280 361 228 345Z"/>
          <path className="ac-contour-secondary" d="M241 242Q280 233 319 242L323 337Q280 348 237 337Z"/>
          <path className="ac-contour-glass" fill={`url(#${id}-glass)`} d="M226 357Q280 375 334 357L334 410Q280 437 226 410Z"/>
          <path className="ac-contour-secondary" d="M227 402Q280 428 333 402M214 429Q280 457 346 429M220 454Q280 474 340 454"/>
          <path className="ac-contour-secondary" d="M212 195L224 229L219 340L210 380ZM348 195L336 229L341 340L350 380ZM212 275L221 278M348 275L339 278M214 295V309M346 295V309"/>
          <path className="ac-contour-mirrors" d="M196 186L181 194Q176 198 181 202L195 200M364 186L379 194Q384 198 379 202L365 200"/>
          <path className="ac-contour-secondary" d="M215 85L230 77M330 77L345 85M216 460L232 467M328 467L344 460"/>
        </g>
  </>
}
