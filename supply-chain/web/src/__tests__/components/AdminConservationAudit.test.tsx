import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AdminConservationAudit } from '../../components/admin/AdminConservationAudit';
import type { ConservationRow } from '../../hooks/useAdminSupplyChain';

describe('AdminConservationAudit', () => {
  const mockConservationRows: ConservationRow[] = [
    {
      tokenName: 'Raw Material A Total',
      totalSupply: 1000,
      accountedBalance: 600,
      processedAmount: 400,
      isConserved: true,
      distribution: 'Producer: 200 + Factory: 400 + Procesado: 400',
    },
    {
      tokenName: 'Product B Total',
      totalSupply: 500,
      accountedBalance: 300,
      processedAmount: 0,
      isConserved: false,
      distribution: 'Retailer: 300',
    },
  ];

  it('should render loading state', () => {
    render(<AdminConservationAudit conservationRows={[]} isLoading={true} error={null} />);

    expect(screen.getByText('Calculando conservación...')).toBeInTheDocument();
  });

  it('should render error state', () => {
    const errorMessage = 'Failed to calculate conservation';
    render(<AdminConservationAudit conservationRows={[]} isLoading={false} error={errorMessage} />);

    expect(screen.getByText('Error en Auditoría de Conservación')).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('should render empty state', () => {
    render(<AdminConservationAudit conservationRows={[]} isLoading={false} error={null} />);

    expect(screen.getByText('No hay tokens para auditar')).toBeInTheDocument();
  });

  it('should render conservation data correctly', () => {
    render(
      <AdminConservationAudit
        conservationRows={mockConservationRows}
        isLoading={false}
        error={null}
      />
    );

    // Check header
    expect(screen.getByText('Auditoría de Conservación de Tokens')).toBeInTheDocument();

    // Check table headers
    expect(screen.getByText('Token')).toBeInTheDocument();
    expect(screen.getByText('Supply Total')).toBeInTheDocument();
    expect(screen.getByText('Balance Contabilizado')).toBeInTheDocument();
    expect(screen.getByText('Cantidad Procesada')).toBeInTheDocument();
    expect(screen.getByText('% Conservación')).toBeInTheDocument();
    expect(screen.getByText('Estado')).toBeInTheDocument();
    expect(screen.getByText('Distribución')).toBeInTheDocument();

    // Check first row (conserved)
    expect(screen.getByText('Raw Material A Total')).toBeInTheDocument();
    expect(screen.getByText((content) => /1[.,\s]?000/.test(content))).toBeInTheDocument();
    expect(screen.getByText((content) => /600/.test(content))).toBeInTheDocument();
    // Check that there's at least one "400" in the table (we know there are multiple)
    expect(screen.getAllByText((content) => /400/.test(content))).toHaveLength(3); // One in table cell, two in cards
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText('Conservado')).toBeInTheDocument();

    // Check distribution cards for first row
    expect(screen.getByText('Producer:')).toBeInTheDocument();
    expect(screen.getByText('200')).toBeInTheDocument();
    expect(screen.getByText('Factory:')).toBeInTheDocument();
    expect(screen.getByText('Procesado:')).toBeInTheDocument();

    // Check second row (not conserved)
    expect(screen.getByText('Product B Total')).toBeInTheDocument();
    expect(screen.getByText('500')).toBeInTheDocument();
    // Check that there are multiple "300" (one in table cell, one in card)
    expect(screen.getAllByText('300')).toHaveLength(2);
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('60%')).toBeInTheDocument();
    expect(screen.getByText('No Conservado')).toBeInTheDocument();

    // Check distribution cards for second row
    expect(screen.getByText('Retailer:')).toBeInTheDocument();
  });

  it('should apply correct status colors', () => {
    render(
      <AdminConservationAudit
        conservationRows={mockConservationRows}
        isLoading={false}
        error={null}
      />
    );

    const conservedBadge = screen.getByText('Conservado');
    expect(conservedBadge).toHaveClass('text-green-700', 'bg-green-100', 'border-green-200');

    const notConservedBadge = screen.getByText('No Conservado');
    expect(notConservedBadge).toHaveClass('text-red-700', 'bg-red-100', 'border-red-200');
  });

  it('should display conservation statistics', () => {
    render(
      <AdminConservationAudit
        conservationRows={mockConservationRows}
        isLoading={false}
        error={null}
      />
    );

    expect(screen.getByText(/Total tokens auditados:/)).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText(/Conservados:/)).toBeInTheDocument();
    expect(screen.getByText(/No conservados:/)).toBeInTheDocument();
  });

  it('should highlight non-conserved rows with border', () => {
    render(
      <AdminConservationAudit
        conservationRows={[mockConservationRows[1]]} // Only non-conserved row
        isLoading={false}
        error={null}
      />
    );

    const row = screen.getByText('Product B Total').closest('tr');
    expect(row).toHaveClass('border-l-4', 'border-red-400');
  });

  it('should calculate conservation percentages correctly', () => {
    const testRows: ConservationRow[] = [
      {
        tokenName: 'Test Token',
        totalSupply: 1000,
        accountedBalance: 300,
        processedAmount: 200,
        isConserved: false, // 50% conservation
        distribution: 'Test distribution',
      },
    ];

    render(<AdminConservationAudit conservationRows={testRows} isLoading={false} error={null} />);

    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('should handle zero total supply', () => {
    const zeroSupplyRows: ConservationRow[] = [
      {
        tokenName: 'Zero Token',
        totalSupply: 0,
        accountedBalance: 0,
        processedAmount: 0,
        isConserved: true,
        distribution: 'No distribution',
      },
    ];

    render(
      <AdminConservationAudit conservationRows={zeroSupplyRows} isLoading={false} error={null} />
    );

    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('should truncate long distribution text with title', () => {
    const longDistributionRow: ConservationRow[] = [
      {
        tokenName: 'Test Token',
        totalSupply: 1000,
        accountedBalance: 1000,
        processedAmount: 0,
        isConserved: true,
        distribution:
          'Very long distribution text that should be truncated in the display but shown in full in the title attribute',
      },
    ];

    render(
      <AdminConservationAudit
        conservationRows={longDistributionRow}
        isLoading={false}
        error={null}
      />
    );

    const distributionElement = screen.getByText((content) =>
      content.includes('Very long distribution text')
    );
    expect(distributionElement).toHaveAttribute('title', longDistributionRow[0].distribution);
  });
});
