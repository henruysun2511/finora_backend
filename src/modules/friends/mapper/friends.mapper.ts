import { Injectable } from '@nestjs/common';
import { Friendship } from '../entities/friendship.entity';
import { FriendResponseDto } from '../dto/response/friend-response.dto';
import { PendingFriendRequestResponseDto } from '../dto/response/pending-request-response.dto';

@Injectable()
export class FriendMapper {
  toFriendResponse(friendship: Friendship, currentUserId: string): FriendResponseDto {
    const friendUser =
      friendship.requesterId === currentUserId ? friendship.addressee : friendship.requester;

    return {
      id: friendUser?.id ?? '',
      fullName: friendUser?.fullName ?? '',
      email: friendUser?.email ?? '',
      avatar: friendUser?.avatar ?? null,
      connectedAt: friendship.respondedAt ?? friendship.updatedAt,
    };
  }

  toPendingRequestResponse(
    friendship: Friendship,
    currentUserId: string,
  ): PendingFriendRequestResponseDto {
    const isSent = friendship.requesterId === currentUserId;
    const targetUser = isSent ? friendship.addressee : friendship.requester;

    return {
      id: friendship.id,
      user: {
        id: targetUser?.id ?? '',
        fullName: targetUser?.fullName ?? '',
        email: targetUser?.email ?? '',
        avatar: targetUser?.avatar ?? null,
      },
      type: isSent ? 'sent' : 'received',
      createdAt: friendship.createdAt,
    };
  }
}