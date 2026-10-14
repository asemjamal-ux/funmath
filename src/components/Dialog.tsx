import { useEffect, useId, useRef } from 'react';
import { useT } from '../app/hooks';
import { Button } from './Button';

export interface DialogProps {
  open: boolean;
  title: string;
  onClose?: () => void;
  /** Destructive dialogs ignore Esc (agent-instructions §10). */
  destructive?: boolean;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  initialFocus?: 'first' | 'last';
}

/** Native <dialog> with focus trap via showModal(); restores focus on close. */
export function Dialog({ open, title, onClose, destructive, children, actions, className, initialFocus = 'first' }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const restore = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      restore.current = document.activeElement as HTMLElement | null;
      d.showModal();
      const focusables = d.querySelectorAll<HTMLElement>('.dialog__actions button:not([disabled]), button:not([disabled]), input, select');
      const target = initialFocus === 'last' ? focusables[focusables.length - 1] : focusables[0];
      target?.focus();
    } else if (!open && d.open) {
      d.close();
      restore.current?.focus?.();
    }
  }, [open, initialFocus]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    const onCancel = (e: Event) => {
      e.preventDefault();
      if (!destructive) onClose?.();
    };
    d.addEventListener('cancel', onCancel);
    return () => d.removeEventListener('cancel', onCancel);
  }, [destructive, onClose]);

  return (
    <dialog ref={ref} className={`dialog${className ? ` ${className}` : ''}`} aria-labelledby={titleId}>
      {open && (
        <>
          <h2 id={titleId} className="dialog__title">{title}</h2>
          <div className="dialog__body">{children}</div>
          {actions && <div className="dialog__actions">{actions}</div>}
        </>
      )}
    </dialog>
  );
}

export function ConfirmDialog({
  open, title, body, confirmLabel, cancelLabel, onConfirm, onCancel, danger, confirmDisabled, children,
}: {
  open: boolean; title: string; body?: string; confirmLabel: string; cancelLabel?: string;
  onConfirm: () => void; onCancel: () => void; danger?: boolean; confirmDisabled?: boolean; children?: React.ReactNode;
}) {
  const t = useT();
  return (
    <Dialog
      open={open}
      title={title}
      onClose={onCancel}
      destructive={danger}
      actions={
        <>
          <Button variant="secondary" size={danger ? 'm' : 'l'} onClick={onCancel}>{cancelLabel ?? t('common.cancel')}</Button>
          <Button variant={danger ? 'danger' : 'primary'} size={danger ? 'm' : 'l'} onClick={onConfirm} disabled={confirmDisabled}>{confirmLabel}</Button>
        </>
      }
    >
      {body && <p>{body}</p>}
      {children}
    </Dialog>
  );
}
