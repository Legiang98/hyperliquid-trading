export interface OrderRecord {
  id: string;
  user_address: string;
  symbol: string;
  strategy: string;
  quantity: number;
  order_type: string;
  action: string;
  price: number;
  pnl: number | null;
  oid: string | null;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export interface NewOrder {
  user_address: string;
  symbol: string;
  strategy: string;
  quantity: number;
  order_type: string;
  action: string;
  price: number | string; // Can be number from webhook or string from formatPrice
  oid?: string;
  status: string;
}
