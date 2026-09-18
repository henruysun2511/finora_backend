import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Token } from '../entities/token.entity';
import { TokenType } from '../../../common/enums/token-type.enum';

@Injectable()
export class TokenRepository {
  constructor(
    @InjectRepository(Token)
    private readonly repo: Repository<Token>,
  ) {}

  async saveToken(
    userId: string,
    token: string,
    type: TokenType,
    expiresAt: Date,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<Token> {
    const newToken = this.repo.create({
      userId,
      token,
      type,
      expiresAt,
      userAgent,
      ipAddress,
      isRevoked: false,
    });
    return this.repo.save(newToken);
  }

  async findValidToken(
    userId: string,
    token: string,
    type: TokenType = TokenType.REFRESH_TOKEN,
  ): Promise<Token | null> {
    const qb = this.repo
      .createQueryBuilder('token')
      .where('token.userId = :userId', { userId })
      .andWhere('token.token = :token', { token })
      .andWhere('token.type = :type', { type })
      .andWhere('token.isRevoked = :isRevoked', { isRevoked: false })
      .andWhere('token.expiresAt > :now', { now: new Date() });

    return qb.getOne();
  }

  async revokeToken(userId: string, token: string): Promise<void> {
    await this.repo.update({ userId, token }, { isRevoked: true });
  }

  async revokeAllUserTokens(userId: string, type?: TokenType): Promise<void> {
    const where: Record<string, unknown> = { userId };
    if (type) where.type = type;
    await this.repo.update(where, { isRevoked: true });
  }
}
