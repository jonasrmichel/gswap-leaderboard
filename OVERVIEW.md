# GSwap Leaderboard - Complete Overview

## 🎯 Project Summary

A web application that ranks GSwap traders based on comprehensive performance metrics including trading volume, profit/loss, risk levels, and portfolio diversification.

## 🚀 Quick Links

- **Start Development**: `npm run dev`
- **Build for Production**: `npm run build`
- **Import Wallets**: `npm run import:local`
- **Documentation**:
  - [Quick Start Guide](./QUICKSTART.md) - Get started in 5 minutes
  - [Deployment Guide](./DEPLOYMENT.md) - Deploy to Vercel
  - [Features List](./FEATURES.md) - All features and capabilities
  - [Project Structure](./PROJECT_STRUCTURE.md) - Code organization

## 📊 What It Does

### For Users
1. **Add any GalaChain wallet address**
2. **Analyze trading performance** (volume, P&L, risk)
3. **Compare with other traders** on the leaderboard
4. **Sort by any metric** (volume, profit, diversification, etc.)
5. **Track performance** over time

### For Developers
- Clean SvelteKit architecture
- TypeScript type safety
- RESTful API endpoints
- Easy to extend and customize
- Ready for Vercel deployment

## 🎨 User Experience

### Visual Design
- **Modern gradient theme** (purple/blue)
- **Responsive layout** (mobile-first)
- **Interactive elements** (clickable headers, dropdowns)
- **Color-coded metrics** (green/red for P&L, risk levels)
- **Medal system** for top 3 (🥇🥈🥉)

### User Flow
```
1. User enters wallet address
   ↓
2. Click "Add Wallet" button
   ↓
3. System analyzes wallet (2-3 seconds)
   ↓
4. Wallet added to leaderboard with rank
   ↓
5. User can sort by different metrics
   ↓
6. Click column headers or use dropdown
```

## 🔧 Technical Stack

### Frontend
- **Framework**: SvelteKit (reactive, fast, small bundle)
- **Language**: TypeScript (type safety)
- **Styling**: CSS (no dependencies)
- **State**: Reactive Svelte stores

### Backend
- **Runtime**: Node.js on Vercel serverless
- **API**: SvelteKit server endpoints
- **Storage**: In-memory (upgradeable to database)
- **External APIs**:
  - GalaChain DEX API (wallet data)
  - CoinGecko API (token prices)

### Deployment
- **Platform**: Vercel (serverless, auto-scaling)
- **Adapter**: @sveltejs/adapter-vercel
- **Build**: Vite (fast, optimized)
- **CI/CD**: Automatic on git push

## 📈 Metrics Explained

### Trading Volume
**Estimated total value of tokens traded**
- Calculated from current holdings
- Considers token types and patterns
- Based on proven algorithms

### Portfolio Value
**Current total worth of all holdings**
- Real-time token prices
- Sum of all token values
- Updated on each analysis

### P&L (Profit & Loss)
**Investment performance**
- Dollar amount: Absolute gain/loss
- Percentage: Relative performance
- Estimated initial investment

### Risk Level
**Portfolio concentration risk**
- Low: Well-diversified
- Medium: Some concentration
- High: Heavy concentration
- Very High: Extreme concentration

### Diversification Score
**Token variety (0-10)**
- Higher is better
- Based on number of active tokens
- Considers position sizes

### Trade Count
**Estimated number of trades**
- Calculated from volume
- Average trade size assumptions
- Activity indicator

## 🎯 Ranking System

### How It Works
1. Wallets sorted by selected metric
2. Ranks assigned (1, 2, 3, etc.)
3. Top 3 get medal emojis
4. Re-ranked when new wallets added

### Sort Options
- **Volume** (default): Best for active traders
- **Portfolio Value**: Best for wealthy traders
- **P&L $**: Best absolute gainers
- **P&L %**: Best percentage gainers
- **Trades**: Most active traders
- **Diversification**: Best risk management
- **Risk**: Lowest risk traders

## 📦 Project Files

### Core Application
```
src/
├── lib/
│   ├── walletAnalyzer.ts     # Analysis logic
│   └── leaderboardStore.ts   # Data storage
├── routes/
│   ├── +page.svelte          # Main UI
│   └── api/                  # API endpoints
└── app.html                  # HTML template
```

### Configuration
```
├── package.json              # Dependencies
├── svelte.config.js         # SvelteKit config
├── vite.config.ts           # Build config
├── tsconfig.json            # TypeScript config
└── vercel.json              # Vercel config
```

### Documentation
```
├── README.md                # Overview
├── QUICKSTART.md            # Get started
├── DEPLOYMENT.md            # Deploy guide
├── FEATURES.md              # Feature list
├── PROJECT_STRUCTURE.md     # Architecture
└── SAMPLE_WALLETS.md        # Testing guide
```

### Utilities
```
├── wallets.txt              # Sample wallets
└── scripts/
    └── bulk-import.js       # Import script
```

## 🚀 Getting Started

### 1. Installation
```bash
npm install
```

### 2. Development
```bash
npm run dev
# Open http://localhost:5173
```

### 3. Add Wallets
- Enter wallet address (e.g., `eth|0x...`)
- Click "Add Wallet"
- Wait for analysis
- View on leaderboard

### 4. Bulk Import (Optional)
```bash
npm run import:local
```

### 5. Deploy
```bash
# Push to GitHub
git push

# Import in Vercel
# Auto-deploys on push
```

## 🎯 Use Cases

### For Traders
- **Track your performance** against others
- **Find top traders** to learn from
- **Monitor risk levels** and diversification
- **Compare strategies** via metrics

### For Communities
- **Community leaderboards** for competitions
- **Team rankings** for trading groups
- **Performance tracking** for guilds
- **Engagement tool** for communities

### For Researchers
- **Trading pattern analysis** from metrics
- **Risk distribution** studies
- **Volume analysis** across wallets
- **Performance correlations** research

## 🔐 Privacy & Security

### What We Collect
- Wallet addresses (public blockchain data)
- Analysis results (calculated metrics)
- Nothing private or sensitive

### What We Don't Collect
- Private keys (never needed)
- Personal information (no accounts)
- Transaction signing (read-only)
- Wallet connections (no Web3)

### Security Measures
- Read-only API access
- No authentication required
- Public data only
- CORS protection
- Rate limiting (planned)

## 🎓 Learning Resources

### Understanding the Code
1. Start with `/src/routes/+page.svelte` (UI)
2. Review `/src/lib/walletAnalyzer.ts` (logic)
3. Check `/src/lib/leaderboardStore.ts` (storage)
4. Explore `/src/routes/api/` (endpoints)

### SvelteKit Concepts
- [SvelteKit Docs](https://kit.svelte.dev)
- [Svelte Tutorial](https://svelte.dev/tutorial)
- [Vercel Deployment](https://vercel.com/docs)

### GalaChain Resources
- [GalaChain Docs](https://docs.gala.com)
- [GalaScan Explorer](https://galascan.gala.com)
- [GalaChain DEX](https://dex.gala.com)

## 🐛 Troubleshooting

### Common Issues

**"No balances found"**
- Check wallet address format
- Verify wallet has GalaChain assets
- Try different wallet

**"Failed to fetch"**
- Check internet connection
- GalaChain API might be down
- Try again in a few moments

**Build errors**
- Run `npm install` again
- Clear `.svelte-kit` folder
- Check Node.js version (18+)

**Import script fails**
- Ensure dev server is running
- Check wallet addresses format
- Review error messages

## 📞 Support & Feedback

### Getting Help
1. Check documentation files
2. Review error messages
3. Check browser console
4. Review server logs (Vercel)

### Contributing
- Fork the repository
- Create feature branch
- Make your changes
- Submit pull request

### Reporting Issues
- Describe the problem
- Include steps to reproduce
- Share error messages
- Mention environment (OS, browser)

## 🎉 Success Metrics

Your leaderboard is working when:
- ✅ Wallets analyze in 2-3 seconds
- ✅ Leaderboard updates immediately
- ✅ All sort options work
- ✅ Mobile layout looks good
- ✅ No console errors
- ✅ Rankings make sense

## 🚀 Next Steps

1. **Deploy to Vercel** - Get it live
2. **Import wallets** - Populate leaderboard
3. **Share with community** - Get feedback
4. **Add persistence** - Upgrade to database
5. **Enhance features** - Add more metrics
6. **Scale up** - Handle more users

## 🏆 Credits

- Based on [gswap-trader](https://github.com/jonasrmichel/gswap-trader) analysis script
- Built with [SvelteKit](https://kit.svelte.dev)
- Deployed on [Vercel](https://vercel.com)
- Powered by [GalaChain](https://gala.com)

---

**Ready to get started?** Run `npm run dev` and add your first wallet! 🚀
