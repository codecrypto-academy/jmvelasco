import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { SupplyChain__factory } from '../types/factories/SupplyChain__factory';
import { CONTRACT_CONFIG } from '../config/contracts';
import { UserRole, UserStatus, TransferStatus } from '../lib/enums';

// Helper para obtener provider de solo lectura
async function getReadProvider(): Promise<ethers.JsonRpcProvider> {
  return new ethers.JsonRpcProvider('http://localhost:8545');
}

// Helper para obtener signer autenticado (necesario para funciones onlyAdmin)
async function getAdminSigner(): Promise<ethers.Signer> {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('MetaMask not available');
  }
  const provider = new ethers.BrowserProvider(window.ethereum);
  return provider.getSigner();
}

export interface AdminTokenRow {
  userAddress: string;
  userRole: UserRole;
  tokenId: number;
  tokenName: string;
  currentBalance: number;
  notes: string;
}

export interface ConservationRow {
  tokenName: string;
  totalSupply: number;
  accountedBalance: number;
  processedAmount: number;
  isConserved: boolean;
  distribution: string;
}

export interface TransferHistoryRow {
  transferId: number;
  fromAddress: string;
  fromRole: UserRole;
  toAddress: string;
  toRole: UserRole;
  tokenName: string;
  amount: number;
  status: TransferStatus;
  dateCreated: Date;
}

export interface AdminSupplyChainData {
  tokenRows: AdminTokenRow[];
  conservationRows: ConservationRow[];
  transferRows: TransferHistoryRow[];
}

export function useAdminSupplyChain(enabled: boolean) {
  const [data, setData] = useState<AdminSupplyChainData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAllData = useCallback(async () => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Obtener signer para funciones admin y provider para lectura
      const signer = await getAdminSigner();
      const adminContract = SupplyChain__factory.connect(CONTRACT_CONFIG.address, signer);

      const readProvider = await getReadProvider();
      const readContract = SupplyChain__factory.connect(CONTRACT_CONFIG.address, readProvider);

      // 1. Obtener todos los usuarios usando getAllUsers (requiere admin)
      const allUsersFromContract = await adminContract.getAllUsers();
      const users: Array<{ id: number; address: string; role: UserRole; status: UserStatus }> = [];

      for (const user of allUsersFromContract) {
        // Mapear status numérico a enum string
        const statusMap: Record<number, UserStatus> = {
          0: UserStatus.Pending,
          1: UserStatus.Approved,
          2: UserStatus.Rejected,
        };

        users.push({
          id: Number(user.id),
          address: user.userAddress,
          role: user.role as UserRole,
          status: statusMap[Number(user.status)] || UserStatus.Pending,
        });
      }

      // 2. Obtener el total de tokens y obtener cada uno (función pública)
      const nextTokenId = Number(await readContract.nextTokenId());
      const tokens: Array<{
        id: number;
        creator: string;
        name: string;
        totalSupply: number;
        features: string;
        parentId: number;
        dateCreated: string;
      }> = [];

      for (let i = 1; i < nextTokenId; i++) {
        try {
          const tokenData = await readContract.getToken(i);
          tokens.push({
            id: Number(tokenData[0]),
            creator: tokenData[1],
            name: tokenData[2],
            totalSupply: Number(tokenData[3]),
            features: tokenData[4],
            parentId: Number(tokenData[5]),
            dateCreated: new Date(Number(tokenData[6]) * 1000).toISOString(),
          });
        } catch (err) {
          console.warn(`[Admin] Error obteniendo token ${i}:`, err);
        }
      }

      // 3. Calcular balances de tokens por usuario
      const tokenRows: AdminTokenRow[] = [];

      for (const user of users) {
        for (const token of tokens) {
          try {
            const balance = Number(await readContract.getTokenBalance(token.id, user.address));
            if (balance > 0) {
              // Calcular notas detalladas
              let notes = '';

              if (token.creator.toLowerCase() === user.address.toLowerCase()) {
                // Usuario creó este token
                const transferred = token.totalSupply - balance;
                notes = `Original: ${token.totalSupply}, transferidos: ${transferred}`;

                // Contar rechazados si es el creador
                const rejectedCount = await calculateRejectedTransfers(
                  readContract as unknown as ethers.Contract,
                  user.address,
                  token.id
                );
                if (rejectedCount > 0) {
                  notes += `, rechazados: ${rejectedCount}`;
                }
              } else {
                // Usuario recibió este token
                const creatorUser = users.find(
                  (u) => u.address.toLowerCase() === token.creator.toLowerCase()
                );
                const creatorRole = creatorUser?.role || 'Unknown';
                notes = `Recibidos del ${creatorRole}`;

                // Si es Factory/Retailer y el token tiene parentId > 0
                if (
                  token.parentId > 0 &&
                  (user.role === UserRole.Factory || user.role === UserRole.Retailer)
                ) {
                  const childTokens = tokens.filter((t) => t.parentId === token.id);
                  if (childTokens.length > 0) {
                    const processedAmount = childTokens.reduce(
                      (sum, child) => sum + child.totalSupply,
                      0
                    );
                    notes += `, procesados: ${processedAmount}`;
                  }
                }
              }

              tokenRows.push({
                userAddress: user.address,
                userRole: user.role,
                tokenId: token.id,
                tokenName: token.name,
                currentBalance: balance,
                notes,
              });
            }
          } catch (e) {
            console.warn(`Error fetching balance for user ${user.address}, token ${token.id}:`, e);
          }
        }
      }

      // 4. Calcular conservación de tokens
      const conservationRows: ConservationRow[] = [];
      const processedTokensByParent = new Map<number, number>();

      // Primero, calcular cuánto se procesó de cada token padre
      for (const token of tokens) {
        if (token.parentId > 0) {
          const current = processedTokensByParent.get(token.parentId) || 0;
          processedTokensByParent.set(token.parentId, current + token.totalSupply);
        }
      }

      // Calcular conservación para tokens raíz (parentId = 0)
      const rootTokens = tokens.filter((t) => t.parentId === 0);
      for (const rootToken of rootTokens) {
        const accountedBalance = tokenRows
          .filter((row) => row.tokenId === rootToken.id)
          .reduce((sum, row) => sum + row.currentBalance, 0);

        const processedAmount = processedTokensByParent.get(rootToken.id) || 0;
        const isConserved = accountedBalance + processedAmount === rootToken.totalSupply;

        // Crear string de distribución
        const userBalances = tokenRows
          .filter((row) => row.tokenId === rootToken.id)
          .map((row) => `${row.userRole}: ${row.currentBalance}`)
          .join(' + ');

        let distribution = userBalances;
        if (processedAmount > 0) {
          distribution += ` + Procesado: ${processedAmount}`;
        }

        conservationRows.push({
          tokenName: `${rootToken.name} Total`,
          totalSupply: rootToken.totalSupply,
          accountedBalance,
          processedAmount,
          isConserved,
          distribution,
        });
      }

      // También añadir tokens procesados
      const processedTokens = tokens.filter((t) => t.parentId > 0);
      const uniqueProcessedNames = [...new Set(processedTokens.map((t) => t.name))];

      for (const tokenName of uniqueProcessedNames) {
        const sameNameTokens = processedTokens.filter((t) => t.name === tokenName);
        const totalSupply = sameNameTokens.reduce((sum, t) => sum + t.totalSupply, 0);

        const accountedBalance = tokenRows
          .filter((row) => sameNameTokens.some((t) => t.id === row.tokenId))
          .reduce((sum, row) => sum + row.currentBalance, 0);

        // Calcular si alguno de estos tokens fue procesado a su vez
        const furtherProcessed = sameNameTokens.reduce((sum, token) => {
          return sum + (processedTokensByParent.get(token.id) || 0);
        }, 0);

        const isConserved = accountedBalance + furtherProcessed === totalSupply;

        const userBalances = tokenRows
          .filter((row) => sameNameTokens.some((t) => t.id === row.tokenId))
          .reduce((acc, row) => {
            const existing = acc.get(row.userRole) || 0;
            acc.set(row.userRole, existing + row.currentBalance);
            return acc;
          }, new Map<UserRole, number>());

        let distribution = Array.from(userBalances.entries())
          .map(([role, balance]) => `${role}: ${balance}`)
          .join(' + ');

        if (furtherProcessed > 0) {
          distribution += ` + Procesado: ${furtherProcessed}`;
        }

        conservationRows.push({
          tokenName: `${tokenName} Total`,
          totalSupply,
          accountedBalance,
          processedAmount: furtherProcessed,
          isConserved,
          distribution,
        });
      }

      // 5. Obtener historial de transferencias
      const nextTransferId = Number(await readContract.nextTransferId());
      const transferRows: TransferHistoryRow[] = [];

      for (let i = 1; i < nextTransferId; i++) {
        try {
          const transfer = await readContract.getTransfer(i);
          const token = tokens.find((t) => t.id === Number(transfer.tokenId));
          const fromUser = users.find(
            (u) => u.address.toLowerCase() === transfer.from.toLowerCase()
          );
          const toUser = users.find((u) => u.address.toLowerCase() === transfer.to.toLowerCase());

          if (token && fromUser && toUser) {
            // Mapear status numérico a enum string
            const transferStatusMap: Record<number, TransferStatus> = {
              0: TransferStatus.Pending,
              1: TransferStatus.Accepted,
              2: TransferStatus.Rejected,
            };

            transferRows.push({
              transferId: i,
              fromAddress: transfer.from,
              fromRole: fromUser.role,
              toAddress: transfer.to,
              toRole: toUser.role,
              tokenName: token.name,
              amount: Number(transfer.amount),
              status: transferStatusMap[Number(transfer.status)] || TransferStatus.Pending,
              dateCreated: new Date(Number(transfer.dateCreated) * 1000),
            });
          }
        } catch (e) {
          console.warn(`Error fetching transfer ${i}:`, e);
        }
      }

      // Ordenar transferencias por fecha (más recientes primero)
      transferRows.sort((a, b) => b.dateCreated.getTime() - a.dateCreated.getTime());

      setData({
        tokenRows,
        conservationRows,
        transferRows,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch admin supply chain data');
      console.error('Admin supply chain data error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  return { data, isLoading, error, refetch: fetchAllData };
}

// Helper function para calcular transferencias rechazadas
async function calculateRejectedTransfers(
  contract: ethers.Contract,
  userAddress: string,
  tokenId: number
): Promise<number> {
  try {
    const nextTransferId = Number(await contract.nextTransferId());
    let rejectedAmount = 0;

    for (let i = 1; i < nextTransferId; i++) {
      try {
        const transfer = await contract.getTransfer(i);
        if (
          transfer.from.toLowerCase() === userAddress.toLowerCase() &&
          Number(transfer.tokenId) === tokenId &&
          Number(transfer.status) === 2 // 2 = Rejected
        ) {
          rejectedAmount += Number(transfer.amount);
        }
      } catch {
        continue;
      }
    }

    return rejectedAmount;
  } catch {
    return 0;
  }
}
