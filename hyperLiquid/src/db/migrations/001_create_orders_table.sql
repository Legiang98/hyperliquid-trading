CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_address TEXT NOT NULL,
    symbol TEXT NOT NULL,
    strategy TEXT NOT NULL,
    quantity NUMERIC NOT NULL,
    order_type TEXT NOT NULL,
    action TEXT NOT NULL,
    price NUMERIC NOT NULL,
    pnl NUMERIC,
    oid TEXT,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_symbol_strategy_status 
ON orders(symbol, strategy, status, action);

CREATE INDEX IF NOT EXISTS idx_orders_user_address 
ON orders(user_address);
