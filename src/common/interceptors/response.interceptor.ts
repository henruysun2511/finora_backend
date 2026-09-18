import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { ApiResponse } from '../response/api-response';

/**
 * Tự động bọc mọi response từ Controller thành ApiResponse<T>.
 * Nếu controller đã trả về ApiResponse hoặc object có thuộc tính success thì giữ nguyên.
 */
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const response = context.switchToHttp().getResponse();
    const statusCode = response.statusCode;

    return next.handle().pipe(
      map((data) => {
        if (data instanceof ApiResponse) return data;
        if (data && typeof data === 'object' && 'success' in data) return data;

        return new ApiResponse({
          success: true,
          statusCode,
          message: statusCode === 201 ? 'Tạo mới thành công' : 'OK',
          data: data ?? null,
        });
      }),
    );
  }
}
