import React from 'react';

export type AlertKind = 'info' | 'success' | 'error' | 'neutral';

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  kind?: AlertKind;
  children: React.ReactNode;
  testId?: string;
}

/**
 * Small presentational alert used to show feedback messages consistently.
 * Keeps semantics (role=status, aria-live=polite) for screen readers.
 * Note: keep text content identical to existing usages to avoid breaking tests.
 */
export default function Alert({
  kind = 'neutral',
  children,
  className = '',
  testId,
  ...rest
}: AlertProps) {
  const color =
    kind === 'success'
      ? 'text-green-600'
      : kind === 'error'
        ? 'text-red-600'
        : kind === 'info'
          ? 'text-blue-600'
          : 'text-gray-600';
  const cls = `text-sm ${color} ${className}`.trim();
  return (
    <div role="status" aria-live="polite" data-testid={testId} className={cls} {...rest}>
      {children}
    </div>
  );
}
