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
  getUserTokensWithAvailableBalance,
  getAvailableBalance,
  requestTransfer,
} from '../lib/contract';

describe('TransferToConsumer Component', () => {
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

  it('should display loading state while fetching tokens', async () => {
    // Mock getUserTokensWithAvailableBalance to return a promise that doesn't resolve immediately
    vi.mocked(getUserTokensWithAvailableBalance).mockReturnValue(new Promise(() => {}));

    render(<TransferToConsumer />);

    // Click to open the card
    await userEvent.setup().click(screen.getByText('Transfer to Consumer'));

    // Should show loading state
    expect(screen.getByText(/loading tokens…/i)).toBeInTheDocument();
  });

  it('should display message when no eligible tokens are available', async () => {
    // Mock getUserTokensWithAvailableBalance to return empty array
    vi.mocked(getUserTokensWithAvailableBalance).mockResolvedValue([]);

    render(<TransferToConsumer />);

    // Click to open the card
    await userEvent.setup().click(screen.getByText('Transfer to Consumer'));

    // Should show no tokens message
    await waitFor(() => {
      expect(screen.getByText(/no packaged tokens with balance available/i)).toBeInTheDocument();
    });
  });

  it('should display token selection when tokens are available', async () => {
    // Mock getUserTokensWithAvailableBalance to return token IDs
    vi.mocked(getUserTokensWithAvailableBalance).mockResolvedValue([1, 2]);

    // Mock getTokenDetails to return token details
    vi.mocked(getTokenDetails).mockImplementation((id) => {
      if (id === 1) {
        return Promise.resolve({
          id: 1,
          name: 'Packaged Product 1',
          balance: 10,
          parentId: 5, // parentId > 0 for packaged products
          features: '{}',
          totalSupply: 10,
          creator: '0x123',
          dateCreated: Date.now(),
        });
      }
      if (id === 2) {
        return Promise.resolve({
          id: 2,
          name: 'Packaged Product 2',
          balance: 5,
          parentId: 6, // parentId > 0 for packaged products
          features: '{}',
          totalSupply: 5,
          creator: '0x123',
          dateCreated: Date.now(),
        });
      }
      return Promise.resolve(null);
    });

    // Mock getAvailableBalance to return available balance for each token
    vi.mocked(getAvailableBalance).mockImplementation((tokenId) => {
      if (tokenId === 1) return Promise.resolve(10);
      if (tokenId === 2) return Promise.resolve(5);
      return Promise.resolve(0);
    });

    render(<TransferToConsumer />);

    // Click to open the card
    await userEvent.setup().click(screen.getByText('Transfer to Consumer'));

    // Should show token selection
    await waitFor(() => {
      expect(screen.getByLabelText(/select token/i)).toBeInTheDocument();
      expect(screen.getByText(/packaged product 1 \(balance: 10\)/i)).toBeInTheDocument();
      expect(screen.getByText(/packaged product 2 \(balance: 5\)/i)).toBeInTheDocument();
    });
  });

  it('should display form validation errors', async () => {
    // Mock getUserTokensWithAvailableBalance to return token IDs
    vi.mocked(getUserTokensWithAvailableBalance).mockResolvedValue([1]);

    // Mock getTokenDetails to return token details
    vi.mocked(getTokenDetails).mockResolvedValue({
      id: 1,
      name: 'Packaged Product 1',
      balance: 10,
      parentId: 5, // parentId > 0 for packaged products
      features: '{}',
      totalSupply: 10,
      creator: '0x123',
      dateCreated: Date.now(),
    });

    // Mock getAvailableBalance to return available balance
    vi.mocked(getAvailableBalance).mockResolvedValue(10);

    const user = userEvent.setup();
    render(<TransferToConsumer />);

    // Click to open the card
    await user.click(screen.getByText('Transfer to Consumer'));

    // Wait for form to appear
    await waitFor(() => {
      expect(screen.getByLabelText(/consumer address/i)).toBeInTheDocument();
    });

    // Try to submit with invalid address
    await user.type(screen.getByLabelText(/consumer address/i), 'invalid-address');
    await user.type(screen.getByLabelText(/amount/i), '5');
    await user.click(screen.getByRole('button', { name: /transfer/i }));

    // Should show invalid address error
    expect(screen.getByText(/invalid destination address/i)).toBeInTheDocument();

    // Clear and try with valid address but invalid amount
    await user.clear(screen.getByLabelText(/consumer address/i));
    await user.clear(screen.getByLabelText(/amount/i));
    await user.type(
      screen.getByLabelText(/consumer address/i),
      '0x1234567890123456789012345678901234567890'
    );
    await user.type(screen.getByLabelText(/amount/i), '20'); // More than balance
    await user.click(screen.getByRole('button', { name: /transfer/i }));

    // Should show insufficient balance error
    expect(screen.getByText(/insufficient balance/i)).toBeInTheDocument();
  });

  it('should successfully request a transfer', async () => {
    // Mock getUserTokensWithAvailableBalance to return token IDs
    vi.mocked(getUserTokensWithAvailableBalance).mockResolvedValue([1]);

    // Mock getTokenDetails to return token details
    vi.mocked(getTokenDetails).mockResolvedValue({
      id: 1,
      name: 'Packaged Product 1',
      balance: 10,
      parentId: 5, // parentId > 0 for packaged products
      features: '{}',
      totalSupply: 10,
      creator: '0x123',
      dateCreated: Date.now(),
    });

    // Mock getAvailableBalance to return available balance
    vi.mocked(getAvailableBalance).mockResolvedValue(10);

    // Mock requestTransfer with delay to test loading state
    vi.mocked(requestTransfer).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(undefined), 100))
    );

    const user = userEvent.setup();
    render(<TransferToConsumer />);

    // Click to open the card
    await user.click(screen.getByText('Transfer to Consumer'));

    // Wait for form to appear
    await waitFor(() => {
      expect(screen.getByLabelText(/consumer address/i)).toBeInTheDocument();
    });

    // Fill form with valid data
    const consumerAddress = '0x1234567890123456789012345678901234567890';
    await user.type(screen.getByLabelText(/consumer address/i), consumerAddress);
    await user.type(screen.getByLabelText(/amount/i), '5');

    // Submit form
    await user.click(screen.getByRole('button', { name: /transfer/i }));

    // Should show requesting state
    expect(screen.getByText(/requesting transfer/i)).toBeInTheDocument();

    // Should call requestTransfer with correct parameters
    await waitFor(() => {
      expect(requestTransfer).toHaveBeenCalledWith(1, consumerAddress, 5);
    });

    // Simulate transfer event will be handled by the component's success logic

    // Should show success message
    await waitFor(() => {
      expect(screen.getByText(/transfer requested successfully/i)).toBeInTheDocument();
    });
  });
});
