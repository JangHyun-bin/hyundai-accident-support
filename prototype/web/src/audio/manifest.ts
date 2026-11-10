import assets from './assets.json'
export type GuidanceAsset={script:string;scriptHash:string;path:string;voiceId:string;voiceName:string;model:string;duration:number;audioHash:string}
const byText=new Map<string,GuidanceAsset>(assets.map(asset=>[asset.script,asset]))
export function guidanceAsset(text:string):GuidanceAsset|undefined{return byText.get(text)}
