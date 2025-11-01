import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TransferForm } from '../components/tokenOps/TransferToFactory';
import * as contract from '../lib/contract';

// Mocks
vi.mock('../lib/contract', () => ({
  getUserInfo: vi.fn(),
  requestTransfer: vi.fn(),
}));
vi.mock('../hooks/useWallet', () => ({
  useWallet: () => ({ address: '0xproducer' }),
}));

// Mock ethers BrowserProvider to avoid real provider checks
vi.mock('ethers', () => ({
  ethers: {
    BrowserProvider: class {
      constructor(_arg: any) {}
    },
  },
}));

// Mock SupplyChain__factory to capture TransferRequested listener
vi.mock('../types/factories/SupplyChain__factory', () => {
  let savedHandler: ((...args: any[]) => Promise<void> | void) | null = null;
  const contract = {
    filters: { TransferRequested: () => 'TransferRequested' },
    on: (_filter: any, handler: any) => {
      savedHandler = handler;
    },
    off: (_filter: any, handler: any) => {
      if (savedHandler === handler) savedHandler = null;
    },
    removeAllListeners: () => {
      savedHandler = null;
    },
  };
  return {
    SupplyChain__factory: {
      connect: vi.fn(() => contract),
    },
    __mock: {
      getListener: () => savedHandler,
      contract,
    },
  };
});

// @ts-expect-error test-only mock export provided via vi.mock above
import { __mock as factoryMock } from '../types/factories/SupplyChain__factory';

describe('TransferForm', () => {
  it('renders form and validates basic fields', () => {
    render(<TransferForm tokenId={1} parentId={0} balance={100} />);
    expect(screen.getByLabelText(/destination/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /request transfer/i })).toBeDisabled();
  });

  it('blocks transfer of derived tokens (parentId > 0)', () => {
    render(<TransferForm tokenId={2} parentId={2} balance={100} />);
    expect(
      screen.getByText(/derived tokens cannot be transferred by producer/i)
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /request transfer/i })).not.toBeInTheDocument();
  });

  it('requires Factory approved recipient', async () => {
    (contract as any).getUserInfo.mockResolvedValue({ role: 'Retailer', status: 'Approved' });
    render(<TransferForm tokenId={1} parentId={0} balance={100} />);
    const user = userEvent.setup();
    await user.type(
      screen.getByLabelText(/destination/i),
      '0x1111111111111111111111111111111111111111'
    );
    await user.type(screen.getByLabelText(/amount/i), '10');
    await user.click(screen.getByRole('button', { name: /request transfer/i }));
    expect(await screen.findByText(/recipient must be an approved factory/i)).toBeInTheDocument();
  });

  it('requires amount > 0 and <= balance', async () => {
    render(<TransferForm tokenId={1} parentId={0} balance={100} />);
    const user = userEvent.setup();
    await user.type(
      screen.getByLabelText(/destination/i),
      '0x1111111111111111111111111111111111111111'
    );
    await user.type(screen.getByLabelText(/amount/i), '0');
    await user.click(screen.getByRole('button', { name: /request transfer/i }));
    expect(await screen.findByText(/amount must be greater than 0/i)).toBeInTheDocument();

    // Clear and type a higher value
    const amountInput = screen.getByLabelText(/amount/i);
    // userEvent.clear ensures realistic clearing
    await user.clear(amountInput);
    await user.type(amountInput, '101');
    await user.click(screen.getByRole('button', { name: /request transfer/i }));
    expect(await screen.findByText(/insufficient balance/i)).toBeInTheDocument();
  });

  it('calls requestTransfer on valid input and shows success', async () => {
    (contract as any).getUserInfo.mockResolvedValue({ role: 'Factory', status: 'Approved' });
    let resolveRequest!: () => void;
    (contract as any).requestTransfer.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveRequest = resolve;
        })
    );
    render(<TransferForm tokenId={1} parentId={0} balance={100} />);
    const user = userEvent.setup();
    await user.type(
      screen.getByLabelText(/destination/i),
      '0x1111111111111111111111111111111111111111'
    );
    await user.type(screen.getByLabelText(/amount/i), '10');
    await user.click(screen.getByRole('button', { name: /request transfer/i }));
    expect(await screen.findByText(/requesting transfer/i)).toBeInTheDocument();
    // Now resolve the request and expect success
    resolveRequest();
    await waitFor(() => expect(screen.getByText(/transfer requested/i)).toBeInTheDocument());
  });

  it('surfaces contract errors', async () => {
    (contract as any).getUserInfo.mockResolvedValue({ role: 'Factory', status: 'Approved' });
    (contract as any).requestTransfer.mockRejectedValue(new Error('Insufficient balance'));
    render(<TransferForm tokenId={1} parentId={0} balance={100} />);
    const user = userEvent.setup();
    await user.type(
      screen.getByLabelText(/destination/i),
      '0x1111111111111111111111111111111111111111'
    );
    await user.type(screen.getByLabelText(/amount/i), '10');
    await user.click(screen.getByRole('button', { name: /request transfer/i }));
    expect(await screen.findByText(/insufficient balance/i)).toBeInTheDocument();
  });

  it('disables inputs and button while requesting and shows Requesting… label', async () => {
    (contract as any).getUserInfo.mockResolvedValue({ role: 'Factory', status: 'Approved' });
    let resolveRequest: () => void;
    (contract as any).requestTransfer.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveRequest = resolve;
        })
    );

    render(<TransferForm tokenId={1} parentId={0} balance={100} />);
    const user = userEvent.setup();
    const destInput = screen.getByLabelText(/destination/i) as HTMLInputElement;
    const amountInput = screen.getByLabelText(/amount/i) as HTMLInputElement;
    const submitBtn = screen.getByRole('button', { name: /request transfer/i });

    await user.type(destInput, '0x1111111111111111111111111111111111111111');
    await user.type(amountInput, '10');
    await user.click(submitBtn);

    // In-flight: disabled controls and updated label
    expect(destInput).toBeDisabled();
    expect(amountInput).toBeDisabled();
    expect(screen.getByRole('button', { name: /requesting…/i })).toBeDisabled();
    expect(await screen.findByText(/requesting transfer/i)).toBeInTheDocument();

    // Resolve and verify back to normal
    resolveRequest!();
    await waitFor(() => expect(screen.getByText(/transfer requested/i)).toBeInTheDocument());
    expect(destInput).not.toBeDisabled();
    expect(amountInput).not.toBeDisabled();
    // After success the amount is reset, so the button stays disabled until user fills it again
    expect(screen.getByRole('button', { name: /request transfer/i })).toBeDisabled();
  });

  it('clears message when user edits inputs after an error', async () => {
    render(<TransferForm tokenId={1} parentId={0} balance={100} />);
    const user = userEvent.setup();
    await user.type(
      screen.getByLabelText(/destination/i),
      '0x1111111111111111111111111111111111111111'
    );
    await user.type(screen.getByLabelText(/amount/i), '101');
    await user.click(screen.getByRole('button', { name: /request transfer/i }));
    expect(await screen.findByText(/insufficient balance/i)).toBeInTheDocument();

    // Edit amount to clear the message
    const amountInput2 = screen.getByLabelText(/amount/i);
    await user.clear(amountInput2);
    await user.type(amountInput2, '50');

    await waitFor(() =>
      expect(screen.queryByText(/insufficient balance/i)).not.toBeInTheDocument()
    );
  });

  it('shows inline helper for invalid destination and clears when valid', async () => {
    render(<TransferForm tokenId={1} parentId={0} balance={100} />);
    const user = userEvent.setup();

    const destInput = screen.getByLabelText(/destination/i);
    await user.type(destInput, '0x123');

    // Helper appears and submit stays disabled
    expect(await screen.findByText(/enter a valid ethereum address/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /request transfer/i })).toBeDisabled();

    // Accessibility attributes reflect invalid state
    expect(destInput).toHaveAttribute('aria-invalid', 'true');
    const describedBy = destInput.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    if (describedBy) {
      expect(document.getElementById(describedBy)).toBeTruthy();
    }

    // Fix the address -> helper disappears and aria-invalid removed
    await user.clear(destInput);
    await user.type(destInput, '0x1111111111111111111111111111111111111111');
    await waitFor(() =>
      expect(screen.queryByText(/enter a valid ethereum address/i)).not.toBeInTheDocument()
    );
    expect(destInput).not.toHaveAttribute('aria-invalid', 'true');
  });

  it('clears form and hides success message after TransferRequested is observed', async () => {
    // Arrange
    (contract as any).getUserInfo.mockResolvedValue({ role: 'Factory', status: 'Approved' });
    (contract as any).requestTransfer.mockResolvedValue(undefined);
    (window as any).ethereum = {};

    render(<TransferForm tokenId={1} parentId={0} balance={100} />);
    const user = userEvent.setup();

    const destInput = screen.getByLabelText(/destination/i) as HTMLInputElement;
    const amountInput = screen.getByLabelText(/amount/i) as HTMLInputElement;
    await user.type(destInput, '0x1111111111111111111111111111111111111111');
    await user.type(amountInput, '10');
    await user.click(screen.getByRole('button', { name: /request transfer/i }));

    // Success message appears
    await waitFor(() => expect(screen.getByText(/transfer requested/i)).toBeInTheDocument());

    // Act: emit TransferRequested(from=this user)
    const listener = factoryMock.getListener();
    expect(listener).toBeTruthy();
    await act(async () => {
      await listener!({
        args: [1n, '0xproducer', '0x1111111111111111111111111111111111111111', 1n, 10n],
      });
    });

    // Assert: form inputs cleared and message hidden
    await waitFor(() => {
      expect(destInput.value).toBe('');
      expect(amountInput.value).toBe('');
      expect(screen.queryByText(/transfer requested/i)).not.toBeInTheDocument();
    });
  });
});
