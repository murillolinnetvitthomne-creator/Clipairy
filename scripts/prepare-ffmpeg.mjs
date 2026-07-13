import { chmod, copyFile, mkdir, stat } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const sourcePath = require('ffmpeg-static')
const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const destinationPath = join(projectRoot, '.vercel-tools', 'ffmpeg')

if (!sourcePath) {
  throw new Error(`ffmpeg-static does not provide a binary for ${process.platform}-${process.arch}`)
}

await mkdir(dirname(destinationPath), { recursive: true })
await copyFile(sourcePath, destinationPath)
await chmod(destinationPath, 0o755)

const destination = await stat(destinationPath)
if (!destination.isFile()) {
  throw new Error(`FFmpeg preparation failed: ${destinationPath} is not a file`)
}

console.log(`Prepared FFmpeg for ${process.platform}-${process.arch}`)
