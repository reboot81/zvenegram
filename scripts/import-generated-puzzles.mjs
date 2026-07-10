import { copyFile, access } from 'node:fs/promises'
import { constants } from 'node:fs'
import { resolve } from 'node:path'

const options = Object.fromEntries(process.argv.slice(2).map((argument) => {
  const [key, value = 'true'] = argument.replace(/^--/, '').split('=')
  return [key, value]
}))

const source = resolve(options.source ?? '../zvenegram-dictionary/data/generated/puzzles.json')
const output = resolve(options.output ?? 'src/data/generated-puzzles.json')

await access(source, constants.R_OK)
await copyFile(source, output)
console.log(`Copied generated puzzles from ${source} to ${output}`)
