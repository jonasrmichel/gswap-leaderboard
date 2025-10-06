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

export interface GalaScanTransaction {
	TransactionHash: string;
	Method: string;
	Channel: string;
	Block: string;
	SecondsAgo: number;
	CreatedAt: string;
	FromWallet: string;
	ToWallet: string;
	Amount: string; // Format: "quantity:token"
	token_path: string;
	Fee: string;
	is_nft: number;
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
				'https://api.coingecko.com/api/v3/simple/price?ids=gala,ethereum,bitcoin,usd-coin,tether&vs_currencies=usd'
			);

			if (response.ok) {
				const prices = await response.json() as any;
				this.data.prices = {
					GALA: prices.gala?.usd || 0.015,
					GWETH: prices.ethereum?.usd || 4000,
					ETH: prices.ethereum?.usd || 4000,
					GWBTC: prices.bitcoin?.usd || 95000,
					BTC: prices.bitcoin?.usd || 95000,
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
				GWBTC: 95000,
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
		const maxRetries = 5;
		let retryDelay = 2000; // Start with 2 seconds

		for (const endpoint of endpoints) {
			let lastError: string | null = null;

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
						} else {
							// Empty response - treat as error requiring retry
							lastError = 'API returned empty token list';
							console.log(
								`[WalletAnalyzer] Empty response from ${endpoint.name} for ${this.walletAddress} (attempt ${attempt + 1}/${maxRetries})`
							);
						}
					} else {
						lastError = `HTTP ${response.status}`;
						console.log(
							`[WalletAnalyzer] HTTP ${response.status} from ${endpoint.name} for ${this.walletAddress} (attempt ${attempt + 1}/${maxRetries})`
						);
					}

					// Retry with exponential backoff
					if (attempt < maxRetries - 1) {
						await new Promise((resolve) => setTimeout(resolve, retryDelay));
						retryDelay *= 2; // Exponential backoff
					}
				} catch (error) {
					lastError = error instanceof Error ? error.message : String(error);
					console.error(
						`[WalletAnalyzer] Failed to fetch from ${endpoint.name} for ${this.walletAddress} (attempt ${attempt + 1}/${maxRetries}):`,
						error
					);
					if (attempt < maxRetries - 1) {
						await new Promise((resolve) => setTimeout(resolve, retryDelay));
						retryDelay *= 2; // Exponential backoff
					}
				}
			}

			// If we exhausted all retries without getting data, log warning but don't throw
			// This allows the wallet to be processed with zero balances
			if (lastError) {
				console.warn(
					`[WalletAnalyzer] Failed to fetch balances for ${this.walletAddress} after ${maxRetries} attempts: ${lastError}`
				);
			}
		}
	}

	async fetchTransactions(): Promise<void> {
		try {
			const response = await fetch(
				`https://galascan.gala.com/api/all-transactions/${this.walletAddress}`
			);

			if (response.ok) {
				const transactions = (await response.json()) as GalaScanTransaction[];

				// Filter transactions by start date and only include swaps
				const filteredTransactions = transactions.filter((tx) => {
					const txDate = new Date(tx.CreatedAt);
					return (
						txDate >= this.startDate &&
						tx.Method === 'DexV3Contract:BatchSubmit:Swap' &&
						tx.is_nft === 0
					);
				});

				// Convert to our TransactionData format
				this.data.transactions = filteredTransactions.map((tx) => {
					const [amount, token] = tx.Amount.split(':');
					return {
						hash: tx.TransactionHash,
						method: tx.Method,
						from: tx.FromWallet,
						to: tx.ToWallet,
						age: `${Math.floor(tx.SecondsAgo / 86400)} days`,
						token,
						amount,
						fee: tx.Fee,
						type: 'swap',
						timestamp: tx.CreatedAt
					};
				});
			}
		} catch (error) {
			console.error('Failed to fetch transactions from GalaScan:', error);
			this.data.transactions = [];
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

		// Calculate real volume from transactions
		let totalVolumeMoved = 0;
		const volumeData: VolumeData[] = [];
		const tokenVolumes: { [token: string]: number } = {};

		// Calculate volume from actual swap transactions
		for (const tx of this.data.transactions) {
			const amount = parseFloat(tx.amount);
			const token = tx.token;

			if (!isNaN(amount) && amount > 0) {
				if (!tokenVolumes[token]) {
					tokenVolumes[token] = 0;
				}
				tokenVolumes[token] += amount;
			}
		}

		// Create volume data for each holding
		for (const holding of holdings) {
			const volume = tokenVolumes[holding.token] || 0;
			const volumeValue = volume * holding.price;
			totalVolumeMoved += volumeValue;

			volumeData.push({
				token: holding.token,
				currentHolding: holding.quantity,
				estimatedVolume: volume,
				volumeValue,
				calculationMethod: volume > 0 ? 'Real Transaction Data' : 'No Transactions'
			});
		}

		// Calculate metrics from real transactions
		const swapTransactions = this.data.transactions.filter((tx) => tx.type === 'swap');
		// Each swap typically has 2 transaction records (tokenIn and tokenOut), so divide by 2
		const estimatedTrades = Math.floor(swapTransactions.length / 2);
		const avgTradeSize = estimatedTrades > 0 ? totalVolumeMoved / estimatedTrades : 0;

		// Calculate real initial portfolio value from transaction history
		// Net flow = received - sent for each token
		const netFlow: { [token: string]: number } = {};
		const walletLower = this.walletAddress.toLowerCase();

		for (const tx of this.data.transactions) {
			const amount = parseFloat(tx.amount);
			const token = tx.token;

			if (!isNaN(amount) && amount > 0) {
				if (!netFlow[token]) {
					netFlow[token] = 0;
				}

				const fromLower = tx.from.toLowerCase();
				const toLower = tx.to.toLowerCase();

				if (toLower === walletLower) {
					netFlow[token] += amount; // Received
				} else if (fromLower === walletLower) {
					netFlow[token] -= amount; // Sent
				}
			}
		}

		// Calculate initial holdings: current holdings - net flow = initial holdings
		// If net flow is positive (received more), we had less initially
		// If net flow is negative (sent more), we had more initially
		let estimatedInitialValue = 0;
		for (const holding of holdings) {
			const currentHolding = holding.quantity;
			const flow = netFlow[holding.token] || 0;
			const initialHolding = currentHolding - flow;

			if (initialHolding > 0) {
				estimatedInitialValue += initialHolding * holding.price;
			}
		}

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
		await this.fetchTransactions();

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
