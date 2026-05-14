'use client';

export default function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 p-2">
      <span
        className="size-1 rounded-full bg-koala-purple animate-dot-pulse"
        style={{ animationDelay: '0ms' }}
      />
      <span
        className="size-1 rounded-full bg-koala-purple animate-dot-pulse"
        style={{ animationDelay: '200ms' }}
      />
      <span
        className="size-1 rounded-full bg-koala-purple animate-dot-pulse"
        style={{ animationDelay: '400ms' }}
      />
    </div>
  );
}
