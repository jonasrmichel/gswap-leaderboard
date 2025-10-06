# Quick Start Guide

Get your GSwap leaderboard up and running in minutes!

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm run dev

# 3. Open in browser
# Visit http://localhost:5173
```

## 📝 How to Use

### Add a Wallet to the Leaderboard

1. Enter a GalaChain wallet address (format: `eth|0x...`)
2. Click "Add Wallet"
3. Wait for analysis (takes a few seconds)
4. Wallet appears in leaderboard with ranking

### View Leaderboard

- **By Volume**: See top traders by trading volume (default)
- **By P&L %**: See most profitable traders
- **By Portfolio Value**: See wealthiest traders

### Sample Wallet Format

```
eth|Ce74B68cd1e9786F4BD3b9f7152D6151695A0bA5
```

## 📊 Metrics Explained

| Metric | Description |
|--------|-------------|
| **Rank** | Position on leaderboard (🥇🥈🥉) |
| **Portfolio Value** | Current total value of holdings |
| **Trading Volume** | Estimated total value traded |
| **P&L %** | Profit/Loss percentage |
| **Trades** | Estimated number of trades |
| **Risk** | Risk level (Low/Medium/High/Very High) |
| **Diversification** | Score based on token variety (0-10) |

## 🛠️ Development

### Available Scripts

```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run check        # Type check
npm run check:watch  # Type check with watch mode
```

### Project Structure

```
src/
├── lib/
│   ├── walletAnalyzer.ts     # Core analysis logic
│   └── leaderboardStore.ts   # Data storage
├── routes/
│   ├── +page.svelte          # Main UI
│   └── api/                  # API endpoints
└── app.html                  # HTML template
```

## 🌐 API Usage

### Analyze a Wallet

```bash
curl -X POST http://localhost:5173/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"walletAddress": "eth|0x..."}'
```

### Get Leaderboard

```bash
# By volume (default)
curl http://localhost:5173/api/leaderboard?sortBy=volume

# By P&L
curl http://localhost:5173/api/leaderboard?sortBy=pnl

# By portfolio value
curl http://localhost:5173/api/leaderboard?sortBy=value
```

### Add to Leaderboard

```bash
curl -X POST http://localhost:5173/api/leaderboard \
  -H "Content-Type: application/json" \
  -d '{"walletAddress": "eth|0x..."}'
```

## 🚢 Deploy to Vercel

### Option 1: GitHub (Recommended)

1. Push to GitHub:
   ```bash
   git add .
   git commit -m "Initial commit"
   git push
   ```

2. Go to [vercel.com](https://vercel.com) and import your repo

3. Deploy automatically!

### Option 2: Vercel CLI

```bash
npm install -g vercel
vercel login
vercel
```

Your app will be live at `https://your-project.vercel.app`

## 🔧 Configuration

### Change Default Start Date

Edit `src/routes/api/analyze/+server.ts`:
```typescript
const start = startDate ? new Date(startDate) : new Date('2025-09-22');
```

### Customize Styling

Edit `src/routes/+page.svelte` in the `<style>` section.

## 📚 Documentation

- **[README.md](./README.md)** - Project overview
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Detailed deployment guide
- **[PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)** - Architecture details
- **[SAMPLE_WALLETS.md](./SAMPLE_WALLETS.md)** - Testing guide

## ⚠️ Important Notes

### Data Storage

- Currently uses **in-memory storage**
- Data resets on server restart
- For production, upgrade to database (see [DEPLOYMENT.md](./DEPLOYMENT.md))

### Rate Limits

- CoinGecko API: Free tier limits apply
- GalaChain API: No known limits
- Consider adding caching for production

### Transaction Scraping

- Original script used Puppeteer for transaction scraping
- Not included in this version (serverless limitations)
- Can be added as separate service if needed

## 🐛 Troubleshooting

### Port Already in Use

```bash
# Kill process on port 5173
lsof -ti:5173 | xargs kill -9

# Or use a different port
npm run dev -- --port 3000
```

### Build Errors

```bash
# Clean and reinstall
rm -rf node_modules .svelte-kit
npm install
npm run build
```

### API Errors

- Check console for error messages
- Verify wallet address format
- Ensure internet connection for external APIs

## 💡 Tips

1. **Test Locally First**: Always test with `npm run dev` before deploying
2. **Use Real Wallets**: The app fetches real data, so use active GalaChain wallets
3. **Add Multiple Wallets**: The leaderboard is more interesting with several entries
4. **Check Logs**: Monitor browser console and terminal for errors
5. **Update Dependencies**: Run `npm update` periodically

## 🎯 Next Steps

- [ ] Deploy to Vercel
- [ ] Add more wallet addresses
- [ ] Customize the UI
- [ ] Add persistent storage
- [ ] Share with the community!

## 📞 Support

- Check documentation files in this repo
- Review [SvelteKit docs](https://kit.svelte.dev/docs)
- Review [Vercel docs](https://vercel.com/docs)

Happy trading! 🚀
