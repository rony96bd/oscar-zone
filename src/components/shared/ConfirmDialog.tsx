import * as AlertDialog from '@radix-ui/react-alert-dialog'
import { cn } from '@/lib/utils'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  variant?: 'default' | 'destructive'
  isLoading?: boolean
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  variant = 'default',
  isLoading = false,
}: ConfirmDialogProps) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <AlertDialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2',
            'glass-card p-6 shadow-2xl animate-scale-in'
          )}
        >
          <AlertDialog.Title className="text-lg font-semibold text-foreground">
            {title}
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm text-muted-foreground">
            {description}
          </AlertDialog.Description>
          <div className="mt-6 flex justify-end gap-3">
            <AlertDialog.Cancel
              className="btn-ghost-neon px-4 py-2 text-sm"
              disabled={isLoading}
            >
              {cancelLabel}
            </AlertDialog.Cancel>
            <AlertDialog.Action
              onClick={onConfirm}
              className={cn(
                'px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200',
                variant === 'destructive'
                  ? 'bg-destructive text-white hover:bg-destructive/80'
                  : 'btn-neon'
              )}
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : confirmLabel}
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
