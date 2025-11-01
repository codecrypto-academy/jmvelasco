import { UserRole } from '../../../../lib/enums';
import { useConsumerData } from './useConsumerData';
import { useRetailerData } from './useRetailerData';
import { useProducerData } from './useProducerData';
import { useFactoryData } from './useFactoryData';
import type { RoleSpecificData, UseRoleDataReturn } from '../config/types';

export function useRoleSpecificData(
  role: UserRole | null,
  address: `0x${string}` | null
): UseRoleDataReturn<RoleSpecificData> {
  // Use hooks for all role types
  const consumerHook = useConsumerData(role === UserRole.Consumer ? address : null);
  const retailerHook = useRetailerData(role === UserRole.Retailer ? address : null);
  const producerHook = useProducerData(role === UserRole.Producer ? address : null);
  const factoryHook = useFactoryData(role === UserRole.Factory ? address : null);

  // Return appropriate data based on role
  switch (role) {
    case UserRole.Producer:
      return producerHook as UseRoleDataReturn<RoleSpecificData>;

    case UserRole.Factory:
      return factoryHook as UseRoleDataReturn<RoleSpecificData>;

    case UserRole.Consumer:
      return consumerHook as UseRoleDataReturn<RoleSpecificData>;

    case UserRole.Retailer:
      return retailerHook as UseRoleDataReturn<RoleSpecificData>;

    case UserRole.Admin:
      // For now, Admin gets Producer-like view
      return producerHook as UseRoleDataReturn<RoleSpecificData>;

    default:
      return {
        data: null,
        isLoading: false,
        error: null,
        refresh: () => {},
      };
  }
}
