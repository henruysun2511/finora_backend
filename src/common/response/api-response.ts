import { ApiProperty } from '@nestjs/swagger';

export class ApiResponse<T> {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: 'OK' })
  message: string;

  @ApiProperty()
  data: T | null;

  @ApiProperty({ example: '2026-09-18T10:00:00.000Z' })
  timestamp: string;

  constructor(partial: Partial<ApiResponse<T>>) {
    Object.assign(this, partial);
    this.timestamp = new Date().toISOString();
  }

  static success<T>(data: T, message = 'OK', statusCode = 200): ApiResponse<T> {
    return new ApiResponse({ success: true, statusCode, message, data });
  }

  static created<T>(data: T, message = 'Tạo thành công'): ApiResponse<T> {
    return new ApiResponse({ success: true, statusCode: 201, message, data });
  }

  static noContent(message = 'Thao tác thành công'): ApiResponse<null> {
    return new ApiResponse({ success: true, statusCode: 200, message, data: null });
  }
}

export class PaginatedResponse<T> {
  @ApiProperty({ isArray: true })
  items: T[];

  @ApiProperty({
    example: { page: 1, limit: 10, total: 100, totalPages: 10, hasNext: true, hasPrev: false },
  })
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };

  static of<T>(items: T[], total: number, page: number, limit: number): PaginatedResponse<T> {
    const totalPages = Math.ceil(total / limit) || 1;
    const res = new PaginatedResponse<T>();
    res.items = items;
    res.pagination = {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
    return res;
  }
}
