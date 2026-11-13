import { Building2 } from 'lucide-react';
import { cx } from './ui';

export function Logo({ size = 'md', className }: { size?: 'md' | 'lg'; className?: string }) {
  return (
    <span className={cx('flex items-center gap-2.5', className)}>
      <span className={cx('flex items-center justify-center rounded-lg bg-brand text-white', size === 'lg' ? 'h-11 w-11' : 'h-8 w-8')}>
        <Building2 className={size === 'lg' ? 'h-6 w-6' : 'h-[18px] w-[18px]'} aria-hidden />
      </span>
      <span className="leading-tight">
        <span className={cx('block font-semibold tracking-tight text-fg', size === 'lg' ? 'text-xl' : 'text-sm')}>Amdox ERP</span>
        {size === 'md' && <span className="block text-xs text-fg-subtle">Amdox Technology</span>}
      </span>
    </span>
  );
}
