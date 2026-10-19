import { Injectable } from '@nestjs/common';
import { Loan } from '../entities/loan.entity';
import { LoanPayment } from '../entities/loan-payment.entity';
import { CreateLoanDto } from '../dto/request/create-loan.dto';
import { LoanResponseDto } from '../dto/response/loan-response.dto';
import {
  LoanDetailResponseDto,
  RecentPaymentDto,
} from '../dto/response/loan-detail-response.dto';
import { LoanPaymentResponseDto } from '../dto/response/loan-payment-response.dto';
import { LoanStatus } from '../enums/loan-status.enum';

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const round1 = (n: number) => Math.round((n + Number.EPSILON) * 10) / 10;

@Injectable()
export class LoanMapper {
  toEntity(
    dto: CreateLoanDto,
    userId: string,
    initialStatus: LoanStatus,
  ): Partial<Loan> {
    return {
      walletId: dto.walletId,
      accountId: dto.accountId,
      createdBy: userId,
      counterpartyUserId: dto.counterpartyUserId ?? null,
      type: dto.type,
      contactName: dto.contactName,
      contactInfo: dto.contactInfo ?? null,
      principalAmount: round2(dto.principalAmount),
      remainingAmount: round2(dto.principalAmount),
      isInterestBearing: dto.isInterestBearing ?? false,
      interestRate: dto.interestRate ?? null,
      interestPeriod: dto.interestPeriod ?? null,
      currency: dto.currency ?? 'VND',
      note: dto.note ?? null,
      loanDate: dto.loanDate ? new Date(dto.loanDate) : new Date(),
      dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      status: initialStatus,
      affectsBalance: dto.affectsBalance ?? true,
    };
  }

  toResponse(loan: Loan): LoanResponseDto {
    const principal = Number(loan.principalAmount);
    const remaining = Number(loan.remainingAmount);
    const paidAmount = round2(Math.max(0, principal - remaining));
    const progressPercentage =
      principal > 0 ? round1((paidAmount / principal) * 100) : 0;

    return {
      id: loan.id,
      type: loan.type,
      contactName: loan.contactName,
      principalAmount: principal,
      remainingAmount: remaining,
      paidAmount,
      progressPercentage,
      currency: loan.currency,
      dueDate: loan.dueDate ? new Date(loan.dueDate).toISOString() : null,
      status: loan.status,
    };
  }

  toResponseList(loans: Loan[]): LoanResponseDto[] {
    return loans.map((loan) => this.toResponse(loan));
  }

  toDetailResponse(
    loan: Loan,
    accountNameFallback?: string,
  ): LoanDetailResponseDto {
    const principal = Number(loan.principalAmount);
    const remaining = Number(loan.remainingAmount);
    const paidAmount = round2(Math.max(0, principal - remaining));
    const progressPercentage =
      principal > 0 ? round1((paidAmount / principal) * 100) : 0;

    const resolvedAccountName =
      loan.account?.name ?? accountNameFallback ?? 'Tài khoản liên kết';

    const recentPayments: RecentPaymentDto[] = (loan.payments ?? [])
      .slice(0, 5)
      .map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        paymentDate: new Date(p.paymentDate).toISOString(),
        accountName: p.account?.name ?? resolvedAccountName,
        note: p.note ?? null,
      }));

    return {
      id: loan.id,
      walletId: loan.walletId,
      accountId: loan.accountId,
      accountName: resolvedAccountName,
      type: loan.type,
      contactName: loan.contactName,
      contactInfo: loan.contactInfo ?? null,
      counterpartyUserId: loan.counterpartyUserId ?? null,
      principalAmount: principal,
      remainingAmount: remaining,
      paidAmount,
      progressPercentage,
      currency: loan.currency,
      loanDate: new Date(loan.loanDate).toISOString(),
      dueDate: loan.dueDate ? new Date(loan.dueDate).toISOString() : null,
      status: loan.status,
      note: loan.note ?? null,
      isInterestBearing: loan.isInterestBearing,
      interestRate:
        loan.interestRate !== null && loan.interestRate !== undefined
          ? Number(loan.interestRate)
          : null,
      interestPeriod: loan.interestPeriod ?? null,
      affectsBalance: loan.affectsBalance,
      createdAt: new Date(loan.createdAt).toISOString(),
      updatedAt: new Date(loan.updatedAt).toISOString(),
      recentPayments,
    };
  }

  toPaymentResponse(
    payment: LoanPayment,
    currencyFallback = 'VND',
  ): LoanPaymentResponseDto {
    return {
      id: payment.id,
      loanId: payment.loanId,
      accountId: payment.accountId,
      accountName: payment.account?.name ?? 'Tài khoản thanh toán',
      accountIcon: payment.account?.icon ?? null,
      amount: Number(payment.amount),
      currency: payment.account?.currency ?? currencyFallback,
      paymentDate: new Date(payment.paymentDate).toISOString(),
      affectsBalance: payment.affectsBalance,
      note: payment.note ?? null,
      createdAt: new Date(payment.createdAt).toISOString(),
    };
  }

  toPaymentResponseList(
    payments: LoanPayment[],
    currencyFallback = 'VND',
  ): LoanPaymentResponseDto[] {
    return payments.map((p) => this.toPaymentResponse(p, currencyFallback));
  }
}
