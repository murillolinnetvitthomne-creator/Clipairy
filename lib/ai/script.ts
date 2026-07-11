import 'server-only'
import { generateObject } from 'ai'
import { z } from 'zod'
import { TEXT_MODEL, SCENE_COUNT } from './models'

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

// Turns a viral reference framework + the seller's product selling points into
// a ready-to-shoot ad script and an N-scene storyboard.
export async function generateScript(sellingPoints: string): Promise<GeneratedScript> {
  const { object } = await generateObject({
    model: TEXT_MODEL,
    schema: scriptSchema,
    system:
      'You are an expert short-video ad scriptwriter for TikTok, Reels and Shorts. ' +
      'You deconstruct the proven structure of viral videos (hook, problem, product reveal, ' +
      'benefits, social proof, call to action) and rewrite them into punchy, high-converting ' +
      'product ads. Keep the voiceover concise (about 8 seconds of narration) and energetic.',
    prompt:
      `Create a vertical (9:16) short-video product ad based on these product selling points:\n\n` +
      `${sellingPoints}\n\n` +
      `Follow a viral hook -> value -> call-to-action structure. Return the voiceover script and ` +
      `a storyboard of exactly ${SCENE_COUNT} scenes.`,
  })
  return object
}
