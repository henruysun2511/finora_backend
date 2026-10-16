import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from './user.entity';

@Entity('ai_personas')
export class AiPersona extends BaseEntity {
  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId: string;

  @ManyToOne(() => User, (user) => user.aiPersonas, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ length: 100 })
  name: string;

  @Column({ name: 'tone_description', type: 'text', nullable: true })
  toneDescription?: string;

  @Column({ name: 'system_prompt_snippet', type: 'text', nullable: true })
  systemPromptSnippet?: string;

  @Column({ name: 'is_active', default: false })
  isActive: boolean;
}
