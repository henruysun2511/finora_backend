import { NotFoundException } from '@nestjs/common';

export class NotificationNotFoundException extends NotFoundException {
  constructor(id: string) {
    super(`Không tìm thấy thông báo với ID: ${id}`);
  }
}
