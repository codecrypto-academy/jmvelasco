/**
 * Utilidades para parsear strings concatenados en datos estructurados
 * para mejorar la visualización en tablas admin
 */

export interface ParsedItem {
  type: 'role' | 'processed' | 'info';
  label: string;
  value: number;
}

/**
 * Parsea strings de distribución como "Producer: 200 + Factory: 400 + Procesado: 400"
 * @param distributionString - String concatenado de distribución
 * @returns Array de items parseados
 */
export function parseDistribution(distributionString: string): ParsedItem[] {
  if (!distributionString || distributionString.trim() === '') {
    return [];
  }

  const items: ParsedItem[] = [];

  // Split por ' + ' y procesar cada parte
  const parts = distributionString.split(' + ').map((part) => part.trim());

  for (const part of parts) {
    // Buscar patrón "Clave: Valor"
    // Regex mejorado para capturar números con comas correctamente
    const match = part.match(/^(.+?):\s*(\d{1,3}(?:,\d{3})*|\d+)$/);
    if (match) {
      const label = match[1].trim();
      const valueString = match[2].replace(/,/g, ''); // Remover comas
      const value = parseInt(valueString, 10);

      if (!isNaN(value)) {
        // Determinar tipo basado en el label
        const type = label.toLowerCase().includes('procesado') ? 'processed' : 'role';

        items.push({
          type,
          label,
          value,
        });
      }
    }
  }

  return items;
}

/**
 * Parsea strings de notas como "Original: 1500, transferidos: 500"
 * @param notesString - String concatenado de notas
 * @returns Array de items parseados
 */
export function parseNotes(notesString: string): ParsedItem[] {
  if (!notesString || notesString.trim() === '') {
    return [];
  }

  const items: ParsedItem[] = [];

  // Estrategia: usar regex que capture ambos formatos y maneje números con comas
  // Patrón combinado que busca "Label: Number" o "Label Number" seguido de coma o final de string
  const combinedPattern = /([^,:]+?)(?::\s*|\s+)(\d{1,3}(?:,\d{3})*|\d+)(?=\s*,|\s*$)/g;
  let match;

  while ((match = combinedPattern.exec(notesString)) !== null) {
    const label = match[1].trim();
    const valueString = match[2].replace(/,/g, ''); // Remover comas de los números
    const value = parseInt(valueString, 10);

    if (!isNaN(value) && label) {
      items.push({
        type: 'info',
        label,
        value,
      });
    }
  }

  return items;
}

/**
 * Formatea un número con separadores de miles
 * @param value - Número a formatear
 * @returns String formateado
 */
export function formatNumber(value: number): string {
  return value.toLocaleString();
}

/**
 * Obtiene las clases CSS para badges de roles
 * @param label - Label del item (usado para determinar el rol)
 * @returns String con clases de TailwindCSS
 */
export function getRoleBadgeClasses(label: string): string {
  const normalizedLabel = label.toLowerCase();

  if (normalizedLabel.includes('producer') || normalizedLabel === 'producer') {
    return 'bg-green-100 text-green-700 border-green-200';
  }

  if (normalizedLabel.includes('factory') || normalizedLabel === 'factory') {
    return 'bg-blue-100 text-blue-700 border-blue-200';
  }

  if (normalizedLabel.includes('retailer') || normalizedLabel === 'retailer') {
    return 'bg-purple-100 text-purple-700 border-purple-200';
  }

  if (normalizedLabel.includes('consumer') || normalizedLabel === 'consumer') {
    return 'bg-orange-100 text-orange-700 border-orange-200';
  }

  if (normalizedLabel.includes('admin') || normalizedLabel === 'admin') {
    return 'bg-red-100 text-red-700 border-red-200';
  }

  // Default para info y otros
  return 'bg-gray-100 text-gray-700 border-gray-300';
}

/**
 * Obtiene las clases CSS para badges de procesado
 * @returns String con clases de TailwindCSS
 */
export function getProcessedBadgeClasses(): string {
  return 'bg-sky-50 text-sky-600 border-sky-400 italic';
}
