/** Shared footer shell — fixed 16px padding on all sides, min height aligned with user bar. */
const chatFooterShellClass =
  'shrink-0 px-4 py-4 min-h-[4.9375rem]';

/** User bar: vertically center profile in the footer. */
export const chatUserFooterClass = `${chatFooterShellClass} border-t flex items-center`;

/** Message input footer. */
export const chatMessageFooterClass = `${chatFooterShellClass} border-t flex items-end`;
