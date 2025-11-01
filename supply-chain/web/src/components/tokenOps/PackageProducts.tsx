import { useState } from 'react';
import { useWallet } from '../../hooks/useWallet';
import type { TokenDetails } from '../../lib/contract';
import { createToken, getTokenDetails, getUserTokensWithBalance } from '../../lib/contract';
import ActionCard from '../ui/ActionCard';
import Alert from '../ui/Alert';

export default function PackageProducts() {
  const { address } = useWallet();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [eligible, setEligible] = useState<TokenDetails[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  /**
   * Stub: Componente PackageProducts
   * Estado: MVP incompleto
   * Requisitos:
   *   - Permitir a Factory empaquetar productos derivados para Retailer
   *   - Validar que solo tokens derivados pueden ser empaquetados
   *   - Mostrar formulario con selección de tokens y cantidad
   *   - Deshabilitar botón si campos inválidos
   *   - Emitir evento de empaquetado y actualizar balances
   *   - Mostrar mensajes de éxito/error en el DOM
   * Notas:
   *   - Falta lógica de integración con contract.ts
   *   - Falta test de cobertura y validación de accesibilidad
   */

  async function loadTokens() {
    if (!address) return;
    setLoading(true);
    try {
      const ids = await getUserTokensWithBalance(address);
      const details = await Promise.all(ids.map((id) => getTokenDetails(id, address)));
      // Retailer can package processed products received from Factory (parentId > 0)
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
    void loadTokens();
  };

  return (
    <ActionCard
      title="Package Products"
      description="Create retail packages from received products"
      icon="📦"
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
                      {t.name} (Balance: {t.balance})
                    </option>
                  ))}
                </select>
              </div>
              {selectedId !== null &&
                (() => {
                  const token = eligible.find((t) => t.id === selectedId);
                  return token ? <PackageForm tokenId={token.id} balance={token.balance} /> : null;
                })()}
            </>
          )}
        </div>
      )}
    </ActionCard>
  );
}

type PackageFormProps = {
  tokenId: number;
  balance: number;
};

function PackageForm({ tokenId, balance }: PackageFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    notes: '',
  });
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = Number(formData.amount);

    // Validation
    if (!formData.name) {
      setMessage('Name is required');
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
    setMessage('Packaging products...');
    try {
      await createToken({
        name: formData.name,
        totalSupply: amountNum,
        features: JSON.stringify({
          type: 'packaged',
          fromTokenId: tokenId,
          notes: formData.notes,
        }),
        parentId: tokenId,
      });
      setMessage('Retail package created');
      // Reset form after success
      setTimeout(() => {
        setMessage(null);
        setFormData({ name: '', amount: '', notes: '' });
      }, 2000);
    } catch (error) {
      console.error('Error packaging products:', error);
      setMessage(error instanceof Error ? error.message : 'Packaging failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3" noValidate>
      <div>
        <label htmlFor="package-name" className="block text-sm font-medium text-gray-700 mb-1">
          Package Name
        </label>
        <input
          id="package-name"
          type="text"
          value={formData.name}
          disabled={loading}
          aria-invalid={!!message && !formData.name}
          onChange={(e) => {
            setFormData({ ...formData, name: e.target.value });
            if (message) setMessage(null);
          }}
          className="w-full text-gray-600 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., Retail Box"
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
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
          Notes (optional)
        </label>
        <textarea
          id="notes"
          value={formData.notes}
          disabled={loading}
          onChange={(e) => {
            setFormData({ ...formData, notes: e.target.value });
            if (message) setMessage(null);
          }}
          rows={2}
          className="w-full text-gray-600 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., Premium packaging"
        />
      </div>
      {message && (
        <Alert
          kind={
            message === 'Retail package created'
              ? 'success'
              : message === 'Packaging products...'
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
        {loading ? 'Packaging…' : 'Package'}
      </button>
    </form>
  );
}
