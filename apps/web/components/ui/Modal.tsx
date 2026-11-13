'use client';

// Modal built on the native <dialog> element: showModal() puts it in the top
// layer (above every z-index), makes the rest of the page inert (focus is
// trapped), closes on Escape and restores focus to the opener on close.
// Children are only mounted while open, so forms start fresh every time.

import {
  createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode,
} from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button, IconButton } from './Button';
import { cx } from './cx';

export function Modal({
  open, onClose, title, description, children, size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      document.documentElement.style.overflow = 'hidden'; // no background scroll
    } else if (!open && dialog.open) {
      dialog.close();
    }
    return () => {
      if (open) document.documentElement.style.overflow = '';
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onCancel={(e) => {
        e.preventDefault(); // Escape: let the parent decide (keeps state in sync)
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose(); // click on the backdrop
      }}
      className={cx(
        'm-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-1.5rem)] overflow-hidden rounded-2xl border border-line bg-surface p-0 text-fg shadow-xl',
        size === 'sm' && 'max-w-md',
        size === 'md' && 'max-w-lg',
        size === 'lg' && 'max-w-3xl',
      )}
    >
      {open && (
        <div className="flex max-h-[calc(100dvh-2rem)] flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div className="min-w-0">
              <h2 id={titleId} className="text-base font-semibold text-fg">{title}</h2>
              {description && <p id={descId} className="mt-0.5 text-sm text-fg-muted">{description}</p>}
            </div>
            <IconButton icon={X} aria-label="Close dialog" size="sm" onClick={onClose} className="-mr-1.5 -mt-1" />
          </div>
          <div className="overflow-y-auto px-5 py-4">{children}</div>
        </div>
      )}
    </dialog>
  );
}

// ── Confirm dialog (promise based) ──────────────────────────────────────────────
//   const confirm = useConfirm();
//   if (await confirm({ title: 'Run payroll?', confirmLabel: 'Run payroll' })) …

interface ConfirmOptions {
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  tone?: 'primary' | 'danger';
}

const ConfirmContext = createContext<(o: ConfirmOptions) => Promise<boolean>>(async () => false);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);
  const confirm = useCallback(
    (o: ConfirmOptions) => new Promise<boolean>((resolve) => setRequest({ ...o, resolve })),
    [],
  );
  const finish = (value: boolean) => {
    request?.resolve(value);
    setRequest(null);
  };
  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal open={!!request} onClose={() => finish(false)} title={request?.title ?? ''} size="sm">
        {request && (
          <div className="space-y-5">
            <div className="flex gap-3">
              {request.tone === 'danger' && (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-danger-soft text-danger">
                  <AlertTriangle className="h-4 w-4" aria-hidden />
                </span>
              )}
              <div className="text-sm text-fg-muted">{request.message}</div>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={() => finish(false)}>Cancel</Button>
              <Button variant={request.tone === 'danger' ? 'danger' : 'primary'} onClick={() => finish(true)} autoFocus>
                {request.confirmLabel ?? 'Confirm'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => useContext(ConfirmContext);
