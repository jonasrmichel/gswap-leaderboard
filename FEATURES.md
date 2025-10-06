# Features

## Core Features

### 🎯 Wallet Analysis
- **Portfolio Valuation**: Real-time portfolio value calculation
- **Trading Volume Estimation**: Intelligent volume estimation based on holdings
- **P&L Tracking**: Both dollar amount and percentage returns
- **Risk Assessment**: Automatic risk level classification (Low/Medium/High/Very High)
- **Diversification Score**: 0-10 score based on token variety
- **Trade Count Estimation**: Estimated number of trades executed

### 🏆 Leaderboard System
- **Multi-metric Ranking**: Sort by any performance metric
- **Real-time Updates**: Instant rank updates when adding wallets
- **Top 3 Medals**: Visual distinction for top performers (🥇🥈🥉)
- **Persistent Rankings**: Maintains position across page refreshes (session-based)

### 📊 Sorting Options
Users can rank wallets by:
1. **Trading Volume** - Total estimated trading volume in USD
2. **Portfolio Value** - Current total portfolio worth
3. **P&L ($)** - Absolute profit/loss in dollars
4. **P&L (%)** - Percentage return on investment
5. **Trade Count** - Number of estimated trades
6. **Diversification** - Portfolio diversification score
7. **Risk Level** - Risk classification (Low is best)

### 🎨 User Interface
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Interactive Headers**: Click column headers to sort
- **Dropdown Sorting**: Quick sort via dropdown menu
- **Color Coding**:
  - Green for positive P&L
  - Red for negative P&L
  - Risk levels color-coded by severity
- **Visual Feedback**: Hover states, active indicators
- **Clean Layout**: Professional gradient design

### 🔄 Bulk Operations
- **Bulk Import Script**: Import multiple wallets at once
- **Progress Tracking**: See import progress in real-time
- **Error Handling**: Graceful handling of failed imports
- **Summary Reports**: Detailed import statistics

## Technical Features

### 🔧 API Endpoints

#### `POST /api/analyze`
Analyze a single wallet without adding to leaderboard
```json
{
  "walletAddress": "eth|0x...",
  "startDate": "2025-09-22"
}
```

#### `GET /api/leaderboard?sortBy=<metric>`
Retrieve leaderboard with sorting
- Parameters: `volume`, `pnl`, `pnlPercent`, `value`, `trades`, `diversification`, `risk`

#### `POST /api/leaderboard`
Add wallet to leaderboard
```json
{
  "walletAddress": "eth|0x...",
  "startDate": "2025-09-22"
}
```

### 📦 Data Sources
- **GalaChain DEX API**: Wallet balances and holdings
- **CoinGecko API**: Real-time token prices
- **Calculated Metrics**: Volume, P&L, risk, diversification

### 🎯 Performance Metrics Calculation

#### Volume Estimation
Intelligent estimation based on:
- Current holdings
- Token type (GALA, GWETH, GUSDC, etc.)
- Trading patterns
- Residual amounts

#### Risk Calculation
Based on portfolio concentration:
- Top 3 holdings percentage
- Token distribution
- Position sizes

#### Diversification Score
Calculated from:
- Number of active tokens
- Value distribution
- Position balance

## Supported Wallet Formats
- `eth|0x...` - Ethereum-style addresses
- `client|...` - Client wallet addresses

## Browser Support
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers

## Performance
- Fast API responses (~1-3 seconds per wallet)
- Efficient in-memory storage
- Optimized rendering
- Minimal bundle size

## Future Enhancement Ideas

### Phase 2 - Persistent Storage
- [ ] Vercel KV integration for Redis storage
- [ ] Historical data tracking
- [ ] Performance over time charts
- [ ] Wallet comparison tools

### Phase 3 - Advanced Analytics
- [ ] Win rate calculation
- [ ] Best performing tokens
- [ ] Trading frequency analysis
- [ ] Portfolio allocation recommendations

### Phase 4 - Social Features
- [ ] User authentication
- [ ] Wallet claiming
- [ ] Comments and reactions
- [ ] Share leaderboard on social media
- [ ] Follow favorite traders

### Phase 5 - Real-time Updates
- [ ] WebSocket connections
- [ ] Live price updates
- [ ] Auto-refresh leaderboard
- [ ] Push notifications

### Phase 6 - Transaction Scraping
- [ ] Port Puppeteer scraping logic
- [ ] Detailed transaction history
- [ ] Actual trade data vs estimates
- [ ] Gas fee tracking

## Known Limitations

1. **Data Persistence**: Uses in-memory storage (resets on deployment)
2. **Transaction History**: Estimates only (no actual transaction scraping)
3. **Price Data**: Depends on CoinGecko API availability
4. **Rate Limits**: Subject to external API rate limits
5. **Analysis Accuracy**: Based on estimates and current holdings

## Security Considerations

- No wallet connections required
- Read-only API access
- No private key handling
- Public blockchain data only
- CORS-protected endpoints

## Accessibility

- Keyboard navigation support
- Screen reader compatible
- High contrast color scheme
- Responsive text sizing
- Clear visual hierarchy
