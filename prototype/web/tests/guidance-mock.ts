declare global {interface Window {guidanceMock:{played:string[];audios:EventTarget[];cancels:number;fail:boolean}}}
export function mockGuidanceAudio(){
 const runtime=window
 runtime.guidanceMock={played:[],audios:[],cancels:0,fail:false}
 class AudioMock extends EventTarget {
  src:string;preload='';currentTime=0
  constructor(src=''){super();this.src=src;runtime.guidanceMock.audios.push(this)}
  play(){runtime.guidanceMock.played.push(this.src);if(runtime.guidanceMock.fail)return Promise.reject(new Error('Audio unavailable'));this.dispatchEvent(new Event('playing'));return Promise.resolve()}
  pause(){runtime.guidanceMock.cancels++} removeAttribute(){} load(){}
 }
 Object.defineProperty(window,'Audio',{value:AudioMock})
}
