import { get } from '@vercel/blob'
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const pathname = new URL(request.url).searchParams.get('pathname')
  if (!pathname || !pathname.startsWith(`uploads/${session.user.id}/`)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const result = await get(pathname, {
    access: 'private',
    ifNoneMatch: request.headers.get('if-none-match') ?? undefined,
  })
  if (!result) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (result.statusCode === 304) {
    return new NextResponse(null, {
      status: 304,
      headers: { ETag: result.blob.etag, 'Cache-Control': 'private, no-cache' },
    })
  }

  return new NextResponse(result.stream, {
    headers: {
      'Content-Type': result.blob.contentType,
      'Content-Length': String(result.blob.size),
      ETag: result.blob.etag,
      'Cache-Control': 'private, no-cache',
      'Content-Disposition': 'inline',
    },
  })
}
