# ClickHouse Configuration

This application can use ClickHouse for querying historical transaction data instead of the unreliable GalaScan API.

## Current Status

⚠️ **Note**: The provided ClickHouse credentials appear to be invalid (returning 401 Unauthorized). The application will automatically fall back to GalaScan API when ClickHouse authentication fails.

## Setup

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Add your ClickHouse credentials to the `.env` file:
```
CLICKHOUSE_KEY_ID=your_key_id_here
CLICKHOUSE_KEY_SECRET=your_key_secret_here
CLICKHOUSE_QUERY_ID=71d43d53-b7da-407b-a5db-267a365802b1
```

3. Verify your credentials are correct:
```bash
node scripts/test-clickhouse.js
```

## How It Works

When ClickHouse credentials are configured:
1. The app will first try to fetch transaction data from ClickHouse
2. If ClickHouse fails or is not configured, it falls back to GalaScan API
3. ClickHouse provides more reliable and faster access to historical data

## Query Parameters

The ClickHouse query accepts the following parameters:
- `param_wallet_id`: The wallet address to query
- `param_start_dt`: Start date in YYYY-MM-DD format
- `param_end_dt`: End date in YYYY-MM-DD format  
- `param_txid`: Transaction ID (optional)

## Testing

You can test the ClickHouse connection manually:
```bash
curl -H "Content-Type: application/json" \
  -s --user '<key_id>:<key_secret>' \
  'https://queries.clickhouse.cloud/run/71d43d53-b7da-407b-a5db-267a365802b1?format=JSONEachRow&param_wallet_id=<wallet>&param_start_dt=2025-09-24&param_end_dt=2025-10-06&param_txid='
```