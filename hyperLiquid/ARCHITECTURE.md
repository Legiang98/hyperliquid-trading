# HyperLiquid Trading Webhook Architecture

## Overview

Modular Azure Function that processes trading webhooks and executes orders on HyperLiquid exchange.

## Flow Diagram

```
Webhook Alert
     │
     ▼
┌─────────────────────────────────────────────────────────────┐
│  hyperLiquidWebhook (Main Function)                         │
└─────────────────────────────────────────────────────────────┘
     │
     ├──► 1. parseWebhook(payload)
     │      └─► Extract: symbol, side, price, signal, stopLoss
     │
     ├──► 2. validateSignal(signal)
     │      └─► Check: valid symbol, no duplicates, position exists
     │
     ├──► 3. Decision: signal type?
     │      │
     │      ├─► "entry"
     │      │    ├─► buildOrder(signal)
     │      │    │    └─► Calculate size from fixed USD amount
     │      │    └─► executeOrder(orderRequest, signal)
     │      │         └─► Place order on HyperLiquid
     │      │
     │      ├─► "exit"
     │      │    └─► executeOrder(null, signal)
     │      │         └─► Close position on HyperLiquid
     │      │
     │      └─► "update_stop"
     │           └─► [TODO] Update stop loss
     │
     └──► 5. logTrade(signal, result)
          └─► Log to: Console, App Insights, Telegram
```

## Files Structure

```
src/
├── functions/
│   └── hyperLiquidWebhook.ts    # Main orchestrator
├── services/
│   ├── parseWebhook.ts          # Parse incoming payload
│   ├── validateSignal.ts        # Validate trading signal
│   ├── buildOrder.ts            # Build order with size calculation
│   ├── executeOrder.ts          # Execute on HyperLiquid
│   └── logTrade.ts              # Log trades
└── types/
    └── index.ts                 # TypeScript interfaces
```

## Signal Types

### Entry Signal

```json
{
  "pair": "BTCUSDT",
  "action": "BUY",
  "entry": 50000,
  "stopLoss": 49000
}
```

### Exit Signal

```json
{
  "pair": "BTCUSDT",
  "action": "EXIT",
  "position": "LONG",
  "reason": "stop_loss"
}
```

### Update Stop Signal

```json
{
  "pair": "BTCUSDT",
  "action": "UPDATE_STOP",
  "position": "LONG",
  "stopLoss": 51000,
  "reason": "trailing"
}
```

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `HYPERLIQUID_PRIVATE_KEY` | Trading wallet private key | `0x...` |
| `HYPERLIQUID_TESTNET` | Use testnet | `true` / `false` |
| `FIXED_USD_AMOUNT` | Fixed USD per trade | `5` |

## Response Format

### Success

```json
{
  "success": true,
  "message": "Order placed successfully",
  "signal": {
    "symbol": "BTC",
    "side": "buy",
    "type": "entry"
  },
  "orderId": "...",
  "timestamp": "2025-11-06T..."
}
```

### Skip

```json
{
  "success": true,
  "skipped": true,
  "reason": "Duplicate order detected"
}
```

### Error

```json
{
  "success": false,
  "error": "Internal server error",
  "message": "...",
  "timestamp": "2025-11-06T..."
}
```

## Extensibility

Each service is modular and can be extended independently:

- **parseWebhook**: Add new webhook formats
- **validateSignal**: Add risk checks, balance checks
- **buildOrder**: Add dynamic position sizing, leverage
- **executeOrder**: Add stop loss orders, take profit
- **logTrade**: Add Telegram, Discord, database logging

## TODO

- [ ] Implement stop loss order placement
- [ ] Add position check to prevent duplicates
- [ ] Implement stop loss update (update_stop signal)
- [ ] Add Application Insights integration
- [ ] Add Telegram notifications
- [ ] Add risk management checks
- [ ] Add position sizing strategies
