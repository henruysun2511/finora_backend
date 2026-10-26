import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository, DataSource } from 'typeorm';
import { AssetTier } from '../entities/asset-tier.entity';
import { Setting } from '../../settings/entities/setting.entity';
import { MascotTone } from '../enums/mascot-tone.enum';
import { MascotSensitivity } from '../enums/mascot-sensitivity.enum';

@Injectable()
export class MascotRepository {
  constructor(
    @InjectRepository(AssetTier)
    private readonly repo: Repository<AssetTier>,
    @InjectRepository(Setting)
    private readonly userSettingRepo: Repository<Setting>,
    private readonly dataSource: DataSource,
  ) {}

  create(entityLike: Partial<AssetTier>): AssetTier {
    return this.repo.create(entityLike);
  }

  async save(entity: AssetTier, manager?: EntityManager): Promise<AssetTier> {
    if (manager) {
      return manager.save(AssetTier, entity);
    }
    return this.repo.save(entity);
  }

  async findById(id: string): Promise<AssetTier | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findByTierName(tierName: string): Promise<AssetTier | null> {
    return this.repo.findOne({ where: { tierName } });
  }

  async findAll(): Promise<AssetTier[]> {
    return this.repo.find({
      order: { displayOrder: 'ASC' },
    });
  }

  async findActiveOnly(): Promise<AssetTier[]> {
    return this.repo.find({
      where: { isActive: true },
      order: { displayOrder: 'ASC' },
    });
  }

  async findTierByNetWorth(netWorth: number): Promise<AssetTier | null> {
    return this.repo
      .createQueryBuilder('tier')
      .where('tier.isActive = :isActive', { isActive: true })
      .andWhere('tier.minNetWorth <= :netWorth', { netWorth })
      .andWhere('(tier.maxNetWorth > :netWorth OR tier.maxNetWorth IS NULL)', {
        netWorth,
      })
      .orderBy('tier.displayOrder', 'ASC')
      .getOne();
  }

  async count(): Promise<number> {
    return this.repo.count();
  }

  async countActive(): Promise<number> {
    return this.repo.count({ where: { isActive: true } });
  }

  async softDelete(id: string): Promise<void> {
    await this.repo.softDelete(id);
  }

  /**
   * Tính tổng số dư tài khoản của các ví thuộc quyền sở hữu (OWNER) của người dùng
   */
  async getUserTotalWalletBalance(userId: string): Promise<number> {
    const result = await this.dataSource.query(
      `
      SELECT COALESCE(SUM(a.balance), 0) AS total_balance
      FROM accounts a
      INNER JOIN wallets w ON a.wallet_id = w.id
      INNER JOIN wallet_members wm ON wm.wallet_id = w.id
      WHERE wm.user_id = $1 
        AND LOWER(wm.role::text) = 'owner' 
        AND a.deleted_at IS NULL 
        AND w.deleted_at IS NULL
      `,
      [userId],
    );
    return Number(result[0]?.total_balance || 0);
  }

  /**
   * Tính tổng dư nợ đang vay (BORROWED chưa hoàn tất thanh toán) của người dùng
   */
  async getUserTotalBorrowedDebt(userId: string): Promise<number> {
    const result = await this.dataSource.query(
      `
      SELECT COALESCE(SUM(remaining_amount), 0) AS total_debt
      FROM loans
      WHERE created_by = $1 
        AND type = 'BORROWED' 
        AND status != 'SETTLED' 
        AND deleted_at IS NULL
      `,
      [userId],
    );
    return Number(result[0]?.total_debt || 0);
  }

  /**
   * Lấy cờ cài đặt bật/tắt hiển thị linh vật của người dùng
   */
  async getUserShowMascotPreference(userId: string): Promise<boolean> {
    const setting = await this.userSettingRepo.findOne({
      where: { userId },
      select: ['showMascot'],
    });
    return setting?.showMascot ?? true;
  }

  /**
   * Lấy cấu hình đầy đủ về linh vật (hiển thị, giọng điệu, độ nhạy) của người dùng
   */
  async getUserMascotSettings(userId: string): Promise<{
    showMascot: boolean;
    mascotTone: MascotTone;
    mascotSensitivity: MascotSensitivity;
    currentMascotTierId: string | null;
  }> {
    const setting = await this.userSettingRepo.findOne({
      where: { userId },
      select: [
        'showMascot',
        'mascotTone',
        'mascotSensitivity',
        'currentMascotTierId',
      ],
    });
    return {
      showMascot: setting?.showMascot ?? true,
      mascotTone: setting?.mascotTone ?? MascotTone.BALANCED,
      mascotSensitivity:
        setting?.mascotSensitivity ?? MascotSensitivity.ANOMALIES_ONLY,
      currentMascotTierId: setting?.currentMascotTierId || null,
    };
  }

  /**
   * Lấy ID linh vật gần nhất mà người dùng đang sở hữu
   */
  async getUserCurrentMascotTierId(userId: string): Promise<string | null> {
    const setting = await this.userSettingRepo.findOne({
      where: { userId },
      select: ['currentMascotTierId'],
    });
    return setting?.currentMascotTierId || null;
  }

  /**
   * Cập nhật ID linh vật hiện tại trong cài đặt người dùng
   */
  async updateUserCurrentMascotTierId(
    userId: string,
    tierId: string,
  ): Promise<void> {
    await this.userSettingRepo.update(
      { userId },
      { currentMascotTierId: tierId },
    );
  }
}
