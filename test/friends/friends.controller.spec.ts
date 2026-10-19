/// <reference types="jest" />

import { FriendsController } from '../../src/modules/friends/friends.controller';
import { RespondFriendRequestStatus } from '../../src/modules/friends/enums/respond-friend-request-status.enum';
import { FriendshipStatus } from '../../src/modules/friends/enums/friendship-status.enum';

describe('FriendsController', () => {
  let controller: FriendsController;
  let friendsService: any;

  const USER_ID = 'user-me';
  const FULL_NAME = 'Hoàng Văn Tôi';

  beforeEach(() => {
    friendsService = {
      searchUsers: jest.fn(),
      sendRequest: jest.fn(),
      getPendingRequests: jest.fn(),
      acceptRequest: jest.fn(),
      rejectRequest: jest.fn(),
      getFriends: jest.fn(),
      unfriend: jest.fn(),
      blockUser: jest.fn(),
      getStatus: jest.fn(),
    };
    controller = new FriendsController(friendsService);
  });

  it('searchUsers: bọc kết quả tìm kiếm vào ApiResponse', async () => {
    friendsService.searchUsers.mockResolvedValue([{ id: 'u-1', fullName: 'User 1' }]);

    const result = await controller.searchUsers(USER_ID, { query: 'User' });

    expect(friendsService.searchUsers).toHaveBeenCalledWith(USER_ID, { query: 'User' });
    expect(result.data).toHaveLength(1);
    expect(result.success).toBe(true);
  });

  it('sendRequest: bọc kết quả tạo lời mời vào ApiResponse.created', async () => {
    const dto = { addresseeId: 'u-target' };
    friendsService.sendRequest.mockResolvedValue({ id: 'f-1', status: FriendshipStatus.PENDING });

    const result = await controller.sendRequest(USER_ID, FULL_NAME, dto);

    expect(friendsService.sendRequest).toHaveBeenCalledWith(USER_ID, FULL_NAME, dto);
    expect(result.data.status).toBe(FriendshipStatus.PENDING);
  });

  it('getPendingRequests: lấy danh sách lời mời đang chờ', async () => {
    friendsService.getPendingRequests.mockResolvedValue([]);

    const result = await controller.getPendingRequests(USER_ID, {});

    expect(friendsService.getPendingRequests).toHaveBeenCalledWith(USER_ID, {});
    expect(result.data).toEqual([]);
  });

  it('updateRequestStatus (ACCEPTED): gọi acceptRequest', async () => {
    friendsService.acceptRequest.mockResolvedValue({ id: 'f-1', status: FriendshipStatus.ACCEPTED });

    const result = await controller.updateRequestStatus(USER_ID, FULL_NAME, 'f-1', {
      status: RespondFriendRequestStatus.ACCEPTED,
    });

    expect(friendsService.acceptRequest).toHaveBeenCalledWith(USER_ID, FULL_NAME, 'f-1');
    expect(result.message).toBe('Đã chấp nhận kết bạn');
  });

  it('updateRequestStatus (REJECTED): gọi rejectRequest', async () => {
    friendsService.rejectRequest.mockResolvedValue({ id: 'f-1', status: FriendshipStatus.REJECTED });

    const result = await controller.updateRequestStatus(USER_ID, FULL_NAME, 'f-1', {
      status: RespondFriendRequestStatus.REJECTED,
    });

    expect(friendsService.rejectRequest).toHaveBeenCalledWith(USER_ID, 'f-1');
    expect(result.message).toBe('Đã từ chối lời mời kết bạn');
  });

  it('getFriends: trả về PaginatedResponse chuẩn', async () => {
    friendsService.getFriends.mockResolvedValue({ items: [{ id: 'u-friend' }], total: 1 });

    const result = await controller.getFriends(USER_ID, { page: 1, limit: 10 });

    expect(friendsService.getFriends).toHaveBeenCalledWith(USER_ID, { page: 1, limit: 10 });
    expect(result.items).toHaveLength(1);
    expect(result.pagination.total).toBe(1);
    expect(result.pagination.page).toBe(1);
  });

  it('unfriend: gọi unfriend và trả về ApiResponse', async () => {
    friendsService.unfriend.mockResolvedValue({ success: true });

    const result = await controller.unfriend(USER_ID, 'u-friend');

    expect(friendsService.unfriend).toHaveBeenCalledWith(USER_ID, 'u-friend');
    expect(result.message).toBe('Hủy kết bạn thành công');
  });

  it('updateFriendshipStatus (BLOCKED): gọi blockUser', async () => {
    friendsService.blockUser.mockResolvedValue({ status: FriendshipStatus.BLOCKED });

    const result = await controller.updateFriendshipStatus(USER_ID, 'u-target', {
      status: FriendshipStatus.BLOCKED,
    });

    expect(friendsService.blockUser).toHaveBeenCalledWith(USER_ID, 'u-target');
    expect(result.data.status).toBe(FriendshipStatus.BLOCKED);
  });

  it('getStatus: kiểm tra trạng thái quan hệ', async () => {
    friendsService.getStatus.mockResolvedValue({ status: FriendshipStatus.ACCEPTED, isRequester: true });

    const result = await controller.getStatus(USER_ID, 'u-target');

    expect(friendsService.getStatus).toHaveBeenCalledWith(USER_ID, 'u-target');
    expect(result.data.status).toBe(FriendshipStatus.ACCEPTED);
  });
});
