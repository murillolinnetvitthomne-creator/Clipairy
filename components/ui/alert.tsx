import * as React from 'react'
import { cn } from '@/lib/utils'

function Alert({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn('flex gap-3 rounded-xl border border-destructive/25 bg-destructive/5 p-4 text-sm text-foreground', className)}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="alert-title" className={cn('font-medium leading-none', className)} {...props} />
}

function AlertDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="alert-description" className={cn('text-sm leading-relaxed text-muted-foreground', className)} {...props} />
}

export { Alert, AlertTitle, AlertDescription }
