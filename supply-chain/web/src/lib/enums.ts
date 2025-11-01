// Enums y helpers estrictos para roles y status
export const UserRole = {
  Producer: 'Producer',
  Factory: 'Factory',
  Retailer: 'Retailer',
  Consumer: 'Consumer',
  Admin: 'Admin',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const UserStatus = {
  Pending: 'Pending',
  Approved: 'Approved',
  Rejected: 'Rejected',
} as const;

export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

export const ROLES = [
  { value: UserRole.Producer, label: 'Producer' },
  { value: UserRole.Factory, label: 'Factory' },
  { value: UserRole.Retailer, label: 'Retailer' },
  { value: UserRole.Consumer, label: 'Consumer' },
];

export const STATUS_LABELS: Record<UserStatus, string> = {
  [UserStatus.Pending]: 'Pending',
  [UserStatus.Approved]: 'Approved',
  [UserStatus.Rejected]: 'Rejected',
};

export const TransferStatus = {
  Pending: 'Pending',
  Accepted: 'Accepted',
  Rejected: 'Rejected',
} as const;

export type TransferStatus = (typeof TransferStatus)[keyof typeof TransferStatus];
