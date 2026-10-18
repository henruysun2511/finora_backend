import { HttpStatus } from '@nestjs/common';
import { AppError } from '../../../common/errors/app.error';
import { FRIEND_ERROR_CODE } from '../friends.constant';

export class CannotFriendSelfException extends AppError {
  constructor() {
    super({
      code: FRIEND_ERROR_CODE.CANNOT_FRIEND_SELF,
      message: 'Không thể gửi lời mời kết bạn cho chính mình',
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class FriendRequestAlreadyExistsException extends AppError {
  constructor() {
    super({
      code: FRIEND_ERROR_CODE.REQUEST_ALREADY_EXISTS,
      message: 'Lời mời kết bạn đã được gửi trước đó',
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class AlreadyFriendsException extends AppError {
  constructor() {
    super({
      code: FRIEND_ERROR_CODE.ALREADY_FRIENDS,
      message: 'Hai người đã là bạn bè từ trước',
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class UserBlockedException extends AppError {
  constructor() {
    super({
      code: FRIEND_ERROR_CODE.USER_BLOCKED,
      message: 'Không thể thực hiện do liên quan đến chặn người dùng',
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}

export class FriendshipNotFoundException extends AppError {
  constructor() {
    super({
      code: FRIEND_ERROR_CODE.NOT_FOUND,
      message: 'Không tìm thấy quan hệ bạn bè hoặc lời mời này',
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}