import 'server-only'
import { generateObject } from 'ai'
import { z } from 'zod'
import { TEXT_MODEL, SCENE_COUNT } from './models'
import { get } from '@vercel/blob'
import { getVideoLanguage, type VideoLanguage } from '@/lib/video-languages'
import { PRODUCT_AUDIENCES, type ProductAudience } from '@/lib/product-audiences'

const scriptSchema = z.object({
  script: z
    .string()
    .describe('The full voiceover script for a short vertical product ad, ready to be read aloud.'),
  storyboard: z
    .array(
      z.object({
        scene: z.string().describe('Visual description of this shot (camera, subject, action).'),
        caption: z.string().describe('On-screen caption text for this shot.'),
      }),
    )
    .length(SCENE_COUNT)
    .describe(`Exactly ${SCENE_COUNT} sequential scenes that make up the ad.`),
})

export type GeneratedScript = z.infer<typeof scriptSchema>

async function loadPart(pathname: string) {
  const result = await get(pathname, { access: 'private' })
  if (!result || result.statusCode !== 200) throw new Error('Reference asset unavailable')
  return {
    type: 'file' as const,
    data: new Uint8Array(await new Response(result.stream).arrayBuffer()),
    mediaType: result.blob.contentType,
  }
}

// Turns a viral reference framework + the seller's product selling points into
// a ready-to-shoot ad script and an N-scene storyboard.
export async function generateScript(
  sellingPoints: string,
  duration = 8,
  aspectRatio: '9:16' | '16:9' = '9:16',
  referenceVideoPath?: string | null,
  productImagePaths: string[] = [],
  videoLanguage: VideoLanguage = 'en',
  productAudience: ProductAudience = 'human',
): Promise<GeneratedScript> {
  const language = getVideoLanguage(videoLanguage)
  if (!language) throw new Error('INVALID_VIDEO_LANGUAGE')
  const orientation = aspectRatio === '16:9' ? 'landscape' : 'vertical'
  const assetParts = await Promise.all([
    ...(referenceVideoPath ? [referenceVideoPath] : []),
    ...productImagePaths,
  ].map(loadPart))
  const prompt =
    `Create a ${orientation} (${aspectRatio}) ${duration}-second product ad based on these product selling points:\n\n` +
    `${sellingPoints || 'Infer the product and its strongest benefits from the uploaded product images.'}\n\n` +
    `Analyze the uploaded reference video for its hook, pacing, shot progression and CTA without copying protected wording. ` +
    `Use the uploaded product images as the source of truth for product identity, appearance and details. ` +
    `Write the complete voiceover script and every on-screen caption in ${language.name}. ` +
    `Do not mix in another language except unchanged brand names, product names or legally required proper nouns. ` +
    `Use natural native phrasing appropriate for ${language.name}, not a literal translation. ` +
    `MANDATORY END-USER RULE: ${PRODUCT_AUDIENCES[productAudience].instruction} Repeat this rule in every storyboard scene where the product is worn or used. ` +
    `Choose the strongest ad concept, opening, pacing, and shot order yourself based on the product, audience, evidence, duration, and reference media. ` +
    `Make the opening immediately engaging, communicate specific visual benefits grounded in the input, and end with a natural call to action. ` +
    `Avoid vague luxury or style claims as the only benefit, and never invent measurements, statistics, reviews, certifications, or product capabilities. ` +
    `Return the voiceover script and a storyboard of exactly ${SCENE_COUNT} scenes.`

  const { object } = await generateObject({
    model: TEXT_MODEL,
    schema: scriptSchema,
    system:
      'You are an expert short-video ad scriptwriter for TikTok, Reels, Shorts and landscape ads. ' +
      'You create distinctive, high-converting concepts rather than applying one fixed formula. ' +
      'Treat the declared product audience as an inviolable safety and accuracy constraint. ' +
      `Keep the voiceover concise for about ${duration} seconds, specific, and energetic.`,
    messages: [{
      role: 'user',
      content: [{ type: 'text', text: prompt }, ...assetParts],
    }],
  })
  return object
}
