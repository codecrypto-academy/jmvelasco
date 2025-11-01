import React from 'react';

interface BadgeProps {
  status: 'Pending' | 'Accepted' | 'Rejected';
  children?: React.ReactNode;
}

const Badge: React.FC<BadgeProps> = ({ status, children }) => {
  const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';

  const statusClasses = {
    Pending: 'bg-yellow-100 text-yellow-800',
    Accepted: 'bg-green-100 text-green-800',
    Rejected: 'bg-red-100 text-red-800',
  };

  return (
    <span
      className={`${baseClasses} ${statusClasses[status]}`}
      data-testid={`badge-status-${status}`}
    >
      {children || status}
    </span>
  );
};

export default Badge;
