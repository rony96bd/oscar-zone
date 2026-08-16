import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, X, Image as ImageIcon, CheckCircle } from 'lucide-react'
import { cn, formatFileSize } from '@/lib/utils'
import { ACCEPTED_IMAGE_TYPES, MAX_SCREENSHOT_SIZE } from '@/lib/constants'
import { toast } from 'sonner'

interface ScreenshotUploadProps {
  onFileSelect: (file: File) => void
  onFileRemove: () => void
  selectedFile: File | null
}

export function ScreenshotUpload({ onFileSelect, onFileRemove, selectedFile }: ScreenshotUploadProps) {
  const [preview, setPreview] = useState<string | null>(null)

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0]
      if (!file) return

      if (file.size > MAX_SCREENSHOT_SIZE) {
        toast.error('File too large. Maximum size is 10MB.')
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => setPreview(e.target?.result as string)
      reader.readAsDataURL(file)
      onFileSelect(file)
    },
    [onFileSelect]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    maxFiles: 1,
    maxSize: MAX_SCREENSHOT_SIZE,
  })

  const handleRemove = () => {
    setPreview(null)
    onFileRemove()
  }

  if (selectedFile && preview) {
    return (
      <div className="relative rounded-xl overflow-hidden border border-border">
        <img
          src={preview}
          alt="Payment screenshot"
          className="w-full h-48 object-cover"
        />
        <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
          <button
            onClick={handleRemove}
            className="flex items-center gap-2 bg-destructive text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            <X className="h-4 w-4" />
            Remove
          </button>
        </div>
        <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-3 py-2">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-neon-green" />
            <div>
              <p className="text-xs font-medium text-white truncate">{selectedFile.name}</p>
              <p className="text-xs text-gray-400">{formatFileSize(selectedFile.size)}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      {...getRootProps()}
      className={cn('upload-zone cursor-pointer', isDragActive && 'drag-over')}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          {isDragActive ? (
            <ImageIcon className="h-6 w-6 text-primary" />
          ) : (
            <Upload className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">
            {isDragActive ? 'Drop your screenshot here' : 'Upload Payment Screenshot'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            JPG, PNG, or WEBP — max 10MB
          </p>
        </div>
      </div>
    </div>
  )
}
