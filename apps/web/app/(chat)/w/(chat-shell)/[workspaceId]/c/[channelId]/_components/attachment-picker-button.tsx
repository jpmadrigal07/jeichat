'use client';

import { useRef } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ATTACHMENT_ACCEPT_ATTR } from '@/lib/attachment-mime';

type AttachmentPickerButtonProps = {
  onAdd: (files: File[]) => void;
};

export function AttachmentPickerButton({ onAdd }: AttachmentPickerButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        hidden
        accept={ATTACHMENT_ACCEPT_ATTR}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          onAdd(files);
          e.target.value = '';
        }}
      />
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-7 w-7 shrink-0"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
        aria-label="Attach files"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </>
  );
}
