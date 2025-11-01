/**
 * Production-Ready Test Mocks
 *
 * Estos mocks remplazan datos hardcodeados con datos predecibles
 * que no dependen del estado específico del contrato.
 *
 * Esto hace que los tests sean independientes del deployment
 * y funcionen en cualquier entorno limpio.
 */

import { vi } from 'vitest';
import type { TokenLineage } from '../../types/traceability';

// Addresses válidas para tests (formato correcto de Ethereum)
export const TEST_ADDRESSES = {
  producer: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
  factory: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
  retailer: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
  consumer: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
  admin: '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc',
} as const;

// Mock data que simula una cadena de suministro realista
export const MOCK_SUPPLY_CHAIN = {
  rawMaterial: {
    tokenId: 1,
    parentId: 0,
    name: 'Test Raw Soybeans',
    creator: TEST_ADDRESSES.producer,
    creatorRole: 'Producer',
    createdAt: 1698000000,
    level: 0,
    currentBalance: 500,
    totalSupply: 1000,
    features: '{"type": "raw", "organic": true}',
  },
  processed: {
    tokenId: 2,
    parentId: 1,
    name: 'Test Processed Soy Milk',
    creator: TEST_ADDRESSES.factory,
    creatorRole: 'Factory',
    createdAt: 1698001000,
    level: 1,
    currentBalance: 200,
    totalSupply: 300,
    features: '{"type": "processed", "pasteurized": true}',
  },
  packaged: {
    tokenId: 3,
    parentId: 2,
    name: 'Test Packaged Soy Milk',
    creator: TEST_ADDRESSES.retailer,
    creatorRole: 'Retailer',
    createdAt: 1698002000,
    level: 2,
    currentBalance: 50,
    totalSupply: 100,
    features: '{"type": "packaged", "expiry": "2025-12-31"}',
  },
} as const;

/**
 * Genera lineage mock para cualquier token de test
 */
export function getMockTokenLineage(tokenId: number): TokenLineage[] {
  if (tokenId === 1) {
    // Raw material - no ancestors
    return [];
  }

  if (tokenId === 2) {
    // Processed product - only raw material ancestor
    return [MOCK_SUPPLY_CHAIN.rawMaterial];
  }

  if (tokenId === 3) {
    // Packaged product - full lineage
    return [MOCK_SUPPLY_CHAIN.rawMaterial, MOCK_SUPPLY_CHAIN.processed];
  }

  // Default empty for unknown tokens
  return [];
}

/**
 * Mock user info predecible
 */
export function getMockUserInfo(address: string) {
  if (address === TEST_ADDRESSES.producer) {
    return { role: 'Producer', status: 'Approved' };
  }
  if (address === TEST_ADDRESSES.factory) {
    return { role: 'Factory', status: 'Approved' };
  }
  if (address === TEST_ADDRESSES.retailer) {
    return { role: 'Retailer', status: 'Approved' };
  }
  if (address === TEST_ADDRESSES.consumer) {
    return { role: 'Consumer', status: 'Approved' };
  }

  // Invalid/unknown addresses
  throw new Error('User not found');
}

/**
 * Setup mock para funciones de contract.ts
 */
export function setupContractMocks() {
  // Mock getTokenDetails para devolver datos predecibles
  const mockGetTokenDetails = vi.fn().mockImplementation(async (tokenId: number) => {
    if (tokenId === 1) {
      return {
        id: 1,
        name: 'Test Raw Soybeans',
        creator: TEST_ADDRESSES.producer,
        parentId: 0,
        dateCreated: 1698000000,
        totalSupply: 1000,
        balance: 500,
        features: '{"type": "raw", "organic": true}',
      };
    }
    if (tokenId === 2) {
      return {
        id: 2,
        name: 'Test Processed Soy Milk',
        creator: TEST_ADDRESSES.factory,
        parentId: 1,
        dateCreated: 1698001000,
        totalSupply: 300,
        balance: 200,
        features: '{"type": "processed", "pasteurized": true}',
      };
    }
    if (tokenId === 3) {
      return {
        id: 3,
        name: 'Test Packaged Soy Milk',
        creator: TEST_ADDRESSES.retailer,
        parentId: 2,
        dateCreated: 1698002000,
        totalSupply: 100,
        balance: 50,
        features: '{"type": "packaged", "expiry": "2025-12-31"}',
      };
    }

    // Token no existe
    return null;
  });

  // Mock getUserInfo para addresses válidas
  const mockGetUserInfo = vi.fn().mockImplementation(async (address: string) => {
    try {
      return getMockUserInfo(address);
    } catch {
      // Para addresses no válidas, devolver datos "Unknown" en lugar de lanzar error
      // Esto simula el comportamiento real de la función que maneja errores
      return { role: 'Unknown', status: 'Unknown' };
    }
  });

  return {
    mockGetTokenDetails,
    mockGetUserInfo,
  };
}
