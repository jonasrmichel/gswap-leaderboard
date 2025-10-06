# Project Structure

```
gswap-leaderboard/
├── src/
│   ├── lib/
│   │   ├── walletAnalyzer.ts      # Core wallet analysis logic (from original script)
│   │   └── leaderboardStore.ts    # In-memory leaderboard storage
│   ├── routes/
│   │   ├── +page.svelte           # Main leaderboard UI
│   │   └── api/
│   │       ├── analyze/
│   │       │   └── +server.ts     # Endpoint to analyze a single wallet
│   │       └── leaderboard/
│   │           └── +server.ts     # Endpoints for leaderboard CRUD
│   └── app.html                   # HTML template
├── static/                        # Static assets (favicon, images, etc.)
├── .svelte-kit/                   # SvelteKit build artifacts (auto-generated)
├── node_modules/                  # Dependencies
├── svelte.config.js               # SvelteKit configuration
├── vite.config.ts                 # Vite configuration
├── tsconfig.json                  # TypeScript configuration
├── package.json                   # Project dependencies and scripts
├── vercel.json                    # Vercel deployment configuration
├── .gitignore                     # Git ignore rules
├── README.md                      # Project overview
├── DEPLOYMENT.md                  # Deployment instructions
├── SAMPLE_WALLETS.md              # Testing guide
└── PROJECT_STRUCTURE.md           # This file
```

## Key Files Explained

### Core Logic

- **`src/lib/walletAnalyzer.ts`**
  - Ports the analysis logic from `analyze-wallet-transactions.js`
  - Fetches token prices from CoinGecko
  - Fetches wallet balances from GalaChain DEX API
  - Calculates trading statistics and metrics
  - Returns structured data for leaderboard ranking

- **`src/lib/leaderboardStore.ts`**
  - In-memory storage for leaderboard entries
  - Provides sorting by volume, P&L, or portfolio value
  - Can be upgraded to persistent storage (database)

### API Routes

- **`src/routes/api/analyze/+server.ts`**
  - POST endpoint to analyze a wallet
  - Returns full statistics without storing to leaderboard
  - Used for one-off wallet analysis

- **`src/routes/api/leaderboard/+server.ts`**
  - GET endpoint to retrieve leaderboard
  - POST endpoint to add/update wallet in leaderboard
  - Supports sorting query parameter

### Frontend

- **`src/routes/+page.svelte`**
  - Main UI component
  - Form to add wallets
  - Leaderboard table with sorting
  - Responsive design with gradient styling
  - Real-time updates

### Configuration

- **`svelte.config.js`**
  - Configures Vercel adapter
  - Sets up preprocessing

- **`vite.config.ts`**
  - Vite build configuration

- **`tsconfig.json`**
  - TypeScript compiler options

- **`vercel.json`**
  - Vercel deployment settings
  - Build and install commands

## Data Flow

1. **User adds wallet address** → Frontend form
2. **POST to `/api/leaderboard`** → API endpoint
3. **`analyzeWallet()` called** → Wallet analyzer
4. **Fetch external data**:
   - Token prices from CoinGecko
   - Wallet balances from GalaChain DEX API
5. **Calculate statistics** → Metrics computed
6. **Store in leaderboard** → In-memory store
7. **Return updated leaderboard** → Frontend
8. **Re-render table** → UI updates

## Technology Stack

| Layer | Technology |
|-------|------------|
| Framework | SvelteKit |
| Language | TypeScript |
| Styling | CSS (built-in) |
| API | SvelteKit endpoints |
| Storage | In-memory (upgradeable) |
| External APIs | GalaChain DEX, CoinGecko |
| Deployment | Vercel |
| Build Tool | Vite |

## Extending the Project

### Add Authentication
- Add session management
- Protect wallet submission
- User-specific dashboards

### Add Persistent Storage
- Upgrade to Vercel KV, Postgres, or MongoDB
- Add data migration scripts
- Implement caching strategy

### Add Transaction Scraping
- Port the Puppeteer scraping logic
- Consider serverless limitations
- Use external scraping service

### Add More Metrics
- Win rate calculation
- Token-specific performance
- Historical charts
- Comparative analysis

### Add Real-time Updates
- WebSocket connections
- Server-sent events
- Auto-refresh leaderboard

### Add Social Features
- Share leaderboard
- Wallet profiles
- Comments and reactions
- Follow traders
