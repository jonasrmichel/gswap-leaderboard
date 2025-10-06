<div align="center">

<img src="static/logo.svg" alt="GSwap Trading Leaderboard" width="800"/>

<br/>
<br/>

**Track and rank the best GSwap traders**

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen?style=for-the-badge)](https://gswap-leaderboard.vercel.app)
[![Built with SvelteKit](https://img.shields.io/badge/SvelteKit-FF3E00?style=for-the-badge&logo=svelte&logoColor=white)](https://kit.svelte.dev)
[![Powered by GalaChain](https://img.shields.io/badge/GalaChain-6B46C1?style=for-the-badge)](https://gala.com)

</div>

---

## ✨ Overview

A real-time web application that analyzes and ranks GalaChain wallet performance based on trading volume, profit/loss, risk levels, and portfolio diversification. Built with modern web technologies for speed and scalability.

## 🎯 Features

- **📊 Real-time Analysis** - Live wallet analysis with streaming progress updates
- **🏆 Dynamic Rankings** - Sort by volume, P&L, risk, diversification, and more
- **📱 Responsive Design** - Beautiful on desktop, tablet, and mobile
- **⚡ Fast & Modern** - Built with SvelteKit and deployed on Vercel
- **🔄 Auto-refresh** - Keep your leaderboard up-to-date with configurable start dates
- **🎨 Dark Theme** - Sleek, modern interface with purple/pink gradients

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/jonasrmichel/gswap-leaderboard.git
cd gswap-leaderboard

# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:5173
```

The app will automatically load 54 default wallets and display them on the leaderboard.

## 📊 Metrics Explained

| Metric | Description |
|--------|-------------|
| **Portfolio Value** | Current total worth of all holdings at real-time prices |
| **Trading Volume** | Estimated total value of tokens traded over time |
| **P&L ($)** | Absolute profit/loss in dollar amount |
| **P&L (%)** | Relative profit/loss as a percentage |
| **Trade Count** | Estimated number of trades executed |
| **Risk Level** | Portfolio concentration risk (Low/Medium/High/Very High) |
| **Diversification** | Token variety score from 0-10 |

## 🛠️ Tech Stack

- **Frontend**: SvelteKit + TypeScript
- **Styling**: Custom CSS with modern gradients
- **Backend**: SvelteKit API routes with SSE
- **APIs**: GalaChain DEX API, CoinGecko API
- **Deployment**: Vercel (serverless)

## 📖 Usage

### Add a Wallet

1. Enter a wallet address (format: `eth|0x...` or `client|...`)
2. Click "Add Wallet"
3. Wait 2-3 seconds for analysis
4. View the wallet's rank on the leaderboard

### Change Analysis Date

1. Select a new start date from the date picker
2. Click "Apply to All" to reanalyze all wallets
3. Watch the progress bar advance in real-time
4. View updated rankings

### Sort by Different Metrics

- Click any column header to sort by that metric
- Or use the dropdown menu in the header
- Current sort column is highlighted

## 🔧 Development

### Project Structure

```
src/
├── lib/
│   ├── walletAnalyzer.ts       # Core analysis logic
│   ├── leaderboardStore.ts     # In-memory data store
│   └── defaultWallets.ts       # Default wallet list
├── routes/
│   ├── +page.svelte            # Main UI component
│   └── api/
│       ├── leaderboard/        # CRUD endpoints
│       ├── init/               # Standard initialization
│       └── init-stream/        # SSE initialization
└── app.html                    # HTML template
```

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run check        # Type-check the project
npm run import:local # Bulk import wallets to local dev server
```

## 🌐 Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import project in Vercel
3. Deploy with default settings
4. Auto-deploys on every push

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/jonasrmichel/gswap-leaderboard)

## 🔐 Privacy & Security

- **Read-only**: Only reads public blockchain data
- **No authentication**: No user accounts or login required
- **No private keys**: Never requests or stores private keys
- **Public data**: All data is publicly available on GalaChain

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- Built with [SvelteKit](https://kit.svelte.dev)
- Deployed on [Vercel](https://vercel.com)
- Powered by [GalaChain](https://gala.com)
- Based on [gswap-trader](https://github.com/jonasrmichel/gswap-trader) analysis script

## 📞 Support

Need help? Check out these resources:

- [Documentation](./OVERVIEW.md)
- [Quick Start Guide](./QUICKSTART.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Project Structure](./PROJECT_STRUCTURE.md)

---

<div align="center">

**Made with ❤️ for the GalaChain community**

[Report Bug](https://github.com/jonasrmichel/gswap-leaderboard/issues) · [Request Feature](https://github.com/jonasrmichel/gswap-leaderboard/issues)

</div>
