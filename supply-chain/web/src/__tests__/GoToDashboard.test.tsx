import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { GoToDashboard } from '../components/ui/GoToDashboard';

describe('GoToDashboard Component', () => {
  const renderWithRouter = (component: React.ReactElement) => {
    return render(<MemoryRouter>{component}</MemoryRouter>);
  };

  it('renders with default text and styling', () => {
    renderWithRouter(<GoToDashboard />);

    const link = screen.getByRole('link', { name: /go to dashboard/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/dashboard');
    expect(link).toHaveClass(
      'mt-4',
      'px-4',
      'py-2',
      'bg-blue-500',
      'text-white',
      'rounded-md',
      'hover:bg-blue-600',
      'inline-block'
    );
  });

  it('renders with custom text when children provided', () => {
    renderWithRouter(<GoToDashboard>Custom Dashboard Text</GoToDashboard>);

    const link = screen.getByRole('link', { name: /custom dashboard text/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/dashboard');
  });

  it('applies additional CSS classes when provided', () => {
    const customClass = 'my-custom-class';
    renderWithRouter(<GoToDashboard className={customClass} />);

    const link = screen.getByRole('link', { name: /go to dashboard/i });
    expect(link).toHaveClass(customClass);
    expect(link).toHaveClass('mt-4', 'px-4', 'py-2', 'bg-blue-500'); // Default classes should still be there
  });
  it('combines default classes with custom classes correctly', () => {
    renderWithRouter(<GoToDashboard className="text-lg font-bold" />);

    const link = screen.getByRole('link', { name: /go to dashboard/i });
    expect(link).toHaveClass(
      'mt-4',
      'px-4',
      'py-2',
      'bg-blue-500',
      'text-white',
      'rounded-md',
      'hover:bg-blue-600',
      'inline-block'
    );
    expect(link).toHaveClass('text-lg', 'font-bold');
  });
});
