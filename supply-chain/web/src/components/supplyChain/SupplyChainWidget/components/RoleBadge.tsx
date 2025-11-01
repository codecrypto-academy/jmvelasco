import { UserRole } from '../../../../lib/enums';
import { getRoleConfig, getRoleIcon } from '../config/roleConfigs';

interface RoleBadgeProps {
  readonly role: UserRole;
  readonly showIcon?: boolean;
  readonly size?: 'sm' | 'md' | 'lg';
}

export function RoleBadge({ role, showIcon = true, size = 'md' }: RoleBadgeProps) {
  const config = getRoleConfig(role);
  const icon = getRoleIcon(role);

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  };

  return (
    <div
      className={`
      inline-flex items-center space-x-1 rounded-full font-medium
      ${config.colorScheme.badge.background} 
      ${config.colorScheme.badge.text}
      ${sizeClasses[size]}
    `}
    >
      {showIcon && <span>{icon}</span>}
      <span>{role}</span>
    </div>
  );
}
