import { parseNotes, parseDistribution, formatNumber, type ParsedItem } from '../../lib/parsers';

interface BadgeListProps {
  data: string;
  type: 'notes' | 'distribution';
}

export function BadgeList({ data, type }: BadgeListProps) {
  // Parsear los datos según el tipo
  const parsedItems: ParsedItem[] = type === 'notes' ? parseNotes(data) : parseDistribution(data);

  // Si no hay datos parseados, mostrar el texto original como fallback
  if (parsedItems.length === 0) {
    return (
      <div className="text-sm text-gray-600 max-w-xs" title={data}>
        {data}
      </div>
    );
  }

  return (
    <div className="space-y-2.5 min-w-[220px] max-w-[320px] md:max-w-[380px] lg:max-w-[420px]">
      {parsedItems.map((item, index) => {
        // Determinar estilo basado en el tipo
        const cardStyles =
          item.type === 'processed' ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200';

        return (
          <div
            key={`${item.label}-${index}`}
            className={`${cardStyles} rounded-lg px-3 py-2.5 border shadow-sm`}
          >
            <div className="flex items-center justify-between">
              {/* Label con formato texto: valor */}
              <span
                className={`text-sm font-medium ${item.type === 'processed' ? 'text-blue-700 italic' : 'text-gray-700'}`}
              >
                {item.label}:
              </span>

              {/* Valor formateado */}
              <span className="text-sm font-semibold text-gray-900 tabular-nums ml-3">
                {formatNumber(item.value)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
