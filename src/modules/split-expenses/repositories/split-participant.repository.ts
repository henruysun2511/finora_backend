import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { SplitParticipant } from '../entities/split-participant.entity';

@Injectable()
export class SplitParticipantRepository {
  constructor(
    @InjectRepository(SplitParticipant)
    private readonly repo: Repository<SplitParticipant>,
  ) {}

  create(data: Partial<SplitParticipant>): SplitParticipant {
    return this.repo.create(data);
  }

  save(
    participant: SplitParticipant,
    manager?: EntityManager,
  ): Promise<SplitParticipant> {
    if (manager) {
      return manager.save(SplitParticipant, participant);
    }
    return this.repo.save(participant);
  }

  saveMany(
    participants: SplitParticipant[],
    manager?: EntityManager,
  ): Promise<SplitParticipant[]> {
    if (manager) {
      return manager.save(SplitParticipant, participants);
    }
    return this.repo.save(participants);
  }

  findById(
    id: string,
    manager?: EntityManager,
  ): Promise<SplitParticipant | null> {
    const repository = manager ? manager.getRepository(SplitParticipant) : this.repo;
    return repository.findOne({
      where: { id },
      relations: ['user', 'split', 'loan'],
    });
  }

  findBySplitAndUser(
    splitId: string,
    userId: string,
    manager?: EntityManager,
  ): Promise<SplitParticipant | null> {
    const repository = manager ? manager.getRepository(SplitParticipant) : this.repo;
    return repository.findOne({
      where: { splitId, userId },
      relations: ['user', 'split', 'loan'],
    });
  }

  findBySplitId(
    splitId: string,
    manager?: EntityManager,
  ): Promise<SplitParticipant[]> {
    const repository = manager ? manager.getRepository(SplitParticipant) : this.repo;
    return repository.find({
      where: { splitId },
      relations: ['user', 'loan'],
      order: { createdAt: 'ASC' },
    });
  }

  async deleteBySplitId(
    splitId: string,
    manager?: EntityManager,
  ): Promise<void> {
    const repository = manager ? manager.getRepository(SplitParticipant) : this.repo;
    await repository.delete({ splitId });
  }
}
