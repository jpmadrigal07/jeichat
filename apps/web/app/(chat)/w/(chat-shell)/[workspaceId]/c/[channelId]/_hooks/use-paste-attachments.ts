'use client';

import { useCallback, useEffect } from 'react';

export function usePasteAttachments(onAdd: (files: File[]) => void) {
  const handler = useCallback(
    (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files ?? []);
      if (files.length) {
        e.preventDefault();
        onAdd(files);
      }
    },
    [onAdd],
  );

  useEffect(() => {
    window.addEventListener('paste', handler);
    return () => window.removeEventListener('paste', handler);
  }, [handler]);
}
