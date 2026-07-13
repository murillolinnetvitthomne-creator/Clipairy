import { withWorkflow } from 'workflow/next'

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  outputFileTracingIncludes: {
    '/*': ['./.vercel-tools/ffmpeg'],
    '/.well-known/workflow/v1/**': ['./.vercel-tools/ffmpeg'],
  },
}

export default withWorkflow(nextConfig)
