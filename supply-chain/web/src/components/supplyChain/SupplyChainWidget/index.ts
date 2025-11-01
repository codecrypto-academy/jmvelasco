/**
 * Supply Chain Widget exports
 * Modern modular architecture
 */

export { SupplyChainWidget } from './SupplyChainWidget';
export { RoleBadge } from './components/RoleBadge';
export { ConsumerWidgetContent } from './components/ConsumerWidgetContent';
export { RetailerWidgetContent } from './components/RetailerWidgetContent';
export { useConsumerData } from './hooks/useConsumerData';
export { useRetailerData } from './hooks/useRetailerData';
export { getRoleConfig, getRoleIcon, roleConfigs } from './config/roleConfigs';
export type {
  RoleConfig,
  ColorScheme,
  ConsumerWidgetData,
  RetailerWidgetData,
  UseRoleDataReturn,
} from './config/types';
