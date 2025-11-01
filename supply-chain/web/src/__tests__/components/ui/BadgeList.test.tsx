import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BadgeList } from '../../../components/ui/BadgeList';

describe('BadgeList', () => {
  describe('notes type', () => {
    it('should render parsed notes as cards', () => {
      render(<BadgeList data="Original: 1500, transferidos: 500" type="notes" />);

      // Check card labels are rendered (they span multiple elements)
      expect(
        screen.getByText((_content, element) => {
          return element?.textContent === 'Original:';
        })
      ).toBeInTheDocument();
      expect(
        screen.getByText((_content, element) => {
          return element?.textContent === 'transferidos:';
        })
      ).toBeInTheDocument();

      // Check values are formatted
      // There should be only one element with '1500' (Original)
      expect(screen.getAllByText('1500')).toHaveLength(1);
      // There should be only one element with '500' (transferidos)
      expect(screen.getAllByText('500')).toHaveLength(1);
    });

    it('should handle empty notes gracefully', () => {
      render(<BadgeList data="" type="notes" />);

      // Should show empty fallback text
      const fallbackElement = screen.getByTitle('');
      expect(fallbackElement).toBeInTheDocument();
      expect(fallbackElement).toHaveClass('text-sm', 'text-gray-600');
    });

    it('should fall back to original text for unparseable data', () => {
      const unparseable = 'Some random text without format';
      render(<BadgeList data={unparseable} type="notes" />);

      expect(screen.getByText(unparseable)).toBeInTheDocument();
    });
  });

  describe('distribution type', () => {
    it('should render parsed distribution as cards', () => {
      render(
        <BadgeList data="Producer: 200 + Factory: 400 + Procesado: 400" type="distribution" />
      );

      // Check role labels (they span multiple elements with newlines)
      expect(
        screen.getByText((_content, element) => {
          return element?.textContent === 'Producer:';
        })
      ).toBeInTheDocument();
      expect(
        screen.getByText((_content, element) => {
          return element?.textContent === 'Factory:';
        })
      ).toBeInTheDocument();
      expect(
        screen.getByText((_content, element) => {
          return element?.textContent === 'Procesado:';
        })
      ).toBeInTheDocument();

      // Check values
      expect(screen.getByText('200')).toBeInTheDocument();
      // Factory: 400 should appear twice, so use getAllByText
      const factoryValues = screen.getAllByText('400');
      expect(factoryValues).toHaveLength(2);
    });

    it('should apply default card styles for regular items', () => {
      render(<BadgeList data="Producer: 100" type="distribution" />);

      // Find the Producer label element and traverse up to get the card container
      const producerLabel = screen.getByText((_content, element) => {
        return element?.textContent === 'Producer:';
      });
      const cardContainer = producerLabel.closest('div')?.parentElement;
      expect(cardContainer).toHaveClass('bg-gray-50', 'border-gray-200', 'rounded-lg');
    });

    it('should apply processed styles for processed items', () => {
      render(<BadgeList data="Procesado: 300" type="distribution" />);

      const processedLabel = screen.getByText((_content, element) => {
        return element?.textContent === 'Procesado:';
      });
      expect(processedLabel).toHaveClass('text-blue-700', 'italic');

      // Find the processed card container
      const processedCard = processedLabel.closest('div')?.parentElement;
      expect(processedCard).toHaveClass('bg-blue-50', 'border-blue-200');
    });

    it('should handle numbers with commas', () => {
      render(<BadgeList data="Producer: 1,500" type="distribution" />);

      expect(
        screen.getByText((_content, element) => {
          return element?.textContent === 'Producer:';
        })
      ).toBeInTheDocument();
      expect(screen.getByText((content) => /1[.,\s]?500/.test(content))).toBeInTheDocument();
    });
  });

  describe('responsive behavior', () => {
    it('should have responsive width classes', () => {
      render(<BadgeList data="Producer: 100" type="distribution" />);

      // Find the main container (outermost div with space-y class)
      const producerLabel = screen.getByText((_content, element) => {
        return element?.textContent === 'Producer:';
      });
      const container = producerLabel.closest('div')?.parentElement?.parentElement;
      expect(container).toHaveClass(
        'space-y-2.5',
        'min-w-[220px]',
        'max-w-[320px]',
        'md:max-w-[380px]',
        'lg:max-w-[420px]'
      );
    });
  });

  describe('accessibility', () => {
    it('should have proper spacing between items', () => {
      render(<BadgeList data="Producer: 100 + Factory: 200" type="distribution" />);

      const producerLabel = screen.getByText((_content, element) => {
        return element?.textContent === 'Producer:';
      });
      const container = producerLabel.closest('div')?.parentElement?.parentElement;
      expect(container).toHaveClass('space-y-2.5');
    });

    it('should have tabular numbers for values', () => {
      render(<BadgeList data="Producer: 100" type="distribution" />);

      const valueElement = screen.getByText('100');
      expect(valueElement).toHaveClass('tabular-nums');
    });
  });
});
