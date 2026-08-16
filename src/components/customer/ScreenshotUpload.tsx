import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, X, ImageIcon, CheckCircle, Loader2, AlertCircle } from 'lucide-react'
import { uploadPaymentScreenshot, validateScreenshotFile } from '@/services/r2'
import { formatFileSize } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface ScreenshotUploadProps {
  onUpload: (r2Key: string, previewUrl: string) => void
  onClear: () => void
  uploaded: boolean
  disabled?: boolean
  orderId: string
}

export function ScreenshotUpload({ onUpload, onClear, uploaded, disabled, orderId }: ScreenshotUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [fileSize, setFileSize] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)

  const processFile = useCallback(async (file: File) => {
    setError(null)

    // Validate
    const validation = validateScreenshotFile(file)
    if (!validation.valid) {
      setError(validation.error!)
      return
    }

    // Show preview
    const preview = URL.createObjectURL(file)
    setPreviewUrl(preview)
    setFileName(file.name)
    setFileSize(file.size)
    setIsUploading(true)
    setProgress(20)

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 15, 85))
      }, 300)

      const r2Key = await uploadPaymentScreenshot(file, orderId)

      clearInterval(progressInterval)
      setProgress(100)
      setIsUploading(false)
      onUpload(r2Key, preview)
    } catch (err: any) {
      setIsUploading(false)
      setPreviewUrl(null)
      setProgress(0)
      setError(err.message || 'Upload failed. Please try again.')
    }
  }, [orderId, onUpload])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/jpeg': [], 'image/png': [], 'image/webp': [] },
    maxFiles: 1,
    disabled: disabled || isUploading || uploaded,
    onDrop: (accepted) => { if (accepted[0]) processFile(accepted[0]) },
  })

  const handleClear = () => {
    setPreviewUrl(null)
    setFileName(null)
    setFileSize(null)
    setError(null)
    setProgress(0)
    onClear()
  }

  if (uploaded && previewUrl) {
    return (
      <div className="rounded-xl border border-neon-green/30 bg-neon-green/5 p-4">
        <div className="flex items-start gap-3">
          <div className="relative flex-shrink-0 h-16 w-16 rounded-lg overflow-hidden border border-border">
            <img src={previewUrl} alt="Payment screenshot" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-neon-green/20 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-neon-green" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-neon-green">Screenshot Uploaded ✓</p>
            {fileName && <p className="text-xs text-muted-foreground truncate">{fileName}</p>}
            {fileSize && <p className="text-xs text-muted-foreground">{formatFileSize(fileSize)}</p>}
          </div>
          {!disabled && (
            <button onClick={handleClear} className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded-lg hover:bg-destructive/10" title="Remove">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div
        {...getRootProps()}
        className={cn(
          'upload-zone cursor-pointer select-none',
          isDragActive && 'drag-over',
          (disabled || isUploading) && 'opacity-60 cursor-not-allowed'
        )}
      >
        <input {...getInputProps()} />
        {isUploading ? (
          <div className="space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-sm text-foreground font-medium">Uploading screenshot...</p>
            <div className="w-full max-w-xs mx-auto">
              <div className="progress-neon">
                <div className="progress-neon-bar" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-xs text-muted-foreground mt-1 text-center">{progress}%</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex justify-center">
              {isDragActive
                ? <ImageIcon className="h-10 w-10 text-primary" />
                : <Upload className="h-10 w-10 text-muted-foreground" />
              }
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {isDragActive ? 'Drop your screenshot here' : 'Upload Payment Screenshot'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WEBP up to 10MB</p>
            </div>
            <p className="text-xs text-primary">Click to browse or drag &amp; drop</p>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
          <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}
    </div>
  )
}
