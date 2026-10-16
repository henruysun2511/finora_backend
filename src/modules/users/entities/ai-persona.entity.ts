import { Entity, Column, Index, OneToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from './user.entity';
import { PersonalityType } from '../enums/personality-type.enum';

@Entity('ai_personas')
export class AiPersona extends BaseEntity {
  @Column({ name: 'user_id', type: 'uuid', unique: true })
  @Index('idx_ai_personas_user_id')
  userId: string;

  @OneToOne(() => User, (user) => user.persona, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    name: 'personality_type',
    type: 'enum',
    enum: PersonalityType,
    default: PersonalityType.NEUTRAL,
  })
  personalityType: PersonalityType;
}
