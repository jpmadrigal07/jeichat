import { ChatShellFrame } from '../../../_components/chat-shell-frame';

export default function WorkspaceChatShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ChatShellFrame>{children}</ChatShellFrame>;
}
