import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PackageProducts from '../components/tokenOps/PackageProducts';

// Mock hooks and contract functions
vi.mock('../hooks/useWallet');
vi.mock('../lib/contract');

import { useWallet } from '../hooks/useWallet';
import { createToken, getTokenDetails, getUserTokensWithBalance } from '../lib/contract';

describe('PackageProducts Component', () => {
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
  });

  it('should display loading state while fetching tokens', async () => {
    // Mock getUserTokensWithBalance to return a promise that doesn't resolve immediately
    vi.mocked(getUserTokensWithBalance).mockReturnValue(new Promise(() => {}));

    render(<PackageProducts />);

    // Click to open the card
    await userEvent.setup().click(screen.getByText('Package Products'));

    // Should show loading state
    expect(screen.getByText(/loading tokens/i)).toBeInTheDocument();
  });

  it('should display message when no eligible tokens are available', async () => {
    // Mock getUserTokensWithBalance to return empty array
    vi.mocked(getUserTokensWithBalance).mockResolvedValue([]);

    render(<PackageProducts />);

    // Click to open the card
    await userEvent.setup().click(screen.getByText('Package Products'));

    // Should show no tokens message
    await waitFor(() => {
      expect(screen.getByText(/no processed tokens with balance available/i)).toBeInTheDocument();
    });
  });

  it('should display token selection when tokens are available', async () => {
    // Mock getUserTokensWithBalance to return token IDs
    vi.mocked(getUserTokensWithBalance).mockResolvedValue([1, 2]);

    // Mock getTokenDetails to return token details
    vi.mocked(getTokenDetails).mockImplementation((id) => {
      if (id === 1) {
        return Promise.resolve({
          id: 1,
          name: 'Processed Product 1',
          balance: 10,
          parentId: 5, // parentId > 0 for processed products
          features: '{}',
          totalSupply: 10,
          creator: '0x123',
          dateCreated: Date.now(),
        });
      }
      if (id === 2) {
        return Promise.resolve({
          id: 2,
          name: 'Processed Product 2',
          balance: 5,
          parentId: 6, // parentId > 0 for processed products
          features: '{}',
          totalSupply: 5,
          creator: '0x123',
          dateCreated: Date.now(),
        });
      }
      return Promise.resolve(null);
    });

    render(<PackageProducts />);

    // Click to open the card
    await userEvent.setup().click(screen.getByText('Package Products'));

    // Should show token selection
    await waitFor(() => {
      expect(screen.getByLabelText(/select token/i)).toBeInTheDocument();
      expect(screen.getByText(/processed product 1 \(balance: 10\)/i)).toBeInTheDocument();
      expect(screen.getByText(/processed product 2 \(balance: 5\)/i)).toBeInTheDocument();
    });
  });

  it('should display form validation errors', async () => {
    // Mock getUserTokensWithBalance to return token IDs
    vi.mocked(getUserTokensWithBalance).mockResolvedValue([1]);

    // Mock getTokenDetails to return token details
    vi.mocked(getTokenDetails).mockResolvedValue({
      id: 1,
      name: 'Processed Product 1',
      balance: 10,
      parentId: 5, // parentId > 0 for processed products
      features: '{}',
      totalSupply: 10,
      creator: '0x123',
      dateCreated: Date.now(),
    });

    const user = userEvent.setup();
    render(<PackageProducts />);

    // Click to open the card
    await user.click(screen.getByText('Package Products'));

    // Wait for form to appear
    await waitFor(() => {
      expect(screen.getByLabelText(/package name/i)).toBeInTheDocument();
    });

    // Try to submit without filling required fields
    await user.click(screen.getByRole('button', { name: /package/i }));

    // Should show validation error
    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    });

    // Fill name but not amount
    await user.type(screen.getByLabelText(/package name/i), 'Test Package');
    await user.click(screen.getByRole('button', { name: /package/i }));

    // Should show amount validation error
    await waitFor(() => {
      expect(screen.getByText(/amount must be greater than 0/i)).toBeInTheDocument();
    });

    // Fill amount with value greater than balance
    await user.clear(screen.getByLabelText(/amount/i));
    await user.type(screen.getByLabelText(/amount/i), '20');
    await user.click(screen.getByRole('button', { name: /package/i }));

    // Should show insufficient balance error
    await waitFor(() => {
      expect(screen.getByText(/insufficient balance/i)).toBeInTheDocument();
    });
  });

  it('should successfully create a package', async () => {
    // Mock getUserTokensWithBalance to return token IDs
    vi.mocked(getUserTokensWithBalance).mockResolvedValue([1]);

    // Mock getTokenDetails to return token details
    vi.mocked(getTokenDetails).mockResolvedValue({
      id: 1,
      name: 'Processed Product 1',
      balance: 10,
      parentId: 5, // parentId > 0 for processed products
      features: '{}',
      totalSupply: 10,
      creator: '0x123',
      dateCreated: Date.now(),
    });

    // Mock createToken to resolve successfully with delay
    vi.mocked(createToken).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(undefined), 100))
    );

    const user = userEvent.setup();
    render(<PackageProducts />);

    // Click to open the card
    await user.click(screen.getByText('Package Products'));

    // Wait for form to appear
    await waitFor(() => {
      expect(screen.getByLabelText(/package name/i)).toBeInTheDocument();
    });

    // Fill form with valid data
    await user.type(screen.getByLabelText(/package name/i), 'Retail Package');
    await user.type(screen.getByLabelText(/amount/i), '5');
    await user.type(screen.getByLabelText(/notes/i), 'Test notes');

    // Submit form
    await user.click(screen.getByRole('button', { name: /package/i }));

    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText(/packaging products/i)).toBeInTheDocument();
    });

    // Should call createToken with correct parameters
    await waitFor(() => {
      expect(createToken).toHaveBeenCalledWith({
        name: 'Retail Package',
        totalSupply: 5,
        features: JSON.stringify({
          type: 'packaged',
          fromTokenId: 1,
          notes: 'Test notes',
        }),
        parentId: 1,
      });
    });

    // Should show success message
    await waitFor(() => {
      expect(screen.getByText(/retail package created/i)).toBeInTheDocument();
    });
  });
});
