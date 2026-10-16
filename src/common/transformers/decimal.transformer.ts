import { ValueTransformer } from 'typeorm';

export class DecimalTransformer implements ValueTransformer {
  to(data?: number | null): number | null {
    if (data === null || data === undefined) return null;
    return data;
  }

  from(data?: string | null): number | null {
    if (data === null || data === undefined) return null;
    const res = parseFloat(data);
    return isNaN(res) ? 0 : res;
  }
}
