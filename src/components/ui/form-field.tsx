import { type HTMLAttributes, type ReactNode, useId } from 'react'
import { cn } from '@/lib/cn'
import { Label } from './label'

interface FormFieldProps extends HTMLAttributes<HTMLDivElement> {
  label?: string
  error?: string
  hint?: string
  required?: boolean
  children: ReactNode
}

function FormField({
  label,
  error,
  hint,
  required,
  className,
  children,
  ...props
}: FormFieldProps) {
  const id = useId()

  return (
    <div className={cn('space-y-1.5', className)} {...props}>
      {label && (
        <Label htmlFor={id} error={!!error}>
          {label}
          {required && (
            <span className="ml-1 text-destructive" aria-hidden>
              *
            </span>
          )}
        </Label>
      )}
      <div id={id}>{children}</div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {!error && hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

export { FormField }
