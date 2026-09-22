import { applyDecorators, Type } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

interface SwaggerDocOptions {
  summary: string;
  description?: string;
  bodyType?: Type<unknown>;
  responseType?: Type<unknown>;
  status?: number;
  isArray?: boolean;
  bearerAuth?: boolean;
}

export function SwaggerDoc(options: SwaggerDocOptions): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: options.summary,
      description: options.description,
    }),
    ...(options.bearerAuth ? [ApiBearerAuth('access-token')] : []),
    ...(options.bodyType ? [ApiBody({ type: options.bodyType })] : []),
    ...(options.responseType
      ? [
          ApiResponse({
            status: options.status ?? 200,
            type: options.responseType,
            isArray: options.isArray,
          }),
        ]
      : []),
  );
}

