import { Injectable } from '@nestjs/common';
import { ExpenseSplit } from '../entities/expense-split.entity';
import { SplitParticipant } from '../entities/split-participant.entity';
import { SplitResponseDto } from '../dto/response/split-response.dto';
import { SplitParticipantResponseDto } from '../dto/response/split-participant-response.dto';

@Injectable()
export class SplitExpenseMapper {
  toParticipantResponse(
    participant: SplitParticipant,
  ): SplitParticipantResponseDto {
    return {
      id: participant.id,
      splitId: participant.splitId,
      userId: participant.userId,
      userName: participant.user?.fullName ?? undefined,
      userAvatar: participant.user?.avatar ?? undefined,
      assignedAmount: Number(participant.assignedAmount),
      proposedAmount:
        participant.proposedAmount !== null &&
        participant.proposedAmount !== undefined
          ? Number(participant.proposedAmount)
          : undefined,
      status: participant.status,
      note: participant.note ?? undefined,
      loanId: participant.loanId ?? undefined,
      isSettled: participant.isSettled,
      createdAt: participant.createdAt,
      updatedAt: participant.updatedAt,
    };
  }

  toSplitResponse(split: ExpenseSplit): SplitResponseDto {
    return {
      id: split.id,
      transactionId: split.transactionId,
      walletId: split.walletId,
      createdById: split.createdById,
      creatorName: split.createdBy?.fullName ?? undefined,
      totalAmount: Number(split.totalAmount),
      splitType: split.splitType,
      status: split.status,
      createdAt: split.createdAt,
      updatedAt: split.updatedAt,
      participants: (split.participants || []).map((p) =>
        this.toParticipantResponse(p),
      ),
    };
  }

  toSplitListResponse(splits: ExpenseSplit[]): SplitResponseDto[] {
    return splits.map((split) => this.toSplitResponse(split));
  }
}
