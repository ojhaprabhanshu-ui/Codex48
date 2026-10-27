import { useEffect, useRef, useState } from 'react'
import { ImagePlus, Trash2, Upload, Video } from 'lucide-react'

const mediaSettings = {
  image: {
    title: 'Upload Image',
    icon: ImagePlus,
    accept: '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp',
    extensions: ['jpg', 'jpeg', 'png', 'webp'],
    mimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    maxBytes: 10 * 1024 * 1024,
    maxLabel: '10 MB',
    typesLabel: 'JPG, JPEG, PNG, WEBP',
  },
  video: {
    title: 'Upload Video',
    icon: Video,
    accept: '.mp4,.webm,video/mp4,video/webm',
    extensions: ['mp4', 'webm'],
    mimeTypes: ['video/mp4', 'video/webm'],
    maxBytes: 50 * 1024 * 1024,
    maxLabel: '50 MB',
    typesLabel: 'MP4, WEBM',
  },
}

function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function MediaUploadField({ type, onFileChange }) {
  const settings = mediaSettings[type]
  const Icon = settings.icon
  const inputRef = useRef(null)
  const previewUrlRef = useRef(null)
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [dragging, setDragging] = useState(false)
  const [validationError, setValidationError] = useState('')

  useEffect(() => {
    const preventFileNavigation = (event) => {
      if (Array.from(event.dataTransfer?.types || []).includes('Files')) event.preventDefault()
    }
    window.addEventListener('dragover', preventFileNavigation)
    window.addEventListener('drop', preventFileNavigation)
    return () => {
      window.removeEventListener('dragover', preventFileNavigation)
      window.removeEventListener('drop', preventFileNavigation)
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    }
  }, [])

  function selectFile(candidate) {
    if (!candidate) return
    const extension = candidate.name.split('.').pop()?.toLowerCase() || ''
    const validExtension = settings.extensions.includes(extension)
    const validMime = !candidate.type || settings.mimeTypes.includes(candidate.type.toLowerCase())
    if (!validExtension || !validMime) {
      setValidationError(`Unsupported format. Choose ${settings.typesLabel}.`)
      return
    }
    if (candidate.size > settings.maxBytes) {
      setValidationError(`File is too large. Maximum size is ${settings.maxLabel}.`)
      return
    }

    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    const nextUrl = URL.createObjectURL(candidate)
    previewUrlRef.current = nextUrl
    setPreviewUrl(nextUrl)
    setFile(candidate)
    setValidationError('')
    onFileChange?.(candidate)
  }

  function removeFile() {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    previewUrlRef.current = null
    setPreviewUrl('')
    setFile(null)
    setValidationError('')
    if (inputRef.current) inputRef.current.value = ''
    onFileChange?.(null)
  }

  function onDrop(event) {
    event.preventDefault()
    event.stopPropagation()
    setDragging(false)
    const files = Array.from(event.dataTransfer?.files || [])
    if (files.length > 1) {
      setValidationError('Choose one file at a time.')
      return
    }
    selectFile(files[0])
  }

  return (
    <section className="min-w-0 rounded-2xl border border-line bg-surface p-4" aria-labelledby={`${type}-upload-title`}>
      <div className="mb-3 flex items-center gap-2.5">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-accent-soft text-accent"><Icon size={16} aria-hidden="true" /></span>
        <div className="min-w-0">
          <h3 id={`${type}-upload-title`} className="text-xs font-semibold text-ink">{settings.title}</h3>
          <p className="mt-0.5 text-[10px] text-secondary">{settings.typesLabel} · up to {settings.maxLabel}</p>
        </div>
      </div>

      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept={settings.accept}
        aria-label={`Choose ${type} file`}
        onChange={(event) => {
          selectFile(event.currentTarget.files?.[0])
          event.currentTarget.value = ''
        }}
      />

      {!file ? (
        <div
          className={'rounded-xl border border-dashed p-4 text-center transition-colors ' + (dragging ? 'border-accent bg-accent-soft/60' : 'border-line bg-canvas hover:border-accent/60 hover:bg-accent-soft/25')}
          onDragEnter={(event) => { event.preventDefault(); setDragging(true) }}
          onDragOver={(event) => { event.preventDefault(); setDragging(true) }}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false)
          }}
          onDrop={onDrop}
        >
          <Upload size={17} className="mx-auto text-muted" aria-hidden="true" />
          <p className="mt-2 text-[11px] font-medium text-ink">Drop a file here</p>
          <p className="mt-1 text-[10px] text-muted">or browse from your device</p>
          <button type="button" onClick={() => inputRef.current?.click()} className="mt-3 inline-flex h-8 items-center justify-center rounded-lg border border-line bg-surface px-3 text-[10px] font-semibold text-secondary hover:bg-accent-soft hover:text-accent focus-visible:outline-2 focus-visible:outline-accent">
            Choose {type === 'image' ? 'Image' : 'Video'}
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-canvas">
          {type === 'image' ? (
            <img src={previewUrl} alt={`Preview of ${file.name}`} className="max-h-48 w-full bg-canvas object-contain" />
          ) : (
            <video src={previewUrl} controls preload="metadata" className="max-h-56 w-full bg-slate-950" aria-label={`Video preview of ${file.name}`} />
          )}
          <div className="flex min-w-0 items-center justify-between gap-2 border-t border-line p-2.5">
            <div className="min-w-0">
              <p className="truncate text-[11px] font-medium text-ink" title={file.name}>{file.name}</p>
              <p className="mt-0.5 text-[10px] text-muted">{formatSize(file.size)}</p>
            </div>
            <div className="flex shrink-0 gap-1">
              <button type="button" onClick={() => inputRef.current?.click()} className="h-8 rounded-lg border border-line bg-surface px-2.5 text-[10px] font-semibold text-secondary hover:bg-accent-soft hover:text-accent">Replace</button>
              <button type="button" onClick={removeFile} className="grid h-8 w-8 place-items-center rounded-lg text-secondary hover:bg-danger-bg hover:text-danger-ink" aria-label={`Remove ${file.name}`}><Trash2 size={14} aria-hidden="true" /></button>
            </div>
          </div>
        </div>
      )}

      {validationError && <p role="alert" className="notice-error mt-2 rounded-lg border px-2.5 py-2 text-[10px] leading-4">{validationError}</p>}
    </section>
  )
}
