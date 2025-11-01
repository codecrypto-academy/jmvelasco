import { ethers } from 'ethers';
import { useEffect, useState } from 'react';
import { CONTRACT_CONFIG } from '../../config/contracts';
import { useWallet } from '../../hooks/useWallet';
import type { TokenDetails } from '../../lib/contract';
import {
  getTokenDetails,
  getUserInfo,
  getUserTokensWithBalance,
  requestTransfer,
} from '../../lib/contract';
import { SupplyChain__factory } from '../../types/factories/SupplyChain__factory';
import ActionCard from '../ui/ActionCard';
import Alert from '../ui/Alert';

export default function TransferToRetailerCard() {
  const { address } = useWallet();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [eligible, setEligible] = useState<TokenDetails[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  async function loadTokens() {
    if (!address) return;
    setLoading(true);
    try {
      const ids = await getUserTokensWithBalance(address);
      const details = await Promise.all(ids.map((id) => getTokenDetails(id, address)));
      const filtered = (details.filter(Boolean) as TokenDetails[]).filter(
        (t) => t.parentId > 0 && t.balance > 0
      );
      setEligible(filtered);
      setSelectedId(filtered.length ? filtered[0].id : null);
    } finally {
      setLoading(false);
    }
  }

  const handleOpen = () => {
    setOpen(true);
    // fire and forget
    void loadTokens();
  };

  return (
    <ActionCard
      title="Transfer to Retailer"
      description="Send processed products to retailers"
      icon="🏪"
      onClick={open ? undefined : handleOpen}
    >
      {open && (
        <div className="mt-4 space-y-3">
          {loading ? (
            <div className="text-sm text-blue-600">Loading tokens…</div>
          ) : eligible.length === 0 ? (
            <div className="text-sm text-gray-600">No processed tokens with balance available.</div>
          ) : (
            <>
              <div>
                <label
                  htmlFor="transfer-token"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Token
                </label>
                <select
                  id="transfer-token"
                  aria-label="Token"
                  className="w-full text-gray-600 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={selectedId ?? ''}
                  onChange={(e) => setSelectedId(Number(e.target.value))}
                >
                  {eligible.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              {selectedId !== null &&
                (() => {
                  const token = eligible.find((t) => t.id === selectedId);
                  return token ? (
                    <TransferForm
                      tokenId={token.id}
                      parentId={token.parentId}
                      balance={token.balance}
                    />
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
  parentId: number;
  balance: number;
};

export function TransferForm({ tokenId, parentId, balance }: TransferFormProps) {
  const { address } = useWallet();
  const [destination, setDestination] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPending, setShowPending] = useState(false);

  function isValidAddress(addr: string) {
    // Accepts 0x-prefixed, 40 hex chars (simple check)
    return /^0x[a-fA-F0-9]{40}$/.test(addr);
  }

  // When the transfer is effectively requested (event observed), clear the form and hide message
  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum || !address) return;
    const lowerAddr = address?.toLowerCase();

    let provider: ethers.BrowserProvider | null = null;
    let contract: any = null;
    let handler: ((...args: any[]) => void) | null = null;
    let eventFilter: any = null;

    async function setup() {
      try {
        provider = new ethers.BrowserProvider(window.ethereum);
        contract = SupplyChain__factory.connect(CONTRACT_CONFIG.address, provider);

        handler = (...eventArgs: any[]) => {
          if (eventArgs.length === 1 && eventArgs[0]?.args) {
            const a = eventArgs[0].args;
            const from = a?.from ?? a?.[1];
            if (from && lowerAddr && String(from).toLowerCase() === lowerAddr) {
              // Considered "displayed" once the event is received by the app
              setDestination('');
              setAmount('');
              setMessage(null);
              setShowPending(false);
            }
          }
        };

        eventFilter = contract.filters.TransferRequested();
        contract.on(eventFilter, handler);
      } catch (e) {
        // Non-fatal: if listener fails we keep default behavior
        console.error('Failed to setup TransferRequested listener in form:', e);
      }
    }

    void setup();

    return () => {
      if (contract && handler) {
        try {
          if (typeof contract.off === 'function') {
            contract.off(eventFilter ?? 'TransferRequested', handler);
          } else if (typeof contract.removeListener === 'function') {
            contract.removeListener(eventFilter ?? 'TransferRequested', handler);
          } else if (typeof contract.removeAllListeners === 'function') {
            contract.removeAllListeners(eventFilter ?? 'TransferRequested');
          }
        } catch {
          // ignore cleanup errors
        }
      }
    };
  }, [address]);

  if (parentId === 0) {
    return (
      <div data-testid="transfer-form">
        <p>Raw material tokens cannot be transferred by factory</p>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidAddress(destination)) {
      return;
    }
    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setMessage('Amount must be greater than 0');
      return;
    }
    if (amountNum > balance) {
      setMessage('Insufficient balance');
      return;
    }
    // Business validation: recipient must be an Approved Retailer
    try {
      const info = await getUserInfo(destination);
      const role = info?.role;
      const status = info?.status;
      if (role !== 'Retailer' || status !== 'Approved') {
        setMessage('Recipient must be an approved retailer');
        return;
      }
    } catch (_err) {
      // In case of API error, surface a generic validation error
      setMessage('Recipient must be an approved retailer');
      return;
    }
    // Success flow
    setLoading(true);
    setMessage(null);
    // Ensure a pending status is visible for at least one paint without delaying the request call
    // setShowPending(true);
    // setTimeout(() => setShowPending(false), 10);
    try {
      await requestTransfer(tokenId, destination, amountNum);
      setMessage('Transfer requested');
      // Reset amount after success; keep destination
      setAmount('');
    } catch (error: any) {
      setMessage(error?.message || 'Transfer failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form data-testid="transfer-form" onSubmit={handleSubmit} noValidate className="mt-2 space-y-3">
      <div>
        <label htmlFor="destination" className="block text-sm font-medium text-gray-700 mb-1">
          Destination
        </label>
        {/** Inline syntactic validation helper for destination */}
        {/** Consider non-empty AND invalid as error state */}
        {/** This complements disabled submit and improves UX clarity */}
        {(() => {
          const destInvalid = destination !== '' && !isValidAddress(destination);
          return (
            <>
              <input
                id="destination"
                name="destination"
                value={destination}
                placeholder="0x1234…"
                disabled={loading}
                aria-invalid={destInvalid ? 'true' : undefined}
                aria-describedby={destInvalid ? 'destination-help' : undefined}
                onChange={(e) => {
                  setDestination(e.target.value);
                  if (message) setMessage(null);
                }}
                className="w-full text-gray-600 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {destInvalid && (
                <div id="destination-help" className="mt-1 text-xs text-red-600">
                  Enter a valid Ethereum address.
                </div>
              )}
            </>
          );
        })()}
      </div>
      <div>
        <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
          Amount
        </label>
        <input
          id="amount"
          name="amount"
          type="number"
          inputMode="numeric"
          min="1"
          max={balance}
          value={amount ?? ''}
          placeholder={`Max ${balance}`}
          disabled={loading}
          onChange={(e) => {
            setAmount(e.target.value ?? '');
            if (message) setMessage(null);
          }}
          className="w-full text-gray-600 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      {(loading || showPending) && <Alert kind="info">Requesting transfer</Alert>}
      {message && (
        <Alert
          kind={
            message === 'Transfer requested'
              ? 'success'
              : message === 'Requesting transfer'
                ? 'info'
                : 'error'
          }
        >
          {message}
        </Alert>
      )}
      <button
        type="submit"
        disabled={loading || !destination || !amount || !isValidAddress(destination)}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-60"
      >
        {loading ? 'Requesting…' : 'Request Transfer'}
      </button>
    </form>
  );
}
