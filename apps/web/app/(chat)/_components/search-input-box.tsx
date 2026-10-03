'use client';

import type { Ref } from 'react';
import { Search, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';
import type { SearchFilterChip } from '../_helpers/parse-search-query';
import { useSearchPanel } from '../_hooks/use-search-panel';

export function SearchChip({ chip }: { chip: SearchFilterChip }) {
  return (
    <Badge
      variant="secondary"
      className="h-5 min-w-0 shrink gap-1 rounded-sm px-1.5 text-xs"
    >
      <span className="font-semibold">{chip.key}:</span>
      <span className="truncate">{chip.value}</span>
    </Badge>
  );
}

/** Search box where finished filters sit inside the field as badges. */
export function SearchInputBox({
  inputRef,
  placeholder,
  className,
  autoFocus,
  onFocus,
  onClick,
  onEdit,
  onEscape,
  onSubmit,
  clearLabel = 'Clear search',
  alwaysShowClear = false,
}: {
  inputRef: Ref<HTMLInputElement>;
  placeholder: string;
  className?: string;
  /** Focus the field when it mounts (the mobile search page). */
  autoFocus?: boolean;
  /** Accessible name of the ✕ button. */
  clearLabel?: string;
  /** Keep the ✕ even when the box is empty (it is the panel's only close). */
  alwaysShowClear?: boolean;
  onFocus?: () => void;
  onClick?: () => void;
  onEdit?: () => void;
  onEscape?: () => void;
  onSubmit: () => void;
}) {
  const { chips, draft, setDraft, removeLastChip, clear } = useSearchPanel();

  return (
    <InputGroup className={className}>
      <InputGroupAddon>
        <Search />
      </InputGroupAddon>
      {chips.map((chip) => (
        <SearchChip key={chip.key} chip={chip} />
      ))}
      <InputGroupInput
        ref={inputRef}
        value={draft}
        autoFocus={autoFocus}
        onChange={(event) => {
          setDraft(event.target.value);
          onEdit?.();
        }}
        onFocus={onFocus}
        onClick={onClick}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onEscape?.();
          if (event.key === 'Enter') {
            event.preventDefault();
            onSubmit();
          }
          // Backspace in an empty field takes the last badge off.
          if (event.key === 'Backspace' && !draft && chips.length > 0) {
            event.preventDefault();
            removeLastChip();
          }
        }}
        placeholder={chips.length > 0 ? '' : placeholder}
        aria-label={placeholder}
        className="min-w-12"
      />
      {alwaysShowClear || chips.length > 0 || draft ? (
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            size="icon-xs"
            aria-label={clearLabel}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              clear();
              onEdit?.();
            }}
          >
            <X />
          </InputGroupButton>
        </InputGroupAddon>
      ) : null}
    </InputGroup>
  );
}
