export const PRODUCTS_CONSTANTS = {
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 10,
    MAX_LIMIT: 100,
  },
  ALLOWED_SORT_FIELDS: [
    'createdAt',
    'updatedAt',
    'name',
    'price',
    'stock',
  ],
} as const;

export enum ProductStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export const PRODUCT_ERROR_CODE = {
  SKU_ALREADY_EXISTS: 'PRODUCT_SKU_ALREADY_EXISTS',
  NAME_ALREADY_EXISTS: 'PRODUCT_NAME_ALREADY_EXISTS',
} as const;
