# Hyperliquid Trading Function

Azure Function with TypeScript runtime for executing trades on Hyperliquid exchange.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure environment variables in `local.settings.json`:

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "HYPERLIQUID_PRIVATE_KEY": "your-private-key-here",
    "HYPERLIQUID_TESTNET": "true"
  }
}
```

3. Build the TypeScript code:

```bash
npm run build
```

4. Start the function locally:

```bash
npm start
```

## API Endpoint

### POST `/api/hyperliquidTrigger`

Execute a trade on Hyperliquid.

**Request Body:**

```json
{
  "pair": "BTCUSDT",
  "action": "BUY",
  "entry": 50000,
  "stopLoss": 49000,
  "orderId": "123456"
}
```

**Actions:**

- `BUY` / `LONG`: Open a long position
- `SELL` / `SHORT`: Open a short position
- `EXIT`: Close an existing position
- `UPDATE_STOP`: Update stop loss for an existing position

**Response:**

```json
{
  "message": "Hyperliquid trade processed successfully",
  "result": {
    "success": true,
    "timestamp": "2025-11-04T...",
    "tradeDetails": { ... }
  }
}
```

## Development

- `npm run build` - Compile TypeScript
- `npm run watch` - Watch mode for development
- `npm run clean` - Clean build artifacts
- `npm start` - Start the function app locally

## Deployment

Deploy to Azure:

```bash
func azure functionapp publish <your-function-app-name>
```

## TODO

- [ ] Integrate actual Hyperliquid SDK
- [ ] Add authentication
- [ ] Implement error handling and retry logic
- [ ] Add position size calculations
- [ ] Add trade history logging
