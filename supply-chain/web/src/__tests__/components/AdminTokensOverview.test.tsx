import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AdminTokensOverview } from '../../components/admin/AdminTokensOverview';
import type { AdminTokenRow } from '../../hooks/useAdminSupplyChain';
import { UserRole } from '../../lib/enums';

describe('AdminTokensOverview', () => {
  const mockTokenRows: AdminTokenRow[] = [
    {
      userAddress: '0x1234567890123456789012345678901234567890',
      userRole: UserRole.Producer,
      tokenId: 1,
      tokenName: 'Raw Material A',
      currentBalance: 1000,
      notes: 'Original: 1500, transferidos: 500',
    },
    {
      userAddress: '0x9876543210987654321098765432109876543210',
      userRole: UserRole.Factory,
      tokenId: 2,
      tokenName: 'Processed Product B',
      currentBalance: 750,
      notes: 'Recibidos del Producer',
    },
  ];

  it('should render loading state', () => {
    render(<AdminTokensOverview tokenRows={[]} isLoading={true} error={null} />);

    expect(screen.getByText('Cargando datos de blockchain...')).toBeInTheDocument();
  });

  it('should render error state', () => {
    const errorMessage = 'Contract connection failed';
    render(<AdminTokensOverview tokenRows={[]} isLoading={false} error={errorMessage} />);

    expect(screen.getByText('Error en Status de Tokens por Usuario')).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('should render empty state', () => {
    render(<AdminTokensOverview tokenRows={[]} isLoading={false} error={null} />);

    expect(screen.getByText('No hay tokens activos en el sistema')).toBeInTheDocument();
  });

  it('should render token rows correctly', () => {
    render(<AdminTokensOverview tokenRows={mockTokenRows} isLoading={false} error={null} />);

    // Check header
    expect(screen.getByText('Status de Tokens por Usuario')).toBeInTheDocument();

    // Check table headers
    expect(screen.getByText('Usuario')).toBeInTheDocument();
    expect(screen.getByText('Rol')).toBeInTheDocument();
    expect(screen.getByText('Token ID')).toBeInTheDocument();
    expect(screen.getByText('Nombre Token')).toBeInTheDocument();
    expect(screen.getByText('Balance Actual')).toBeInTheDocument();
    expect(screen.getByText('Notas')).toBeInTheDocument();

    // Check data rows
    expect(screen.getByText('0x1234...7890')).toBeInTheDocument();
    expect(screen.getByText('Producer')).toBeInTheDocument();
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('Raw Material A')).toBeInTheDocument();
    expect(screen.getByText((content) => /1[.,\s]?000/.test(content))).toBeInTheDocument();
    // Check parsed notes as individual cards
    expect(screen.getByText('Original:')).toBeInTheDocument();
    // There should be only one element with '1500' (Original)
    expect(screen.getAllByText('1500')).toHaveLength(1);
    expect(screen.getByText('transferidos:')).toBeInTheDocument();
    // There should be only one element with '500' (transferidos)
    expect(screen.getAllByText('500')).toHaveLength(1);

    expect(screen.getByText('0x9876...3210')).toBeInTheDocument();
    expect(screen.getByText('Factory')).toBeInTheDocument();
    expect(screen.getByText('#2')).toBeInTheDocument();
    expect(screen.getByText('Processed Product B')).toBeInTheDocument();
    expect(screen.getByText('750')).toBeInTheDocument();
    expect(screen.getByText('Recibidos del Producer')).toBeInTheDocument();
  });

  it('should display total count', () => {
    render(<AdminTokensOverview tokenRows={mockTokenRows} isLoading={false} error={null} />);

    expect(screen.getByText(/Total:/)).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText(/entradas de tokens activos/)).toBeInTheDocument();
  });

  it('should apply correct role colors', () => {
    render(<AdminTokensOverview tokenRows={mockTokenRows} isLoading={false} error={null} />);

    const producerBadge = screen.getByText('Producer');
    expect(producerBadge).toHaveClass('text-green-700', 'bg-green-50');

    const factoryBadge = screen.getByText('Factory');
    expect(factoryBadge).toHaveClass('text-blue-700', 'bg-blue-50');
  });

  it('should format addresses correctly', () => {
    const longAddressRow: AdminTokenRow = {
      userAddress: '0x1234567890123456789012345678901234567890',
      userRole: UserRole.Consumer,
      tokenId: 3,
      tokenName: 'Test Token',
      currentBalance: 100,
      notes: 'Test notes',
    };

    render(<AdminTokensOverview tokenRows={[longAddressRow]} isLoading={false} error={null} />);

    expect(screen.getByText('0x1234...7890')).toBeInTheDocument();
  });

  it('should handle different user roles', () => {
    const multiRoleRows: AdminTokenRow[] = [
      {
        userAddress: '0x1111',
        userRole: UserRole.Producer,
        tokenId: 1,
        tokenName: 'A',
        currentBalance: 100,
        notes: 'test',
      },
      {
        userAddress: '0x2222',
        userRole: UserRole.Factory,
        tokenId: 2,
        tokenName: 'B',
        currentBalance: 200,
        notes: 'test',
      },
      {
        userAddress: '0x3333',
        userRole: UserRole.Retailer,
        tokenId: 3,
        tokenName: 'C',
        currentBalance: 300,
        notes: 'test',
      },
      {
        userAddress: '0x4444',
        userRole: UserRole.Consumer,
        tokenId: 4,
        tokenName: 'D',
        currentBalance: 400,
        notes: 'test',
      },
      {
        userAddress: '0x5555',
        userRole: UserRole.Admin,
        tokenId: 5,
        tokenName: 'E',
        currentBalance: 500,
        notes: 'test',
      },
    ];

    render(<AdminTokensOverview tokenRows={multiRoleRows} isLoading={false} error={null} />);

    expect(screen.getByText('Producer')).toBeInTheDocument();
    expect(screen.getByText('Factory')).toBeInTheDocument();
    expect(screen.getByText('Retailer')).toBeInTheDocument();
    expect(screen.getByText('Consumer')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });
});
