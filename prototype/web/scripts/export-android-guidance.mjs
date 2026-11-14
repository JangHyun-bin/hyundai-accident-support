import { copyFile, readdir, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'

const scenario = process.argv[2] ?? 'SC05'
const web = new URL('../public/guidance-audio/', import.meta.url).pathname
const android = new URL('../../android/app/src/main/assets/guidance/', import.meta.url).pathname
const assets = JSON.parse(await readFile(new URL('../src/audio/assets.json', import.meta.url), 'utf8'))
const selected = assets.filter(asset => asset.sources.some(source => source.startsWith(`${scenario}/`)))
if (!selected.length) throw new Error(`No guidance assets for ${scenario}`)

const keep = new Set(selected.flatMap(asset => [asset.file, asset.file.replace(/\.mp3$/, '.json')]))
for (const name of await readdir(android)) if (!keep.has(name)) await rm(join(android, name))
for (const name of keep) await copyFile(join(web, name), join(android, name))
console.log(JSON.stringify({ scenario, files: selected.length, scripts: selected.map(asset => asset.script) }, null, 2))
