'use client';

import { cn } from '@/lib/utils';
import {
  PERMISSION_LABELS,
  type Permission,
} from '../_helpers/permissions';

export function PermissionToggle({
  permission,
  checked,
  disabled,
  onChange,
}: {
  permission: Permission;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent/50',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 rounded border-input"
      />
      {PERMISSION_LABELS[permission]}
    </label>
  );
}
