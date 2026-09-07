'use client';

import { useEffect } from 'react';
import { useDocumentTitle } from '../_hooks/use-document-title';

export function DocumentTitle() {
  const title = useDocumentTitle();

  useEffect(() => {
    const apply = () => {
      if (document.title !== title) document.title = title;
    };

    apply();

    const titleEl = document.querySelector('title');
    if (!titleEl) return;

    const observer = new MutationObserver(apply);
    observer.observe(titleEl, {
      childList: true,
      characterData: true,
      subtree: true,
    });
    return () => observer.disconnect();
  }, [title]);

  return null;
}
