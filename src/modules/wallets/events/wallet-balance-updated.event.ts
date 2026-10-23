export const EVENT_WALLET_BALANCE_UPDATED = 'wallet.balance_updated';

export class WalletBalanceUpdatedEvent {
  constructor(
    public readonly walletId: string,
    public readonly accountId: string,
    public readonly transactionId: string,
    public readonly type: string,
    public readonly amount: number,
    public readonly actorId: string,
    public readonly accountBalanceAfter: number,
    public readonly categoryName?: string,
    public readonly note?: string,
    public readonly timestamp: string = new Date().toISOString(),
  ) {}
}
