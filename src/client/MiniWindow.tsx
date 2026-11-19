import type { ReactNode } from 'react';

export function MiniWindow({
  title,
  className = '',
  children,
}: {
  title: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`mini-window ${className}`}>
      <div className="mini-window-header negative-text">{title}</div>
      <div className="mini-window-body">{children}</div>
    </section>
  );
}
