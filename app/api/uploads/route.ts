import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { del } from '@vercel/blob'
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'

const VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm']
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export async function DELETE(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { pathname } = (await request.json()) as { pathname?: string }
  if (!pathname?.startsWith(`uploads/${session.user.id}/`)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  await del(pathname)
  return NextResponse.json({ success: true })
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json()) as HandleUploadBody

  try {
    const response = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const payload = JSON.parse(clientPayload ?? '{}') as { kind?: 'video' | 'image' }
        const prefix = `uploads/${session.user.id}/`
        if (!pathname.startsWith(prefix) || !payload.kind) {
          throw new Error('Invalid upload path')
        }

        return {
          allowedContentTypes: payload.kind === 'video' ? VIDEO_TYPES : IMAGE_TYPES,
          maximumSizeInBytes: payload.kind === 'video' ? 100 * 1024 * 1024 : 12 * 1024 * 1024,
          addRandomSuffix: true,
          allowOverwrite: false,
        }
      },
    })

    return NextResponse.json(response)
  } catch {
    return NextResponse.json({ error: 'Upload could not be authorized' }, { status: 400 })
  }
}
