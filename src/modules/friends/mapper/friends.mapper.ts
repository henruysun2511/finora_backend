import { Injectable } from '@nestjs/common';
import { Friendship } from '../entities/friendship.entity';
import { FriendResponseDto } from '../dto/response/friend-response.dto';

@Injectable()
export class FriendMapper {
  toFriendResponse(friendship: Friendship, currentUserId: string): FriendResponseDto {
    const friendUser = friendship.requesterId === currentUserId ? friendship.addressee : friendship.requester;
    return {
      id: friendUser?.id,
      fullName: friendUser?.fullName,
      email: friendUser?.email,
      avatar: friendUser?.avatar,
      connectedAt: friendship.updatedAt,
    };
  }
}