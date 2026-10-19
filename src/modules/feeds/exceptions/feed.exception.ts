import { HttpStatus } from '@nestjs/common';
import { AppError } from '../../../common/errors/app.error';
import { FEED_ERROR_CODE } from '../feed.constant';

export class PostNotFoundException extends AppError {
  constructor() {
    super({
      code: FEED_ERROR_CODE.POST_NOT_FOUND,
      message: 'Không tìm thấy bài đăng trên bảng tin',
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class PostAccessDeniedException extends AppError {
  constructor() {
    super({
      code: FEED_ERROR_CODE.POST_ACCESS_DENIED,
      message: 'Bạn không có quyền xem hoặc tương tác với bài đăng này',
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}

export class ReactionNotFoundException extends AppError {
  constructor() {
    super({
      code: FEED_ERROR_CODE.REACTION_NOT_FOUND,
      message: 'Bạn chưa bày tỏ cảm xúc về bài đăng này',
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class NotFriendException extends AppError {
  constructor() {
    super({
      code: FEED_ERROR_CODE.NOT_FRIEND,
      message: 'Người dùng này không nằm trong danh sách bạn bè của bạn',
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}