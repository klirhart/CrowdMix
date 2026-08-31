import { useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { Eye, EyeOff, Lock } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { IconButton } from '@/components/ui/IconButton'

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label: string
  error?: string | null
  hint?: ReactNode
  hideLabel?: boolean
}

export function PasswordInput({
  label,
  error,
  hint,
  hideLabel,
  disabled,
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false)

  return (
    <Input
      {...props}
      label={label}
      error={error}
      hint={hint}
      hideLabel={hideLabel}
      disabled={disabled}
      type={visible ? 'text' : 'password'}
      icon={<Lock size={16} strokeWidth={2.25} />}
      trailing={
        <IconButton
          label={visible ? 'Hide password' : 'Show password'}
          icon={
            visible
              ? <EyeOff size={16} strokeWidth={2.25} />
              : <Eye size={16} strokeWidth={2.25} />
          }
          size="sm"
          disabled={disabled}
          onClick={() => setVisible((current) => !current)}
        />
      }
    />
  )
}
