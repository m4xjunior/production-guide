import { Step } from '@/types/Step';

export interface ProductData {
  productId: string;
  steps: Step[];
  imagesPath: string;
}

export const parseCSV = (csvContent: string): Step[] => {
  const lines = csvContent.split('\n');
  const steps: Step[] = [];

  // Skip header line
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const columns = line.split(';');
    if (columns.length >= 6) {
      const step: Step = {
        paso: parseInt(columns[0]),
        tipo: columns[1] as 'VOZ' | 'SISTEMA',
        mensaje: columns[2],
        voz: columns[3],
        respuesta: columns[4],
        fotos: columns[5]
      };
      steps.push(step);
    }
  }

  return steps;
};

export const loadProductData = async (productId: string): Promise<ProductData | null> => {
  try {
    const response = await fetch(`/api/products/${productId}`);
    if (!response.ok) {
      throw new Error(`Failed to load product ${productId}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error loading product data:', error);
    return null;
  }
};

export const getAvailableProducts = async (): Promise<string[]> => {
  try {
    const response = await fetch('/api/products');
    if (!response.ok) {
      throw new Error('Failed to load products list');
    }

    const products = await response.json();
    return products;
  } catch (error) {
    console.error('Error loading products:', error);
    return [];
  }
};
