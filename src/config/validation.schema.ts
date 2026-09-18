interface FieldRule {
  required?: boolean;
  type?: 'string' | 'number' | 'boolean';
}

type Schema = Record<string, FieldRule>;

const SCHEMA: Schema = {
  NODE_ENV: { type: 'string' },
  PORT: { type: 'number' },
  APP_URL: { type: 'string' },
  FRONTEND_URL: { type: 'string' },
  DATABASE_URL: { required: true, type: 'string' },
};

export function validateEnv(): void {
  const missing: string[] = [];
  const invalid: string[] = [];

  for (const [name, rule] of Object.entries(SCHEMA)) {
    const value = process.env[name];

    if (rule.required && (value === undefined || value === '')) {
      missing.push(name);
      continue;
    }

    if (value === undefined) continue;

    if (rule.type === 'number' && Number.isNaN(Number(value))) {
      invalid.push(name);
    }

    if (rule.type === 'boolean' && !['true', 'false'].includes(value)) {
      invalid.push(name);
    }
  }

  const errors = [
    ...missing.map((e) => `Thiếu biến môi trường: ${e}`),
    ...invalid,
  ];

  if (errors.length > 0) {
    throw new Error(
      '[ENV VALIDATION] Khởi động dừng — cấu hình môi trường chưa hợp lệ:\n' +
        errors.map((e) => `  - ${e}`).join('\n'),
    );
  }
}
