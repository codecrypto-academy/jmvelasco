import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { RoleActions } from '../components/tokenOps/RoleActions';
import { UserRole } from '../lib/enums';
import { buildToken } from './utils/builders';

// Mock the contract module
vi.mock('../lib/contract', () => ({
  createToken: vi.fn(),
  getUserTokens: vi.fn(),
  getUserTokensWithBalance: vi.fn(),
  getTokenDetails: vi.fn(),
  getUserInfo: vi.fn(),
  requestTransfer: vi.fn(),
}));

// Mock wallet hook to avoid requiring Web3Provider in component tests
vi.mock('../hooks/useWallet', () => ({
  useWallet: () => ({ address: '0xTEST', isConnected: true }),
}));

import * as contractModule from '../lib/contract';
import { createToken } from '../lib/contract';

describe('Factory RoleActions - Process Materials', () => {
  describe('Process Materials Action', () => {
    test('shows empty state when no eligible tokens', async () => {
      vi.mocked(contractModule.getUserTokensWithBalance as any).mockResolvedValue([]);
      render(<RoleActions role={UserRole.Factory} />);
      const card = screen.getByRole('button', { name: /process materials/i });
      await userEvent.click(card);
      expect(await screen.findByText(/no raw tokens with balance available/i)).toBeInTheDocument();
    });

    test('shows eligible tokens and preselects first', async () => {
      vi.mocked(contractModule.getUserTokensWithBalance as any).mockResolvedValue([1, 2]);
      vi.mocked(contractModule.getTokenDetails as any).mockImplementation(async (id: number) => {
        return buildToken({ id, name: `Token ${id}`, parentId: 0, balance: 100 });
      });
      render(<RoleActions role={UserRole.Factory} />);
      const card = screen.getByRole('button', { name: /process materials/i });
      await userEvent.click(card);
      const select = await screen.findByLabelText(/select token/i);
      expect(select).toBeInTheDocument();
      const options = screen.getAllByRole('option');
      expect(options.length).toBe(2);
      expect(options[0]).toHaveTextContent(/Token 1/i);
    });

    test('disables submit for invalid fields', async () => {
      vi.mocked(contractModule.getUserTokensWithBalance as any).mockResolvedValue([1]);
      vi.mocked(contractModule.getTokenDetails as any).mockResolvedValue(
        buildToken({ id: 1, name: 'Token 1', parentId: 0, balance: 100 })
      );
      render(<RoleActions role={UserRole.Factory} />);
      const card = screen.getByRole('button', { name: /process materials/i });
      await userEvent.click(card);
      const submitBtn = await screen.findByRole('button', { name: /^process$/i });
      expect(submitBtn).toBeDisabled();
    });

    test('handles boundary max values', async () => {
      vi.mocked(contractModule.getUserTokensWithBalance as any).mockResolvedValue([1]);
      vi.mocked(contractModule.getTokenDetails as any).mockResolvedValue(
        buildToken({ id: 1, name: 'Token 1', parentId: 0, balance: 100 })
      );
      render(<RoleActions role={UserRole.Factory} />);
      const card = screen.getByRole('button', { name: /process materials/i });
      await userEvent.click(card);
      const amountInput = await screen.findByLabelText(/amount/i);
      await userEvent.type(amountInput, '100');
      expect(amountInput).toHaveValue(100);
    });

    test('submits createToken payload', async () => {
      vi.mocked(contractModule.getUserTokensWithBalance as any).mockResolvedValue([1]);
      vi.mocked(contractModule.getTokenDetails as any).mockResolvedValue(
        buildToken({ id: 1, name: 'Token 1', parentId: 0, balance: 100 })
      );
      vi.mocked(createToken).mockResolvedValue(undefined);
      render(<RoleActions role={UserRole.Factory} />);
      const card = screen.getByRole('button', { name: /process materials/i });
      await userEvent.click(card);
      const nameInput = await screen.findByLabelText(/product name/i);
      const amountInput = screen.getByLabelText(/amount/i);
      await userEvent.type(nameInput, 'Flour');
      await userEvent.type(amountInput, '50');
      const submitBtn = screen.getByRole('button', { name: /^process$/i });
      await userEvent.click(submitBtn);
      expect(createToken).toHaveBeenCalledWith(
        expect.objectContaining({ parentId: 1, totalSupply: 50, name: 'Flour' })
      );
    });

    test('surfaces on-chain errors', async () => {
      vi.mocked(contractModule.getUserTokensWithBalance as any).mockResolvedValue([1]);
      vi.mocked(contractModule.getTokenDetails as any).mockResolvedValue(
        buildToken({ id: 1, name: 'Token 1', parentId: 0, balance: 100 })
      );
      vi.mocked(createToken).mockRejectedValue(new Error('On-chain error'));
      render(<RoleActions role={UserRole.Factory} />);
      const card = screen.getByRole('button', { name: /process materials/i });
      await userEvent.click(card);
      const nameInput = await screen.findByLabelText(/product name/i);
      const amountInput = screen.getByLabelText(/amount/i);
      await userEvent.type(nameInput, 'Flour');
      await userEvent.type(amountInput, '50');
      const submitBtn = screen.getByRole('button', { name: /^process$/i });
      await userEvent.click(submitBtn);
      expect(await screen.findByText(/on-chain error/i)).toBeInTheDocument();
    });

    test('clears messages on edit', async () => {
      vi.mocked(contractModule.getUserTokensWithBalance as any).mockResolvedValue([1]);
      vi.mocked(contractModule.getTokenDetails as any).mockResolvedValue(
        buildToken({ id: 1, name: 'Token 1', parentId: 0, balance: 100 })
      );
      vi.mocked(createToken).mockRejectedValue(new Error('On-chain error'));
      render(<RoleActions role={UserRole.Factory} />);
      const card = screen.getByRole('button', { name: /process materials/i });
      await userEvent.click(card);
      const nameInput = await screen.findByLabelText(/product name/i);
      const amountInput = screen.getByLabelText(/amount/i);
      await userEvent.type(nameInput, 'Flour');
      await userEvent.type(amountInput, '50');
      const submitBtn = screen.getByRole('button', { name: /^process$/i });
      await userEvent.click(submitBtn);
      expect(await screen.findByText(/on-chain error/i)).toBeInTheDocument();
      await userEvent.clear(amountInput);
      expect(screen.queryByText(/on-chain error/i)).toBeNull();
    });

    test('disables submit during submission', async () => {
      vi.mocked(contractModule.getUserTokensWithBalance as any).mockResolvedValue([1]);
      vi.mocked(contractModule.getTokenDetails as any).mockResolvedValue(
        buildToken({ id: 1, name: 'Token 1', parentId: 0, balance: 100 })
      );
      vi.mocked(createToken).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 500))
      );
      render(<RoleActions role={UserRole.Factory} />);
      const card = screen.getByRole('button', { name: /process materials/i });
      await userEvent.click(card);
      const nameInput = await screen.findByLabelText(/product name/i);
      const amountInput = screen.getByLabelText(/amount/i);
      await userEvent.type(nameInput, 'Flour');
      await userEvent.type(amountInput, '50');
      const submitBtn = screen.getByRole('button', { name: /^process$/i });
      await userEvent.click(submitBtn);
      expect(submitBtn).toBeDisabled();
    });
  });
});
