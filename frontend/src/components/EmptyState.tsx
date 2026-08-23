import { ReactNode } from 'react';

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4">
      {icon && <div className="mb-4 text-espresso/30">{icon}</div>}
      <h3 className="text-lg font-semibold text-espresso mb-1">{title}</h3>
      {description && <p className="text-sm text-charcoal/60 max-w-sm mb-4">{description}</p>}
      {action}
    </div>
  );
}
