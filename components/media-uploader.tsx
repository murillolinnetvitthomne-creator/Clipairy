'use client'

import { upload } from '@vercel/blob/client'
import { FileVideo, ImagePlus, Loader2, Trash2, UploadCloud } from 'lucide-react'
import { useRef, useState } from 'react'

type UploadedAsset = { pathname: string; name: string; type: string }

type MediaUploaderProps = {
  userId: string | null
  kind: 'video' | 'image'
  label: string
  hint: string
  value: UploadedAsset[]
  onChange: (assets: UploadedAsset[]) => void
  disabled?: boolean
  maxFiles?: number
}

const videoTypes = ['video/mp4', 'video/quicktime', 'video/webm']
const imageTypes = ['image/jpeg', 'image/png', 'image/webp']

export function MediaUploader({
  userId,
  kind,
  label,
  hint,
  value,
  onChange,
  disabled = false,
  maxFiles = 1,
}: MediaUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const Icon = kind === 'video' ? FileVideo : ImagePlus

  async function addFiles(files: File[]) {
    if (!userId || disabled) return
    setError('')
    const allowed = kind === 'video' ? videoTypes : imageTypes
    const maxSize = kind === 'video' ? 100 * 1024 * 1024 : 12 * 1024 * 1024
    const remaining = maxFiles - value.length
    const selected = files.slice(0, remaining)

    if (selected.length === 0) return
    if (files.length > remaining) {
      setError(kind === 'image' ? `最多上传 ${maxFiles} 张图片` : '只能上传 1 个视频')
      return
    }
    if (selected.some((file) => !allowed.includes(file.type))) {
      setError(kind === 'video' ? '请上传 MP4、MOV 或 WebM 视频' : '请上传 JPG、PNG 或 WebP 图片')
      return
    }
    if (selected.some((file) => file.size > maxSize)) {
      setError(kind === 'video' ? '视频不能超过 100 MB' : '每张图片不能超过 12 MB')
      return
    }

    try {
      const uploaded: UploadedAsset[] = []
      for (let index = 0; index < selected.length; index++) {
        const file = selected[index]
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-')
        const blob = await upload(`uploads/${userId}/${kind}/${safeName}`, file, {
          access: 'private',
          handleUploadUrl: '/api/uploads',
          clientPayload: JSON.stringify({ kind }),
          contentType: file.type,
          multipart: kind === 'video',
          onUploadProgress: ({ percentage }) => {
            setProgress(Math.round(((index + percentage / 100) / selected.length) * 100))
          },
        })
        uploaded.push({ pathname: blob.pathname, name: file.name, type: file.type })
      }
      onChange([...value, ...uploaded])
    } catch {
      setError('上传失败，请检查网络后重试')
    } finally {
      setProgress(null)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function remove(asset: UploadedAsset) {
    onChange(value.filter((item) => item.pathname !== asset.pathname))
    await fetch('/api/uploads', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pathname: asset.pathname }),
    }).catch(() => undefined)
  }

  const canAdd = !!userId && !disabled && value.length < maxFiles && progress === null

  return (
    <div className="flex min-w-0 flex-col rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
            <Icon className="size-5" aria-hidden="true" />
          </span>
          <span className="truncate">{label}</span>
        </div>
        {maxFiles > 1 && (
          <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground">
            {value.length}/{maxFiles}
          </span>
        )}
      </div>

      <button
        type="button"
        disabled={!canAdd}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(event) => { event.preventDefault(); if (canAdd) setDragging(true) }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          void addFiles(Array.from(event.dataTransfer.files))
        }}
        aria-describedby={`${kind}-upload-hint`}
        className={`mt-4 flex min-h-32 w-full touch-manipulation flex-col items-center justify-center rounded-xl border border-dashed p-4 text-center transition-colors sm:min-h-28 ${dragging ? 'border-primary bg-primary/5' : 'border-border bg-background/50'} disabled:cursor-not-allowed disabled:opacity-60`}
      >
        {progress !== null ? (
          <>
            <Loader2 className="size-5 animate-spin text-primary" aria-hidden="true" />
            <span className="mt-2 text-xs font-medium text-foreground">正在上传 {progress}%</span>
            <span className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <span className="block h-full bg-primary transition-[width]" style={{ width: `${progress}%` }} />
            </span>
          </>
        ) : (
          <>
            <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <UploadCloud className="size-5" aria-hidden="true" />
            </span>
            <span className="mt-3 text-sm font-semibold text-foreground">
              {kind === 'video' ? '选择参考视频' : value.length > 0 ? '继续添加产品图' : '选择产品图片'}
            </span>
            <span className="mt-1 text-xs leading-relaxed text-muted-foreground sm:hidden">点击从手机相册选择</span>
            <span id={`${kind}-upload-hint`} className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">{hint}</span>
          </>
        )}
      </button>

      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept={kind === 'video' ? 'video/mp4,video/quicktime,video/webm' : 'image/jpeg,image/png,image/webp'}
        multiple={maxFiles > 1}
        disabled={!canAdd}
        onChange={(event) => void addFiles(Array.from(event.target.files ?? []))}
      />

      {value.length > 0 && (
        <ul className={kind === 'image' ? 'mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3' : 'mt-3 flex flex-col gap-2'} aria-label="已上传素材">
          {value.map((asset) => (
            <li
              key={asset.pathname}
              className={kind === 'image'
                ? 'relative min-w-0 overflow-hidden rounded-xl border border-border bg-background'
                : 'flex min-w-0 items-center gap-3 rounded-xl border border-border bg-background p-2'}
            >
              {kind === 'image' ? (
                <>
                  <img
                    src={`/api/uploads/file?pathname=${encodeURIComponent(asset.pathname)}`}
                    alt={asset.name}
                    className="aspect-square w-full object-cover"
                  />
                  <span className="block truncate p-2 pr-10 text-xs font-medium text-foreground">{asset.name}</span>
                </>
              ) : (
                <>
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                    <FileVideo className="size-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">{asset.name}</span>
                </>
              )}
              <button
                type="button"
                onClick={() => void remove(asset)}
                disabled={disabled}
                className={kind === 'image'
                  ? 'absolute right-1.5 top-1.5 flex size-10 touch-manipulation items-center justify-center rounded-full bg-background/90 text-muted-foreground shadow-sm hover:text-destructive disabled:opacity-50'
                  : 'flex size-11 shrink-0 touch-manipulation items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-destructive disabled:opacity-50'}
              >
                <Trash2 className="size-4" aria-hidden="true" />
                <span className="sr-only">删除 {asset.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <p role="alert" className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  )
}

export type { UploadedAsset }
