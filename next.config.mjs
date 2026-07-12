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
    '/*': ['./node_modules/ffmpeg-static/ffmpeg'],
  },
}

export default withWorkflow(nextConfig)
