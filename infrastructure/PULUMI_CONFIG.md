# Pulumi Configuration Example

This file documents the required configuration values for the infrastructure deployment.

## Required Secrets

Set these using `pulumi config set --secret <key> <value>`:

```bash
# PostgreSQL Admin Password
pulumi config set --secret postgres-admin-password <your-strong-password>

# HyperLiquid Private Key
pulumi config set --secret hyperliquid-private-key <your-private-key>

# Telegram Bot Token
pulumi config set --secret telegram_bot_token <your-bot-token>

# Telegram Chat ID
pulumi config set --secret telegram_chat_id <your-chat-id>
```

## Optional Configuration

Set these using `pulumi config set <key> <value>`:

```bash
# PostgreSQL Admin Username (default: hypeadmin)
pulumi config set postgres-admin-username hypeadmin

# HyperLiquid Settings
pulumi config set hyperliquid-testnet true
pulumi config set hyperliquid-user-address 0x...

# Order Configuration
pulumi config set fix-stoploss 5

# Optional: Local IP for PostgreSQL access during development
pulumi config set local-ip <your-ip-address>
```

## PostgreSQL Configuration

The infrastructure creates:
- **Server**: Azure Database for PostgreSQL Flexible Server (v16)
- **SKU**: Standard_B1ms (Burstable tier - cost-effective)
- **Storage**: 32 GB
- **Database**: `hyperliquid`
- **Firewall**: Allows Azure services by default

### Connection String Format

```
postgresql://<username>:<password>@<server>.postgres.database.azure.com:5432/hyperliquid?sslmode=require
```

## Deployment

```bash
cd infrastructure
npm install
pulumi up
```

## Outputs

After deployment, you'll get:
- `postgresServerFqdn`: Fully qualified domain name of PostgreSQL server
- `postgresConnectionString`: Full connection string for applications
- `hyperliquidFunctionAppUrl`: URL of the deployed function app
