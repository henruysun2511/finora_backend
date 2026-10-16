import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';

@Entity('audit_logs')
export class AuditLog extends BaseEntity {
  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  @Index('idx_audit_logs_user_id')
  userId?: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ length: 100 })
  @Index('idx_audit_logs_action')
  action: string;

  @Column({ name: 'entity_type', length: 100 })
  @Index('idx_audit_logs_entity_type')
  entityType: string;

  @Column({ name: 'entity_id', type: 'uuid', nullable: true })
  @Index('idx_audit_logs_entity_id')
  entityId?: string;

  @Column({ name: 'ip_address', length: 45, nullable: true })
  ipAddress?: string;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent?: string;

  @Column({ name: 'old_value', type: 'jsonb', nullable: true })
  oldValue?: Record<string, any>;

  @Column({ name: 'new_value', type: 'jsonb', nullable: true })
  newValue?: Record<string, any>;
}
