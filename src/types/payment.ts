export interface PaymentOptions {
  bank: boolean;
  qpay: boolean;
  demo: boolean;
  wire: boolean;
}

export interface SubscriptionPlan {
  id: string;
  code: string;
  name: string;
  priceMnt: number;
  durationDays: number;
}

export type PaymentStatus =
  'PENDING' | 'PROCESSING' | 'SUCCESSFUL' | 'FAILED' | 'CANCELLED' | 'REFUNDED';

export interface Payment {
  txnId: string;
  userId: string;
  planId: string;
  amountMnt: number;
  provider: string;
  status: PaymentStatus;
}
