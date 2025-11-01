import { useState } from 'react';
import { useContractEvent } from '../../hooks/useContractEvent';
import { useWallet } from '../../hooks/useWallet';
import type { TokenDetails } from '../../lib/contract';
import {
  getAvailableBalance,
  getTokenDetails,
  getUserTokensWithAvailableBalance,
  requestTransfer,
} from '../../lib/contract';

import ActionCard from '../ui/ActionCard';
import Alert from '../ui/Alert';

// Extended token details with available balance
type TokenDetailsWithAvailableBalance = TokenDetails & {
  availableBalance: number;
};

export default function TransferToConsumer() {
  /**
   * Stub: Componente TransferToConsumer
   * Estado: MVP incompleto
   * Requisitos:
   *   - Permitir a Retailer transferir productos empaquetados a Consumer
   *   - Validar que solo tokens empaquetados pueden ser transferidos
   *   - Mostrar formulario con selección de tokens, dirección y cantidad
   *   - Deshabilitar botón si campos inválidos
   *   - Emitir evento de transferencia y actualizar balances
   *   - Mostrar mensajes de éxito/error en el DOM
   * Notas:
   *   - Falta lógica de integración con contract.ts
   *   - Falta test de cobertura y validación de accesibilidad
   */
  const { address } = useWallet();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [eligible, setEligible] = useState<TokenDetailsWithAvailableBalance[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Listen for TransferRequested events to trigger re-render
  const handleTransferRequested = (from: string) => {
    if (from === address) {
      // Transfer successful - component will re-render automatically due to event listener
    }
  };

  useContractEvent('TransferRequested', handleTransferRequested, [
    handleTransferRequested,
    address,
  ]);

  async function loadTokens() {
    if (!address) return;
    setLoading(true);
    try {
      // Get only tokens with available balance > 0 (already filtered)
      const availableTokenIds = await getUserTokensWithAvailableBalance(address);

      // Get token details for available tokens
      const details = await Promise.all(
        availableTokenIds.map((id) => getTokenDetails(id, address))
      );

      // Calculate available balance for each token (single calculation)
      const detailsWithAvailable = await Promise.all(
        (details.filter(Boolean) as TokenDetails[]).map(async (token) => {
          const availableBalance = await getAvailableBalance(token.id, address);
          return { ...token, availableBalance } as TokenDetailsWithAvailableBalance;
        })
      );

      // Filter only for retailer-created tokens (packaged products) with available balance > 0
      // Double-check available balance since getUserTokensWithAvailableBalance may have timing issues
      // FIXED: Use case-insensitive comparison for addresses
      const filtered = detailsWithAvailable.filter(
        (t) =>
          t.creator.toLowerCase() === address.toLowerCase() &&
          t.parentId > 0 &&
          t.availableBalance > 0
      );

      setEligible(filtered);
      setSelectedId(filtered.length ? filtered[0].id : null);
    } finally {
      setLoading(false);
    }
  }

  const handleOpen = () => {
    setOpen(true);
    void loadTokens();
  };

  return (
    <ActionCard
      title="Transfer to Consumer"
      description="Sell products to end consumers"
      icon="🛒"
      onClick={open ? undefined : handleOpen}
    >
      {open && (
        <div className="mt-4 space-y-3">
          {loading ? (
            <div className="text-sm text-blue-600">Loading tokens…</div>
          ) : eligible.length === 0 ? (
            <div className="text-sm text-gray-600">No packaged tokens with balance available.</div>
          ) : (
            <>
              <div>
                <label
                  htmlFor="select-token"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Select Token
                </label>
                <select
                  id="select-token"
                  aria-label="Select token"
                  className="w-full text-gray-600 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={selectedId ?? ''}
                  onChange={(e) => setSelectedId(Number(e.target.value))}
                >
                  {eligible.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} (Balance: {t.availableBalance})
                    </option>
                  ))}
                </select>
              </div>
              {selectedId !== null &&
                (() => {
                  const token = eligible.find((t) => t.id === selectedId);
                  return token ? (
                    <TransferForm tokenId={token.id} balance={token.availableBalance} />
                  ) : null;
                })()}
            </>
          )}
        </div>
      )}
    </ActionCard>
  );
}

type TransferFormProps = {
  tokenId: number;
  balance: number;
};

function TransferForm({ tokenId, balance }: TransferFormProps) {
  const [formData, setFormData] = useState({
    consumerAddress: '',
    amount: '',
  });
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function isValidAddress(addr: string) {
    return addr.startsWith('0x') && addr.length === 42;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = Number(formData.amount);

    // Validation
    if (!formData.consumerAddress) {
      setMessage('Consumer address is required');
      return;
    }
    if (!isValidAddress(formData.consumerAddress)) {
      setMessage('Invalid destination address');
      return;
    }
    if (!formData.amount || amountNum <= 0) {
      setMessage('Amount must be greater than 0');
      return;
    }
    if (amountNum > balance) {
      setMessage('Insufficient balance');
      return;
    }

    setLoading(true);
    setMessage('Requesting transfer…');
    try {
      await requestTransfer(tokenId, formData.consumerAddress, amountNum);
      setMessage('Transfer requested successfully');
      // Reset form after success
      setTimeout(() => {
        setMessage(null);
        setFormData({ consumerAddress: '', amount: '' });
      }, 2000);
    } catch (error) {
      console.error('Error requesting transfer:', error);
      setMessage(error instanceof Error ? error.message : 'Transfer request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3" noValidate>
      <div>
        <label htmlFor="consumer-address" className="block text-sm font-medium text-gray-700 mb-1">
          Consumer Address
        </label>
        <input
          id="consumer-address"
          type="text"
          value={formData.consumerAddress}
          disabled={loading}
          aria-label="Consumer address"
          aria-invalid={
            !!message && (!formData.consumerAddress || !isValidAddress(formData.consumerAddress))
          }
          onChange={(e) => {
            setFormData({ ...formData, consumerAddress: e.target.value });
            if (message) setMessage(null);
          }}
          className="w-full text-gray-600 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="0x..."
        />
      </div>
      <div>
        <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
          Amount
        </label>
        <input
          id="amount"
          type="number"
          inputMode="numeric"
          min="1"
          max={balance}
          value={formData.amount}
          disabled={loading}
          aria-label="Amount"
          aria-invalid={
            !!message &&
            (!formData.amount || Number(formData.amount) <= 0 || Number(formData.amount) > balance)
          }
          onChange={(e) => {
            setFormData({ ...formData, amount: e.target.value });
            if (message) setMessage(null);
          }}
          className="w-full text-gray-600 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={`Max ${balance}`}
        />
      </div>
      {message && (
        <Alert
          kind={
            message === 'Transfer requested successfully'
              ? 'success'
              : message === 'Requesting transfer…'
                ? 'info'
                : 'error'
          }
        >
          {message}
        </Alert>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-60"
      >
        {loading ? 'Requesting…' : 'Transfer'}
      </button>
    </form>
  );
}
