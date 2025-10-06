# Sample Wallets for Testing

Here are some example wallet addresses you can use to test the leaderboard:

## Format

Wallet addresses should be in the format: `eth|0x...` or similar GalaChain format.

Example:
```
eth|Ce74B68cd1e9786F4BD3b9f7152D6151695A0bA5
```

## How to Use

1. Start the development server: `npm run dev`
2. Open http://localhost:5173
3. Enter a wallet address in the input field
4. Click "Add Wallet" to analyze and add it to the leaderboard
5. The wallet will be ranked based on:
   - Trading volume (default)
   - P&L percentage
   - Portfolio value

## Testing Multiple Wallets

Add multiple wallet addresses to see how they compare on the leaderboard. The rankings update automatically as you add more wallets.

## Notes

- Wallet analysis requires active GalaChain wallet addresses
- The app fetches real-time data from GalaChain DEX API
- Token prices are fetched from CoinGecko
- Analysis may take a few seconds depending on wallet activity
