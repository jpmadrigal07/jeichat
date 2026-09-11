type TypingIndicatorProps = {
  users: string[];
};

export function TypingIndicator({ users }: TypingIndicatorProps) {
  if (users.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 px-4 py-1.5">
      <div className="flex items-center gap-1.5 text-[11px] leading-none text-muted-foreground">
        <span className="flex items-center gap-0.5" aria-hidden="true">
          <span className="size-[3px] animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
          <span className="size-[3px] animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
          <span className="size-[3px] animate-bounce rounded-full bg-muted-foreground" />
        </span>
        <span>
          {users.length === 1 && (
            <>
              <span className="font-semibold text-foreground">{users[0]}</span>
              {' is typing...'}
            </>
          )}
          {users.length === 2 && (
            <>
              <span className="font-semibold text-foreground">{users[0]}</span>
              {' and '}
              <span className="font-semibold text-foreground">{users[1]}</span>
              {' are typing...'}
            </>
          )}
          {users.length > 2 && 'Several people are typing...'}
        </span>
      </div>
    </div>
  );
}
