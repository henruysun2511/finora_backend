import { ValueTransformer } from 'typeorm';

export class DecimalTransformer implements ValueTransformer {
  to(value?: number | null): number | null | undefined {
    return value;
  }

  from(value?: string | null): number | null | undefined {
    if (value === null || value === undefined) {
      return value as any;
    }
    return parseFloat(value);
  }
}

export const decimalTransformer: ValueTransformer = new DecimalTransformer();
