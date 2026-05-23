/** Shared footer shell — fixed 16px padding on all sides, min height aligned with user bar. */
const chatFooterShellClass =
  'shrink-0 border-t px-4 py-4 min-h-[4.9375rem]';

/** User bar: vertically center profile in the footer. */
export const chatUserFooterClass = `${chatFooterShellClass} flex items-center`;

/** Message input: grow with textarea, keep padding; send button stays bottom-aligned. */
export const chatMessageFooterClass = `${chatFooterShellClass} flex items-end`;
