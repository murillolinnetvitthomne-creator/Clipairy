import 'server-only'
import { generateImage, experimental_generateVideo as generateVideo } from 'ai'
import { get, put } from '@vercel/blob'
import { execFile } from 'node:child_process'
import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import ffmpegPath from 'ffmpeg-static'
import { IMAGE_MODEL } from './models'
import type { StoryboardScene } from '@/lib/db/schema'
import {
  getCharacterPreset,
  QUALITY_TIERS,
  type CharacterPresetId,
  type QualityTier,
} from '@/lib/video-options'
import { PRODUCT_AUDIENCES, type ProductAudience } from '@/lib/product-audiences'

export type VideoAspectRatio = '9:16' | '16:9'
export type VideoDuration = 8 | 16 | 24 | 30

const execFileAsync = promisify(execFile)
const preparedFfmpegPath = join(process.cwd(), '.vercel-tools', 'ffmpeg')

async function resolveFfmpegPath(): Promise<string> {
  const candidates = [preparedFfmpegPath]
  if (process.env.NODE_ENV !== 'production' && ffmpegPath) candidates.push(ffmpegPath)

  for (const candidate of candidates) {
    try {
      await access(candidate)
      return candidate
    } catch {
      // Continue to the next explicit candidate.
    }
  }

  throw new Error(
    `FFmpeg binary is unavailable. Checked: ${candidates.join(', ')}. Run the postinstall preparation step before building.`,
  )
}

async function uploadBytes(bytes: Uint8Array, mediaType: string, path: string): Promise<string> {
  const blob = await put(path, Buffer.from(bytes), {
    access: 'private',
    contentType: mediaType,
    addRandomSuffix: true,
  })
  return blob.pathname
}

async function downloadBytes(pathname: string): Promise<Uint8Array> {
  const result = await get(pathname, { access: 'private' })
  if (!result || result.statusCode !== 200) throw new Error(`Generated media unavailable: ${pathname}`)
  return new Uint8Array(await new Response(result.stream).arrayBuffer())
}

async function loadCharacterReference(
  presetId?: CharacterPresetId | null,
  uploadedPath?: string | null,
): Promise<{ bytes: Uint8Array; description: string } | null> {
  if (uploadedPath) {
    return { bytes: await downloadBytes(uploadedPath), description: 'the exact person shown in the character reference image' }
  }
  const preset = getCharacterPreset(presetId)
  if (!preset) return null
  return {
    bytes: new Uint8Array(await readFile(join(process.cwd(), 'public', preset.image.replace(/^\//, '')))),
    description: preset.description,
  }
}

export async function generateStoryboardImages(
  scenes: StoryboardScene[],
  userId: string,
  genId: number,
  aspectRatio: VideoAspectRatio = '9:16',
  productImagePaths: string[] = [],
  characterPresetId?: CharacterPresetId | null,
  characterImagePath?: string | null,
  productAudience: ProductAudience = 'human',
): Promise<string[]> {
  const orientation = aspectRatio === '16:9' ? 'landscape' : 'vertical'
  const productReferences = await Promise.all(productImagePaths.map(async (pathname) => {
    const result = await get(pathname, { access: 'private' })
    if (!result || result.statusCode !== 200) throw new Error('Product image unavailable')
    return new Uint8Array(await new Response(result.stream).arrayBuffer())
  }))
  const character = await loadCharacterReference(characterPresetId, characterImagePath)
  const referenceImages = [...productReferences, ...(character ? [character.bytes] : [])]
  const characterDirection = character
    ? `Feature ${character.description}. Preserve the exact same facial identity, age, hair and wardrobe across every frame. `
    : ''
  const urls: string[] = []
  for (let i = 0; i < scenes.length; i++) {
    const { image } = await generateImage({
      model: IMAGE_MODEL,
      prompt: referenceImages.length > 0
        ? {
            images: referenceImages,
            text:
              `${orientation} (${aspectRatio}) short-video ad frame. ${scenes[i].scene}. ` +
              characterDirection +
              `MANDATORY PRODUCT USER: ${PRODUCT_AUDIENCES[productAudience].instruction} ` +
              'Preserve the exact product identity, shape, colors, logo and package details shown in the product reference images. ' +
              'Bright, high-energy, professional product photography, cinematic lighting.',
          }
        : `${orientation} (${aspectRatio}) short-video ad frame. ${scenes[i].scene}. ` +
          `MANDATORY PRODUCT USER: ${PRODUCT_AUDIENCES[productAudience].instruction} ` +
          'Bright, high-energy, professional product photography, cinematic lighting.',
      aspectRatio,
    })
    urls.push(await uploadBytes(
      image.uint8Array,
      image.mediaType,
      `generations/${userId}/${genId}/frame-${i}.png`,
    ))
  }
  return urls
}

export async function generateAdVideoSegment(
  script: string,
  scenes: StoryboardScene[],
  firstFrameUrl: string | undefined,
  userId: string,
  genId: number,
  segmentIndex: number,
  aspectRatio: VideoAspectRatio,
  qualityTier: QualityTier = 'premium',
  characterDescription?: string | null,
  productAudience: ProductAudience = 'human',
): Promise<string> {
  const orientation = aspectRatio === '16:9' ? 'landscape' : 'vertical'
  const quality = QUALITY_TIERS[qualityTier]
  const prompt =
    `Part ${segmentIndex + 1} of a continuous ${orientation} product ad. ` +
    `Narration: "${script}". Scenes: ${scenes.map((s, i) => `${i + 1}. ${s.scene}`).join(' ')} ` +
    (characterDescription
      ? `Keep the exact same person throughout: ${characterDescription}. Preserve face, age, hair and wardrobe. `
      : '') +
    `MANDATORY PRODUCT USER THROUGHOUT THE ENTIRE CLIP: ${PRODUCT_AUDIENCES[productAudience].instruction} ` +
    'Maintain consistent product, subject, lighting and commercial style across parts. Fast-paced and energetic.'

  const { video } = await generateVideo({
    model: quality.model,
    prompt,
    aspectRatio,
    resolution: quality.resolution,
    duration: 8,
    ...(firstFrameUrl
      ? { frameImages: [{ image: await downloadBytes(firstFrameUrl), frameType: 'first_frame' as const }] }
      : {}),
  })

  return uploadBytes(
    video.uint8Array,
    video.mediaType,
    `generations/${userId}/${genId}/segment-${segmentIndex}.mp4`,
  )
}

export async function assembleVideo(
  segmentUrls: string[],
  duration: VideoDuration,
  userId: string,
  genId: number,
): Promise<string> {
  if (segmentUrls.length === 1 && duration === 8) return segmentUrls[0]
  const executablePath = await resolveFfmpegPath()

  const workDir = await mkdtemp(join(tmpdir(), `clipairy-${genId}-`))
  try {
    const segmentPaths: string[] = []
    for (let i = 0; i < segmentUrls.length; i++) {
      const segmentPath = join(workDir, `segment-${i}.mp4`)
      await writeFile(segmentPath, Buffer.from(await downloadBytes(segmentUrls[i])))
      segmentPaths.push(segmentPath)
    }

    const listPath = join(workDir, 'segments.txt')
    await writeFile(listPath, segmentPaths.map((path) => `file '${path.replaceAll("'", "'\\''")}'`).join('\n'))
    const outputPath = join(workDir, 'final.mp4')
    const args = ['-y', '-f', 'concat', '-safe', '0', '-i', listPath]
    if (duration === 30) args.push('-t', '30')
    args.push('-c', 'copy', '-movflags', '+faststart', outputPath)
    await execFileAsync(executablePath, args, { timeout: 120_000 })

    return uploadBytes(
      new Uint8Array(await readFile(outputPath)),
      'video/mp4',
      `generations/${userId}/${genId}/video-${duration}s.mp4`,
    )
  } finally {
    await rm(workDir, { recursive: true, force: true })
  }
}

// Backward-compatible 8-second generator used by older callers.
export async function generateAdVideo(
  script: string,
  scenes: StoryboardScene[],
  firstFrameUrl: string | undefined,
  userId: string,
  genId: number,
): Promise<string> {
  return generateAdVideoSegment(script, scenes, firstFrameUrl, userId, genId, 0, '9:16')
}
