import fetch from 'node-fetch';

export interface TokenPrice {
	[key: string]: number;
}

export interface WalletBalance {
	[token: string]: number;
}

export interface TransactionData {
	hash: string;
	method: string;
	from: string;
	to: string;
	age: string;
	token: string;
	amount: string;
	fee: string;
	type?: string;
	tokenIn?: string;
	tokenOut?: string;
	amountIn?: number;
	amountOut?: number;
	timestamp?: string;
}

export interface VolumeData {
	token: string;
	currentHolding: number;
	estimatedVolume: number;
	volumeValue: number;
	calculationMethod: string;
}

export interface WalletStatistics {
	totalValue: number;
	holdings: Array<{
		token: string;
		quantity: number;
		price: number;
		value: number;
		percentage: number;
	}>;
	estimatedInitialValue: number;
	pnl: number;
	pnlPercent: number;
	largestPosition: string;
	concentration: number;
	riskLevel: string;
	diversificationScore: number;
	activeTokens: number;
	volumeData: VolumeData[];
	totalVolumeMoved: number;
	estimatedTrades: number;
	avgTradeSize: number;
	volumeToPortfolioRatio: number;
}

export interface LeaderboardEntry {
	walletAddress: string;
	rank: number;
	totalValue: number;
	totalVolume: number;
	pnl: number;
	pnlPercent: number;
	estimatedTrades: number;
	riskLevel: string;
	diversificationScore: number;
	lastUpdated: string;
}

export class WalletAnalyzer {
	walletAddress: string;
	startDate: Date;
	data: {
		balances: WalletBalance;
		prices: TokenPrice;
		transactions: TransactionData[];
		statistics: Partial<WalletStatistics>;
	};

	constructor(walletAddress: string, startDate: Date) {
		this.walletAddress = walletAddress;
		this.startDate = startDate;
		this.data = {
			balances: {},
			prices: {},
			transactions: [],
			statistics: {}
		};
	}

	async fetchTokenPrices(): Promise<void> {
		try {
			const response = await fetch(
				'https://api.coingecko.com/api/v3/simple/price?ids=gala,ethereum,usd-coin,tether&vs_currencies=usd'
			);

			if (response.ok) {
				const prices = await response.json() as any;
				this.data.prices = {
					GALA: prices.gala?.usd || 0.015,
					GWETH: prices.ethereum?.usd || 4000,
					ETH: prices.ethereum?.usd || 4000,
					GUSDC: prices['usd-coin']?.usd || 1,
					USDC: prices['usd-coin']?.usd || 1,
					GUSDT: prices.tether?.usd || 1,
					USDT: prices.tether?.usd || 1
				};
			}
		} catch (error) {
			// Use default prices
			this.data.prices = {
				GALA: 0.015,
				GWETH: 4000,
				GUSDC: 1,
				GUSDT: 1
			};
		}
	}

	async fetchWalletBalances(): Promise<void> {
		const encodedAddress = encodeURIComponent(this.walletAddress);
		const endpoints = [
			{
				name: 'GalaChain DEX API',
				url: `https://dex-backend-prod1.defi.gala.com/user/assets?address=${encodedAddress}&page=1&limit=20`
			}
		];

		// Retry logic with exponential backoff
		const maxRetries = 3;
		let retryDelay = 1000; // Start with 1 second

		for (const endpoint of endpoints) {
			for (let attempt = 0; attempt < maxRetries; attempt++) {
				try {
					const response = await fetch(endpoint.url, {
						headers: {
							Accept: 'application/json',
							'User-Agent': 'Mozilla/5.0'
						}
					});

					if (response.ok) {
						const result = (await response.json()) as any;

						let tokens = [];
						if (result.data?.token) {
							tokens = Array.isArray(result.data.token) ? result.data.token : [result.data.token];
						} else if (result.data?.tokens) {
							tokens = Array.isArray(result.data.tokens)
								? result.data.tokens
								: [result.data.tokens];
						} else if (result.tokens) {
							tokens = Array.isArray(result.tokens) ? result.tokens : [result.tokens];
						}

						if (tokens.length > 0) {
							for (const token of tokens) {
								const symbol = token.symbol || token.token;
								const quantity = parseFloat(token.quantity || token.balance || '0');
								this.data.balances[symbol] = quantity;
							}
							return; // Success, exit retry loop
						}
					}

					// If response wasn't ok or no tokens, retry
					if (attempt < maxRetries - 1) {
						await new Promise((resolve) => setTimeout(resolve, retryDelay));
						retryDelay *= 2; // Exponential backoff
					}
				} catch (error) {
					console.error(`Failed to fetch from ${endpoint.name} (attempt ${attempt + 1}):`, error);
					if (attempt < maxRetries - 1) {
						await new Promise((resolve) => setTimeout(resolve, retryDelay));
						retryDelay *= 2; // Exponential backoff
					}
				}
			}
		}
	}

	calculateStatistics(): WalletStatistics {
		let totalValue = 0;
		let holdings: Array<{
			token: string;
			quantity: number;
			price: number;
			value: number;
			percentage: number;
		}> = [];

		for (const [token, quantity] of Object.entries(this.data.balances)) {
			const price = this.data.prices[token] || 0;
			const value = quantity * price;
			totalValue += value;

			holdings.push({
				token,
				quantity,
				price,
				value,
				percentage: 0
			});
		}

		// Calculate percentages
		holdings.forEach((h) => {
			h.percentage = totalValue > 0 ? (h.value / totalValue) * 100 : 0;
		});

		// Sort by value
		holdings.sort((a, b) => b.value - a.value);

		// Calculate volume estimates
		let totalVolumeMoved = 0;
		const volumeData: VolumeData[] = [];

		for (const holding of holdings) {
			let estimatedVolume = 0;
			let calculationMethod = '';

			if (holding.token === 'GALA') {
				const avgTradeSize = holding.quantity * 0.15;
				const estimatedTrades = 8;
				estimatedVolume = avgTradeSize * estimatedTrades;
				calculationMethod = 'Trading';
			} else if (holding.token === 'GWETH' || holding.token === 'GUSDC') {
				if (holding.quantity < 0.001) {
					estimatedVolume = holding.quantity * 100;
					calculationMethod = 'Residual';
				} else {
					estimatedVolume = holding.quantity * 5;
					calculationMethod = 'Trading';
				}
			} else if (holding.token === 'GUSDT') {
				estimatedVolume = holding.quantity * 4;
				calculationMethod = 'Stable';
			} else {
				estimatedVolume = holding.quantity * 2;
				calculationMethod = 'Default';
			}

			const volumeValue = estimatedVolume * holding.price;
			totalVolumeMoved += volumeValue;

			volumeData.push({
				token: holding.token,
				currentHolding: holding.quantity,
				estimatedVolume,
				volumeValue,
				calculationMethod
			});
		}

		// Calculate metrics
		const estimatedTrades = Math.floor(totalVolumeMoved / 50);
		const avgTradeSize = estimatedTrades > 0 ? totalVolumeMoved / estimatedTrades : 0;

		const galaHolding = holdings.find((h) => h.token === 'GALA');
		const estimatedInitialGala = galaHolding ? galaHolding.quantity * 1.1 : 0;
		const estimatedInitialValue = estimatedInitialGala * (this.data.prices.GALA || 0.015);

		const pnl = totalValue - estimatedInitialValue;
		const pnlPercent = estimatedInitialValue > 0 ? (pnl / estimatedInitialValue) * 100 : 0;

		const largestPosition = holdings[0];
		const top3Value = holdings.slice(0, 3).reduce((sum, h) => sum + h.value, 0);
		const concentration = totalValue > 0 ? (top3Value / totalValue) * 100 : 0;

		let riskLevel = 'Low';
		if (concentration > 90) riskLevel = 'Very High';
		else if (concentration > 75) riskLevel = 'High';
		else if (concentration > 50) riskLevel = 'Medium';

		const activeTokens = holdings.filter((h) => h.value > 1).length;
		const diversificationScore = Math.min(10, activeTokens * 2.5);

		const statistics: WalletStatistics = {
			totalValue,
			holdings,
			estimatedInitialValue,
			pnl,
			pnlPercent,
			largestPosition: largestPosition?.token || '',
			concentration,
			riskLevel,
			diversificationScore,
			activeTokens,
			volumeData,
			totalVolumeMoved,
			estimatedTrades,
			avgTradeSize,
			volumeToPortfolioRatio: totalValue > 0 ? totalVolumeMoved / totalValue : 0
		};

		this.data.statistics = statistics;
		return statistics;
	}

	async analyze(): Promise<WalletStatistics> {
		await this.fetchTokenPrices();
		await this.fetchWalletBalances();

		if (Object.keys(this.data.balances).length === 0) {
			throw new Error('No balances found for wallet');
		}

		return this.calculateStatistics();
	}
}

export async function analyzeWallet(
	walletAddress: string,
	startDate: Date
): Promise<WalletStatistics> {
	const analyzer = new WalletAnalyzer(walletAddress, startDate);
	return await analyzer.analyze();
}
