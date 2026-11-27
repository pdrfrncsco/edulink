'use client';

import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from './cn';
import { Button } from './Button';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  description?: string;
  size?: ModalSize;
  /** Enables backdrop click dismissal via native closedby="any" (with pointer fallback). */
  dismissible?: boolean;
  closeLabel?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const SIZE_CLASSES: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-xl',
  xl: 'max-w-3xl',
};

/**
 * Accessible modal backed by the native HTML `<dialog>` top-layer element.
 * Uses `showModal()`, native Esc handling, CSS backdrop scroll containment,
 * and a pointer-bounds fallback where `closedby="any"` is unsupported.
 */
export function Modal({
  open,
  onClose,
  title,
  eyebrow,
  description,
  size = 'md',
  dismissible = true,
  closeLabel = 'Fechar',
  footer,
  children,
  className,
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      dialog.returnValue = '';
      onClose();
    };

    const handleCancel = (event: Event) => {
      if (!dismissible) {
        event.preventDefault();
      }
    };

    dialog.addEventListener('close', handleClose);
    dialog.addEventListener('cancel', handleCancel);

    // Fallback for browsers without native <dialog closedby="any"> support (e.g. Safari)
    let cleanupLightDismiss: (() => void) | undefined;
    if (dismissible && typeof HTMLDialogElement !== 'undefined' && !('closedBy' in HTMLDialogElement.prototype)) {
      let pressedOutside = false;
      const isOutside = (e: PointerEvent) => {
        const rect = dialog.getBoundingClientRect();
        return e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom;
      };
      const onPointerDown = (e: PointerEvent) => {
        pressedOutside = isOutside(e);
      };
      const onPointerUp = (e: PointerEvent) => {
        if (pressedOutside && isOutside(e)) {
          dialog.close();
        }
        pressedOutside = false;
      };
      dialog.addEventListener('pointerdown', onPointerDown);
      dialog.addEventListener('pointerup', onPointerUp);
      cleanupLightDismiss = () => {
        dialog.removeEventListener('pointerdown', onPointerDown);
        dialog.removeEventListener('pointerup', onPointerUp);
      };
    }

    return () => {
      dialog.removeEventListener('close', handleClose);
      dialog.removeEventListener('cancel', handleCancel);
      cleanupLightDismiss?.();
    };
  }, [dismissible, onClose]);

  const closedByProp = { closedby: dismissible ? 'any' : 'none' } as Record<string, unknown>;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      {...closedByProp}
      className={cn(
        'm-auto w-[calc(100%-2rem)] rounded-3xl border border-stone-200 bg-white p-0 text-stone-900 shadow-2xl',
        SIZE_CLASSES[size],
        className
      )}
    >
      <div className="p-6 sm:p-7 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            {eyebrow && (
              <span className="block text-[10px] font-bold uppercase tracking-wider text-teal-700">
                {eyebrow}
              </span>
            )}
            <h1 id={titleId} className="text-lg font-extrabold text-stone-900 leading-snug">
              {title}
            </h1>
            {description && (
              <p id={descriptionId} className="text-xs text-stone-500 leading-relaxed">
                {description}
              </p>
            )}
          </div>
          {dismissible && (
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label={closeLabel}
              className="rounded-lg border border-stone-200 p-1.5 text-stone-500 hover:bg-stone-50 hover:text-stone-900 shrink-0"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>

        <div>{children}</div>

        {footer && (
          <div className="pt-4 border-t border-stone-100 flex flex-wrap items-center justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </dialog>
  );
}

export interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
}

/** Confirmation dialog protecting irreversible actions; safe Cancel button receives initial focus. */
export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  destructive = false,
  loading = false,
}: ConfirmModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      dismissible={!loading}
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            autoFocus
            disabled={loading}
            onClick={onClose}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={destructive ? 'danger-solid' : 'primary'}
            size="sm"
            loading={loading}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-xs text-stone-600 leading-relaxed">
        Esta ação terá efeito imediato no sistema. Verifique os dados antes de prosseguir.
      </p>
    </Modal>
  );
}
