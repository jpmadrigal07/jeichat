import toast from 'react-hot-toast';

export async function copyMessageText(content: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(content);
    toast.success('Copied to clipboard');
  } catch {
    toast.error('Could not copy message');
  }
}
