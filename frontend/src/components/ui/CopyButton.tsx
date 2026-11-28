'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button, type ButtonSize, type ButtonVariant } from './Button';

export interface CopyButtonProps {
  value: string;
  label?: string;
  copiedLabel?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  onCopyError?: () => void;
  className?: string;
  'aria-label'?: string;
}

/** Copies text to the clipboard with polite live-region feedback and graceful error callback. */
export function CopyButton({
  value,
  label = 'Copiar',
  copiedLabel = 'Copiado',
  variant = 'outline',
  size = 'sm',
  onCopyError,
  className,
  'aria-label': ariaLabel,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleCopy = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = value;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(textarea);
        if (!ok) throw new Error('Clipboard indisponível');
      }
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      onCopyError?.();
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleCopy}
      aria-label={ariaLabel || `${label}: ${value}`}
      className={className}
      leftIcon={
        copied ? (
          <Check className="h-3.5 w-3.5 text-emerald-700 shrink-0" aria-hidden="true" />
        ) : (
          <Copy className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        )
      }
    >
      <span>{copied ? copiedLabel : label}</span>
      <span className="sr-only" aria-live="polite">
        {copied ? `${copiedLabel} para a área de transferência.` : ''}
      </span>
    </Button>
  );
}
