'use client';

// Form building blocks.
//
//   <Form onSubmit={save.run} errors={save.fieldErrors} error={save.error}>
//     <Field name="email" label="Email" required><Input type="email" … /></Field>
//     <FormActions><Button type="submit" loading={save.pending}>Save</Button></FormActions>
//   </Form>
//
// <Form> uses the browser's constraint validation (required, type=email, min…)
// but shows the messages next to each field instead of the native bubbles, focuses
// the first invalid field, and ignores repeat submits while one is in flight.
// Server-side 422 field errors (errors prop) are shown the same way.

import {
  createContext, forwardRef, useContext, useId, useRef, useState,
  type FormEvent, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes,
} from 'react';
import { AlertCircle, ChevronDown, Search } from 'lucide-react';
import { cx } from './cx';

// ── Form ────────────────────────────────────────────────────────────────────────

type ErrorMap = Record<string, string | undefined>;
const FormContext = createContext<{ errors: ErrorMap }>({ errors: {} });

type FormElement = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

export function Form({
  onSubmit, errors: serverErrors, error, children, className,
}: {
  onSubmit: () => unknown | Promise<unknown>;
  /** Field errors from the API, keyed by field name */
  errors?: ErrorMap;
  /** Form-level error from the API */
  error?: string | null;
  children: ReactNode;
  className?: string;
}) {
  const [clientErrors, setClientErrors] = useState<ErrorMap>({});
  const busy = useRef(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy.current) return; // no double submit (Enter pressed twice, double click)
    const form = e.currentTarget;
    const next: ErrorMap = {};
    let first: FormElement | null = null;
    for (const el of Array.from(form.elements) as FormElement[]) {
      if (!el.name || !('checkValidity' in el) || !el.willValidate) continue;
      if (!el.checkValidity()) {
        next[el.name] = el.validationMessage;
        first ??= el;
      }
    }
    setClientErrors(next);
    if (first) {
      first.focus();
      return;
    }
    busy.current = true;
    try {
      await onSubmit();
    } finally {
      busy.current = false;
    }
  };

  // Typing in a field clears its client-side error
  const handleInput = (e: FormEvent<HTMLFormElement>) => {
    const name = (e.target as FormElement).name;
    if (name && clientErrors[name]) setClientErrors(({ [name]: _removed, ...rest }) => rest);
  };

  const errors = { ...serverErrors, ...clientErrors };
  return (
    <FormContext.Provider value={{ errors }}>
      <form noValidate onSubmit={handleSubmit} onInput={handleInput} className={cx('space-y-4', className)}>
        {children}
        {error && !Object.values(serverErrors ?? {}).some(Boolean) && <Alert tone="danger">{error}</Alert>}
      </form>
    </FormContext.Provider>
  );
}

export function FormActions({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end', className)}>{children}</div>;
}

// ── Field ───────────────────────────────────────────────────────────────────────

interface FieldCtx { id: string; name?: string; describedBy?: string; invalid: boolean; required?: boolean }
const FieldContext = createContext<FieldCtx | null>(null);

export function Field({
  label, name, hint, error, required, optional, children, className,
}: {
  label: ReactNode;
  /** Field name: links the control to client/server validation errors */
  name?: string;
  hint?: ReactNode;
  error?: string | null;
  required?: boolean;
  /** Shows "(optional)" after the label */
  optional?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const id = useId();
  const { errors } = useContext(FormContext);
  const message = error ?? (name ? errors[name] : undefined);
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = message ? `${id}-error` : undefined;
  return (
    <FieldContext.Provider value={{ id, name, invalid: !!message, required, describedBy: [errorId, hintId].filter(Boolean).join(' ') || undefined }}>
      <div className={cx('space-y-1.5', className)}>
        <label htmlFor={id} className="block text-sm font-medium text-fg">
          {label}
          {required && <span className="text-danger" aria-hidden> *</span>}
          {optional && <span className="font-normal text-fg-subtle"> (optional)</span>}
        </label>
        {children}
        {message ? (
          <p id={errorId} className="flex items-start gap-1.5 text-xs font-medium text-danger">
            <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden /> {message}
          </p>
        ) : hint ? (
          <p id={hintId} className="text-xs text-fg-subtle">{hint}</p>
        ) : null}
      </div>
    </FieldContext.Provider>
  );
}

/** Props a control inherits from the surrounding <Field>. */
function useFieldProps<T extends { id?: string; name?: string; required?: boolean }>(props: T) {
  const f = useContext(FieldContext);
  if (!f) return { ...props, 'aria-invalid': undefined, 'aria-describedby': undefined };
  return {
    ...props,
    id: props.id ?? f.id,
    name: props.name ?? f.name,
    required: props.required ?? f.required,
    'aria-invalid': f.invalid || undefined,
    'aria-describedby': f.describedBy,
  };
}

const control =
  'w-full rounded-lg border border-line-strong bg-surface text-sm text-fg shadow-xs transition-colors ' +
  'placeholder:text-fg-subtle hover:border-fg-subtle ' +
  'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 ' +
  'aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-danger/25 ' +
  'disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-fg-subtle';

// ── Controls ────────────────────────────────────────────────────────────────────

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Short text shown inside the field before the value (e.g. a currency symbol) */
  prefix?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ className, prefix, icon: Icon, ...rest }, ref) {
  const props = useFieldProps(rest);
  const input = (
    <input
      ref={ref}
      {...props}
      className={cx(control, 'h-10 px-3 sm:h-9', (prefix || Icon) && 'pl-9', props.type === 'number' && 'tabular-nums', !prefix && !Icon && className)}
    />
  );
  if (!prefix && !Icon) return input;
  return (
    <div className={cx('relative', className)}>
      <span className="pointer-events-none absolute inset-y-0 left-0 flex w-9 items-center justify-center text-sm text-fg-subtle" aria-hidden>
        {Icon ? <Icon className="h-4 w-4" /> : prefix}
      </span>
      {input}
    </div>
  );
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, ...rest }, ref) {
  const props = useFieldProps(rest);
  return (
    <div className={cx('relative', className)}>
      <select ref={ref} {...props} className={cx(control, 'h-10 appearance-none pl-3 pr-9 sm:h-9')}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
    </div>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...rest }, ref) {
  const props = useFieldProps(rest);
  return <textarea ref={ref} rows={3} {...props} className={cx(control, 'px-3 py-2', className)} />;
});

// ── Alert ───────────────────────────────────────────────────────────────────────

const ALERT = {
  danger: 'border-danger-line bg-danger-soft text-danger',
  warning: 'border-warning-line bg-warning-soft text-warning',
  success: 'border-success-line bg-success-soft text-success',
  info: 'border-info-line bg-info-soft text-info',
};

export function Alert({ tone = 'info', title, children, action, className }: {
  tone?: keyof typeof ALERT; title?: ReactNode; children?: ReactNode; action?: ReactNode; className?: string;
}) {
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={cx('flex items-start gap-3 rounded-lg border px-3.5 py-3 text-sm', ALERT[tone], className)}>
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cx(title && 'mt-0.5', 'text-fg-muted')}>{children}</div>}
      </div>
      {action}
    </div>
  );
}

// ── Search ──────────────────────────────────────────────────────────────────────

/** Search box for list filters. Pair with useDebounced() for API queries. */
export function SearchInput({ label, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <div className={cx('relative w-full sm:w-64', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
      <input
        type="search"
        aria-label={label}
        placeholder={label}
        {...props}
        className={cx(control, 'h-10 pl-9 pr-3 sm:h-9 [&::-webkit-search-cancel-button]:cursor-pointer')}
      />
    </div>
  );
}
