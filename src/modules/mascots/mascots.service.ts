import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { MascotRepository } from './repositories/mascot.repository';
import { MascotMapper } from './mapper/mascot.mapper';
import { CreateMascotDto } from './dto/request/create-mascot.dto';
import { UpdateMascotDto } from './dto/request/update-mascot.dto';
import { MascotTierResponseDto } from './dto/response/mascot-tier-response.dto';
import { MascotSimpleResponseDto } from './dto/response/mascot-simple-response.dto';
import { CurrentMascotResponseDto } from './dto/response/current-mascot-response.dto';
import { MascotEvolutionResponseDto } from './dto/response/mascot-evolution-response.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/enums/notification-type.enum';
import {
  MascotNotFoundException,
  MascotTierNameAlreadyExistsException,
  MascotInvalidNetWorthRangeException,
  MascotCannotDeleteException,
  MascotCannotDeactivateException,
} from './exceptions/mascot.exception';
import { DEFAULT_FALLBACK_MASCOT_KEY } from './mascots.constant';
import {
  EVENT_NET_WORTH_CHANGED,
  NetWorthChangedEvent,
} from '../../common/events/net-worth-changed.event';
import { MascotTone } from './enums/mascot-tone.enum';

@Injectable()
export class MascotsService {
  private readonly logger = new Logger(MascotsService.name);

  constructor(
    private readonly mascotRepo: MascotRepository,
    private readonly mascotMapper: MascotMapper,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Tạo mới một linh vật AI
   */
  async create(dto: CreateMascotDto): Promise<MascotTierResponseDto> {
    const normalizedKey = dto.tierName.toLowerCase().trim();

    // 1. Kiểm tra trùng mã định danh tierName
    const existing = await this.mascotRepo.findByTierName(normalizedKey);
    if (existing) {
      throw new MascotTierNameAlreadyExistsException(normalizedKey);
    }

    // 2. Kiểm tra khoảng tài sản ròng hợp lệ
    if (
      dto.maxNetWorth !== null &&
      dto.maxNetWorth !== undefined &&
      dto.minNetWorth >= dto.maxNetWorth
    ) {
      throw new MascotInvalidNetWorthRangeException();
    }

    // 3. Khởi tạo và lưu qua Repository
    const entityData = this.mascotMapper.toEntity(dto);
    const entity = this.mascotRepo.create(entityData);
    const saved = await this.mascotRepo.save(entity);

    this.logger.log(
      `Đã tạo thành công mascot: ${saved.displayName} (${saved.tierName})`,
    );
    return this.mascotMapper.toResponse(saved);
  }

  /**
   * Lấy danh sách linh vật đang hoạt động cho người dùng (chỉ lấy id, tierName, displayName, mascotAssetUrl)
   */
  async findAll(): Promise<MascotSimpleResponseDto[]> {
    const list = await this.mascotRepo.findActiveOnly();
    return list.map((item) => this.mascotMapper.toSimpleResponse(item));
  }

  /**
   * Lấy danh sách toàn bộ linh vật cho Quản trị viên (đầy đủ các trường quản lý, bao gồm cả inactive)
   */
  async findAllForAdmin(): Promise<MascotTierResponseDto[]> {
    const list = await this.mascotRepo.findAll();
    return list.map((item) => this.mascotMapper.toResponse(item));
  }

  /**
   * Lấy chi tiết linh vật theo UUID
   */
  async findOne(id: string): Promise<MascotTierResponseDto> {
    const tier = await this.mascotRepo.findById(id);
    if (!tier) {
      throw new MascotNotFoundException(id);
    }
    return this.mascotMapper.toResponse(tier);
  }

  /**
   * Kích hoạt hoặc Hủy kích hoạt linh vật
   */
  async updateStatus(
    id: string,
    isActive: boolean,
  ): Promise<MascotTierResponseDto> {
    const tier = await this.mascotRepo.findById(id);
    if (!tier) {
      throw new MascotNotFoundException(id);
    }

    if (!isActive) {
      // 1. Không cho phép hủy kích hoạt linh vật mặc định hệ thống (nora)
      if (tier.tierName === DEFAULT_FALLBACK_MASCOT_KEY) {
        throw new MascotCannotDeactivateException(
          `Không thể hủy kích hoạt linh vật mặc định '${DEFAULT_FALLBACK_MASCOT_KEY}'`,
        );
      }

      // 2. Không cho phép hủy kích hoạt nếu chỉ còn 1 linh vật đang active
      const activeCount = await this.mascotRepo.countActive();
      if (activeCount <= 1 && tier.isActive) {
        throw new MascotCannotDeactivateException(
          'Hệ thống phải có ít nhất 1 linh vật đang kích hoạt',
        );
      }
    }

    tier.isActive = isActive;
    const saved = await this.mascotRepo.save(tier);
    this.logger.log(
      `Đã ${isActive ? 'kích hoạt' : 'hủy kích hoạt'} mascot: ${saved.displayName} (${saved.tierName})`,
    );
    return this.mascotMapper.toResponse(saved);
  }

  /**
   * Cập nhật thông tin linh vật
   */
  async update(id: string, dto: UpdateMascotDto): Promise<MascotTierResponseDto> {
    const tier = await this.mascotRepo.findById(id);
    if (!tier) {
      throw new MascotNotFoundException(id);
    }

    // 1. Nếu thay đổi tierName, kiểm tra trùng lặp
    if (dto.tierName) {
      const normalizedKey = dto.tierName.toLowerCase().trim();
      if (normalizedKey !== tier.tierName) {
        const existing = await this.mascotRepo.findByTierName(normalizedKey);
        if (existing) {
          throw new MascotTierNameAlreadyExistsException(normalizedKey);
        }
        tier.tierName = normalizedKey;
      }
    }

    // 2. Kiểm tra tính hợp lệ của khoảng tài sản ròng
    const effectiveMin =
      dto.minNetWorth !== undefined ? dto.minNetWorth : Number(tier.minNetWorth);
    const effectiveMax =
      dto.maxNetWorth !== undefined
        ? dto.maxNetWorth
        : tier.maxNetWorth !== null && tier.maxNetWorth !== undefined
        ? Number(tier.maxNetWorth)
        : null;

    if (effectiveMax !== null && effectiveMin >= effectiveMax) {
      throw new MascotInvalidNetWorthRangeException();
    }

    // 3. Cập nhật các trường
    if (dto.displayName !== undefined) tier.displayName = dto.displayName.trim();
    if (dto.minNetWorth !== undefined) tier.minNetWorth = dto.minNetWorth;
    if (dto.maxNetWorth !== undefined) tier.maxNetWorth = dto.maxNetWorth;
    if (dto.displayOrder !== undefined) tier.displayOrder = dto.displayOrder;
    if (dto.htmlContent !== undefined) tier.htmlContent = dto.htmlContent;
    if (dto.systemPrompt !== undefined) tier.systemPrompt = dto.systemPrompt;
    if (dto.quotes !== undefined) tier.quotes = dto.quotes;
    if (dto.mascotAssetUrl !== undefined)
      tier.mascotAssetUrl = dto.mascotAssetUrl;
    if (dto.isActive !== undefined) {
      if (!dto.isActive && tier.tierName === DEFAULT_FALLBACK_MASCOT_KEY) {
        throw new MascotCannotDeactivateException(
          `Không thể hủy kích hoạt linh vật mặc định '${DEFAULT_FALLBACK_MASCOT_KEY}'`,
        );
      }
      tier.isActive = dto.isActive;
    }

    const saved = await this.mascotRepo.save(tier);
    this.logger.log(
      `Đã cập nhật mascot: ${saved.displayName} (${saved.tierName})`,
    );
    return this.mascotMapper.toResponse(saved);
  }

  /**
   * Xóa mềm một linh vật
   */
  async remove(id: string): Promise<void> {
    const tier = await this.mascotRepo.findById(id);
    if (!tier) {
      throw new MascotNotFoundException(id);
    }

    // Ràng buộc 1: Không cho phép xóa nếu hệ thống chỉ còn 1 linh vật
    const totalCount = await this.mascotRepo.count();
    if (totalCount <= 1) {
      throw new MascotCannotDeleteException(
        'Không thể xóa linh vật cuối cùng trong hệ thống',
      );
    }

    // Ràng buộc 2: Không cho phép xóa linh vật mặc định (nora) nếu còn ít hơn 3 linh vật
    if (tier.tierName === DEFAULT_FALLBACK_MASCOT_KEY && totalCount <= 3) {
      throw new MascotCannotDeleteException(
        `Không thể xóa linh vật mặc định '${DEFAULT_FALLBACK_MASCOT_KEY}'`,
      );
    }

    await this.mascotRepo.softDelete(id);
    this.logger.log(
      `Đã xóa mềm linh vật: ${tier.displayName} (${tier.tierName})`,
    );
  }

  /**
   * Lấy linh vật hiện tại của người dùng dựa theo Net Worth thực tế
   */
  async getCurrentUserMascot(userId: string): Promise<CurrentMascotResponseDto> {
    // 1. Lấy dữ liệu tài chính qua Repository
    const totalWalletBalance =
      await this.mascotRepo.getUserTotalWalletBalance(userId);
    const totalDebt = await this.mascotRepo.getUserTotalBorrowedDebt(userId);

    // 2. Tính Net Worth
    const netWorth = totalWalletBalance - totalDebt;

    // 3. Lấy cấu hình hiển thị, tone và độ nhạy mascot qua Repository
    const settings = await this.mascotRepo.getUserMascotSettings(userId);

    // 4. Tìm linh vật tương ứng theo Net Worth qua Repository
    let matchedTier = await this.mascotRepo.findTierByNetWorth(netWorth);
    if (!matchedTier) {
      if (netWorth < 0) {
        matchedTier = await this.mascotRepo.findByTierName('ash');
      }
      if (!matchedTier) {
        matchedTier = await this.mascotRepo.findByTierName(
          DEFAULT_FALLBACK_MASCOT_KEY,
        );
      }
    }

    // 5. Chọn câu thoại ngẫu nhiên
    const quotes = matchedTier?.quotes || [];
    const greeting =
      quotes.length > 0
        ? quotes[Math.floor(Math.random() * quotes.length)]
        : `Chào bạn, tôi là ${matchedTier?.displayName || 'Nora'}!`;

    return {
      netWorth,
      totalWalletBalance,
      totalDebt,
      showMascot: settings.showMascot,
      mascotTone: settings.mascotTone,
      mascotSensitivity: settings.mascotSensitivity,
      greeting,
      mascot: matchedTier
        ? this.mascotMapper.toResponse(matchedTier)
        : ({} as MascotTierResponseDto),
    };
  }

  /**
   * Kiểm tra và kích hoạt sự kiện Thăng/Tụt hạng linh vật sau khi có biến động tài sản ròng.
   * Nếu có sự thay đổi linh vật, hệ thống sẽ:
   * 1. Cập nhật currentMascotTierId trong user_settings.
   * 2. Gửi thông báo In-app và phát realtime qua Socket.IO tới người dùng.
   * 3. Trả về kết quả tiến hóa để Client hiển thị popup / pháo hoa.
   */
  async checkMascotEvolution(
    userId: string,
  ): Promise<MascotEvolutionResponseDto> {
    const currentMascotData = await this.getCurrentUserMascot(userId);
    const newTier = currentMascotData.mascot;
    const lastTierId = await this.mascotRepo.getUserCurrentMascotTierId(userId);

    // 1. Trường hợp lần đầu tiên kiểm tra (chưa có mốc cũ):
    if (!lastTierId) {
      await this.mascotRepo.updateUserCurrentMascotTierId(userId, newTier.id);
      return {
        evolved: false,
        netWorth: currentMascotData.netWorth,
        currentMascot: newTier,
        message: `Linh vật hiện tại của bạn là ${newTier.displayName}`,
      };
    }

    // 2. Nếu mốc cũ trùng với mốc mới -> Chưa đủ điều kiện đổi linh vật
    if (lastTierId === newTier.id) {
      return {
        evolved: false,
        netWorth: currentMascotData.netWorth,
        currentMascot: newTier,
        message: `Tài sản ròng hiện tại vẫn tương ứng với linh vật ${newTier.displayName}`,
      };
    }

    // 3. Đã có sự thay đổi linh vật (TIẾN HÓA / THAY ĐỔI)
    const previousTierEntity = await this.mascotRepo.findById(lastTierId);
    const previousTier = previousTierEntity
      ? this.mascotMapper.toResponse(previousTierEntity)
      : undefined;

    const isLevelUp =
      previousTier !== undefined
        ? newTier.displayOrder > previousTier.displayOrder
        : true;

    // 3.1. Cập nhật tier mới vào CSDL
    await this.mascotRepo.updateUserCurrentMascotTierId(userId, newTier.id);

    // 3.2. Soạn nội dung thông báo
    const title = isLevelUp
      ? `🎉 CHÚC MỪNG BẠN ĐÃ THĂNG HẠNG LINH VẬT!`
      : `⚠️ THAY ĐỔI LINH VẬT ĐỒNG HÀNH`;

    const body = isLevelUp
      ? `Tài sản ròng của bạn đã đạt ${currentMascotData.netWorth.toLocaleString('vi-VN')} VND. Linh vật ${newTier.displayName} (${newTier.tierName}) đã xuất hiện để đồng hành cùng bạn!`
      : `Tài sản ròng hiện tại là ${currentMascotData.netWorth.toLocaleString('vi-VN')} VND. Linh vật ${newTier.displayName} sẽ tiếp tục đồng hành cùng bạn.`;

    // 3.3. Gửi thông báo & phát realtime qua Socket
    await this.notificationsService.createNotification({
      userId,
      type: isLevelUp
        ? NotificationType.ASSET_TIER_UP
        : NotificationType.ASSET_TIER_DOWN,
      title,
      body,
      relatedEntityType: 'MASCOT_TIER',
      relatedEntityId: newTier.id,
    });

    this.logger.log(
      `Người dùng ${userId} đã tiến hóa mascot: ${previousTier?.displayName || 'N/A'} -> ${newTier.displayName} (isLevelUp: ${isLevelUp})`,
    );

    return {
      evolved: true,
      isLevelUp,
      netWorth: currentMascotData.netWorth,
      currentMascot: newTier,
      previousMascot: previousTier,
      message: isLevelUp
        ? `🎉 Chúc mừng bạn đã mở khóa linh vật ${newTier.displayName}!`
        : `Linh vật đồng hành của bạn hiện là ${newTier.displayName}`,
    };
  }

  /**
   * Cung cấp System Prompt tương ứng với linh vật và phong cách phản hồi cho AI Chatbot Engine
   */
  async getSystemPromptForUser(userId: string): Promise<string> {
    const currentMascot = await this.getCurrentUserMascot(userId);
    const basePrompt =
      currentMascot.mascot.systemPrompt ||
      `Bạn là ${currentMascot.mascot.displayName}, trợ lý tài chính thông minh của Finora.`;

    let toneDirective = '';
    switch (currentMascot.mascotTone) {
      case MascotTone.GENTLE:
        toneDirective =
          '\n\n[Phong cách phản hồi: GENTLE - Thấu cảm & Động viên]\n' +
          '- Tuyệt đối không dùng từ ngữ phán xét, hoảng loạn hay chì chiết người dùng về tiền bạc.\n' +
          '- Giữ giọng điệu ấm áp, đồng cảm, khích lệ người dùng rằng khó khăn tài chính chỉ là tạm thời.\n' +
          '- Tập trung hướng dẫn các bước tiết kiệm nhỏ, khả thi và dễ thực hiện nhất.';
        break;
      case MascotTone.ROAST:
        toneDirective =
          '\n\n[Phong cách phản hồi: ROAST - Trào phúng & Nghiêm khắc]\n' +
          '- Sử dụng phong cách nói thẳng, hài hước, châm biếm nhẹ nhàng kiểu Gen Z để người dùng tỉnh ngộ.\n' +
          '- Nhấn mạnh hậu quả của việc chi tiêu bốc đồng nhưng vẫn giữ tính xây dựng và có ích.';
        break;
      case MascotTone.BALANCED:
      default:
        toneDirective =
          '\n\n[Phong cách phản hồi: BALANCED - Cân bằng & Khách quan]\n' +
          '- Đưa ra nhận xét thực tế, số liệu cụ thể và lời khuyên tài chính logic, khoa học.\n' +
          '- Cân đối giữa việc nhắc nhở ngân sách và khen ngợi kỷ luật tài chính.';
        break;
    }

    return `${basePrompt}${toneDirective}`;
  }

  /**
   * Lắng nghe sự kiện thay đổi tài sản ròng (Net Worth Changed)
   * Tự động kiểm tra và thông báo tiến hóa / thoái hóa linh vật cho người dùng
   */
  @OnEvent(EVENT_NET_WORTH_CHANGED, { async: true })
  async handleNetWorthChanged(event: NetWorthChangedEvent): Promise<void> {
    try {
      this.logger.debug(
        `Received ${EVENT_NET_WORTH_CHANGED} for user ${event.userId} (source: ${event.source || 'unknown'})`,
      );
      await this.checkMascotEvolution(event.userId);
    } catch (error) {
      this.logger.error(
        `Error checking mascot evolution for user ${event.userId}:`,
        error,
      );
    }
  }
}
