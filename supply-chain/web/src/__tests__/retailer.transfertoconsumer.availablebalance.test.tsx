import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TransferToConsumer from '../components/tokenOps/TransferToConsumer';

// Mock hooks and contract functions
vi.mock('../hooks/useWallet');
vi.mock('../hooks/useContractEvent');
vi.mock('../lib/contract');
vi.mock('../lib/utils', () => ({
  isValidAddress: (address: string) => address.startsWith('0x') && address.length === 42,
}));

import { useWallet } from '../hooks/useWallet';
import { useContractEvent } from '../hooks/useContractEvent';
import {
  getTokenDetails,
  getUserTokensWithBalance,
  requestTransfer,
  // These functions don't exist yet - will cause RED state
  getAvailableBalance,
  getUserTokensWithAvailableBalance,
} from '../lib/contract';

describe('TransferToConsumer - Available Balance Integration (RED Tests)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useWallet).mockReturnValue({
      address: '0x123',
      isConnected: true,
      chainId: 31337,
      networkName: 'anvil',
      connect: vi.fn(),
      getBalance: vi.fn(),
      switchNetwork: vi.fn(),
      getCurrentNetwork: vi.fn(),
    });
    vi.mocked(useContractEvent).mockImplementation(() => ({ removeListener: vi.fn() }));
  });

  it('should use getUserTokensWithAvailableBalance instead of getUserTokensWithBalance', async () => {
    // RED Test: This will FAIL because getUserTokensWithAvailableBalance doesn't exist
    // Expected behavior: Component should use available balance for filtering tokens

    vi.mocked(getUserTokensWithAvailableBalance).mockResolvedValue([3]); // Token 3 has available balance
    vi.mocked(getTokenDetails).mockResolvedValue({
      id: 3,
      name: 'pack de leche de soja',
      balance: 6, // Total balance
      parentId: 2,
      creator: '0x123',
      totalSupply: 10,
      features: '{"type": "packaged"}',
      dateCreated: Date.now(),
    });

    render(<TransferToConsumer />);
    await userEvent.setup().click(screen.getByText('Transfer to Consumer'));

    // This will fail because getUserTokensWithAvailableBalance is not implemented
    await waitFor(() => {
      expect(getUserTokensWithAvailableBalance).toHaveBeenCalledWith('0x123');
    });
  });

  it('should display available balance in token dropdown, not total balance', async () => {
    // RED Test: This will FAIL because getAvailableBalance doesn't exist
    // Expected behavior: Show "pack de leche de soja (Balance: 5)" instead of "(Balance: 6)"

    vi.mocked(getUserTokensWithBalance).mockResolvedValue([3]);
    vi.mocked(getTokenDetails).mockResolvedValue({
      id: 3,
      name: 'pack de leche de soja',
      balance: 6, // Total balance
      parentId: 2,
      creator: '0x123',
      totalSupply: 10,
      features: '{"type": "packaged"}',
      dateCreated: Date.now(),
    });
    vi.mocked(getAvailableBalance).mockResolvedValue(5); // Available balance = 6 - 1 pending

    render(<TransferToConsumer />);
    await userEvent.setup().click(screen.getByText('Transfer to Consumer'));

    // This will fail because component doesn't use getAvailableBalance yet
    await waitFor(() => {
      expect(screen.getByText(/pack de leche de soja \(Balance: 5\)/i)).toBeInTheDocument();
    });
  });

  it('should show form when tokens have available balance despite pending transfers', async () => {
    // RED Test: This will FAIL because component uses total balance, not available balance
    // Expected behavior: Show form when available balance > 0, even if there are pending transfers

    vi.mocked(getUserTokensWithBalance).mockResolvedValue([3]);
    vi.mocked(getTokenDetails).mockResolvedValue({
      id: 3,
      name: 'pack de leche de soja',
      balance: 6, // Total balance
      parentId: 2,
      creator: '0x123',
      totalSupply: 10,
      features: '{"type": "packaged"}',
      dateCreated: Date.now(),
    });
    // Mock scenario: 6 total balance, 1 pending = 5 available
    vi.mocked(getAvailableBalance).mockResolvedValue(5);

    render(<TransferToConsumer />);
    await userEvent.setup().click(screen.getByText('Transfer to Consumer'));

    // This should show form since available balance > 0
    // But will fail because component doesn't check available balance yet
    await waitFor(() => {
      expect(screen.getByLabelText(/select token/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/consumer address/i)).toBeInTheDocument();
      expect(
        screen.queryByText(/no packaged tokens with balance available/i)
      ).not.toBeInTheDocument();
    });
  });

  it('should show no tokens message when all balance is locked in pending transfers', async () => {
    // RED Test: This will FAIL because component doesn't check available balance
    // Expected behavior: Show "no tokens" when available balance = 0 (all locked in pending)

    vi.mocked(getUserTokensWithBalance).mockResolvedValue([3]);
    vi.mocked(getTokenDetails).mockResolvedValue({
      id: 3,
      name: 'pack de leche de soja',
      balance: 6, // Total balance
      parentId: 2,
      creator: '0x123',
      totalSupply: 10,
      features: '{"type": "packaged"}',
      dateCreated: Date.now(),
    });
    // Mock scenario: 6 total balance, 6 pending = 0 available
    vi.mocked(getAvailableBalance).mockResolvedValue(0);

    render(<TransferToConsumer />);
    await userEvent.setup().click(screen.getByText('Transfer to Consumer'));

    // Should show "no tokens" message when available balance = 0
    // But will fail because component checks total balance (6 > 0)
    await waitFor(() => {
      expect(screen.getByText(/no packaged tokens with balance available/i)).toBeInTheDocument();
      expect(screen.queryByLabelText(/select token/i)).not.toBeInTheDocument();
    });
  });

  it('should validate transfer amount against available balance, not total balance', async () => {
    // RED Test: This will FAIL because component validates against total balance
    // Expected behavior: Reject transfer of 6 when available balance is 5

    vi.mocked(getUserTokensWithBalance).mockResolvedValue([3]);
    vi.mocked(getTokenDetails).mockResolvedValue({
      id: 3,
      name: 'pack de leche de soja',
      balance: 6, // Total balance
      parentId: 2,
      creator: '0x123',
      totalSupply: 10,
      features: '{"type": "packaged"}',
      dateCreated: Date.now(),
    });
    vi.mocked(getAvailableBalance).mockResolvedValue(5); // Available balance
    vi.mocked(requestTransfer).mockResolvedValue(undefined);

    const user = userEvent.setup();
    render(<TransferToConsumer />);

    await user.click(screen.getByText('Transfer to Consumer'));
    await waitFor(() => expect(screen.getByLabelText(/consumer address/i)).toBeInTheDocument());

    // Fill form with amount that exceeds available balance (5) but is within total balance (6)
    await user.type(
      screen.getByLabelText(/consumer address/i),
      '0x1234567890123456789012345678901234567890'
    );
    await user.type(screen.getByLabelText(/amount/i), '6');

    await user.click(screen.getByRole('button', { name: /transfer/i }));

    // Should show error because 6 > available balance (5)
    // But will pass validation because 6 <= total balance (6)
    // This test will FAIL until we implement available balance validation
    expect(screen.getByText(/insufficient balance/i)).toBeInTheDocument();
    expect(requestTransfer).not.toHaveBeenCalled();
  });

  it('should allow transfer when amount is within available balance', async () => {
    // RED Test: This confirms expected behavior for valid transfers

    vi.mocked(getUserTokensWithBalance).mockResolvedValue([3]);
    vi.mocked(getTokenDetails).mockResolvedValue({
      id: 3,
      name: 'pack de leche de soja',
      balance: 6, // Total balance
      parentId: 2,
      creator: '0x123',
      totalSupply: 10,
      features: '{"type": "packaged"}',
      dateCreated: Date.now(),
    });
    vi.mocked(getAvailableBalance).mockResolvedValue(5); // Available balance
    vi.mocked(requestTransfer).mockResolvedValue(undefined);

    const user = userEvent.setup();
    render(<TransferToConsumer />);

    await user.click(screen.getByText('Transfer to Consumer'));
    await waitFor(() => expect(screen.getByLabelText(/consumer address/i)).toBeInTheDocument());

    // Fill form with amount within available balance
    await user.type(
      screen.getByLabelText(/consumer address/i),
      '0x1234567890123456789012345678901234567890'
    );
    await user.type(screen.getByLabelText(/amount/i), '5');

    await user.click(screen.getByRole('button', { name: /transfer/i }));

    // Should succeed because 5 <= available balance (5)
    await waitFor(() => {
      expect(requestTransfer).toHaveBeenCalledWith(
        3,
        '0x1234567890123456789012345678901234567890',
        5
      );
    });
  });

  describe('Address Case Sensitivity Bug Prevention', () => {
    it('should handle case-insensitive address comparison in filtering', async () => {
      // ARRANGE: Set up the critical case sensitivity scenario that caused the original bug
      const checksumAddress = '0x90F79bf6EB2c4f870365E785982E1f101E93b906'; // Checksum case (from contract)
      const lowercaseAddress = '0x90f79bf6eb2c4f870365e785982e1f101e93b906'; // Lowercase (from MetaMask)

      // Mock useWallet to return lowercase address (as comes from MetaMask)
      vi.mocked(useWallet).mockReturnValue({
        address: lowercaseAddress,
        isConnected: true,
        chainId: 31337,
        networkName: 'anvil',
        connect: vi.fn(),
        getBalance: vi.fn(),
        switchNetwork: vi.fn(),
        getCurrentNetwork: vi.fn(),
      });

      // Mock: Token created by checksum address (as stored in blockchain)
      vi.mocked(getUserTokensWithAvailableBalance).mockResolvedValue([3]);
      vi.mocked(getTokenDetails).mockResolvedValue({
        id: 3,
        creator: checksumAddress, // This comes from contract in checksum format
        name: 'pack de leche de soja',
        totalSupply: 6,
        features: '{"type":"packaged","fromTokenId":2,"notes":""}',
        parentId: 2,
        dateCreated: Date.now(),
        balance: 6,
      });
      vi.mocked(getAvailableBalance).mockResolvedValue(5);

      const user = userEvent.setup();

      // ACT: Render component
      render(<TransferToConsumer />);

      // Open the component
      const openButton = screen.getByText(/transfer to consumer/i);
      await user.click(openButton);

      // Wait for async loading
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // ASSERT: Should show the token despite case difference
      // This test prevents the regression where t.creator === address fails due to case mismatch
      expect(screen.getByText(/pack de leche de soja/i)).toBeInTheDocument();
      expect(
        screen.queryByText(/no packaged tokens with balance available/i)
      ).not.toBeInTheDocument();

      // Should show available balance (5), not total balance (6)
      expect(screen.getByText(/balance:\s*5/i)).toBeInTheDocument();

      // Form should be enabled
      expect(screen.getByLabelText(/consumer address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
    });
  });
});
