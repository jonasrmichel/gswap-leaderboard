import fetch from 'node-fetch';
import { clickhouseService } from './clickhouseService';

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
	endDate: Date;
	providedTokenPrices?: { [key: string]: number };
	data: {
		balances: WalletBalance;
		prices: TokenPrice;
		transactions: TransactionData[];
		statistics: Partial<WalletStatistics>;
	};

	constructor(walletAddress: string, startDate: Date, endDate?: Date, tokenPrices?: { [key: string]: number }) {
		this.walletAddress = walletAddress;
		this.startDate = startDate;
		this.endDate = endDate || new Date();
		this.providedTokenPrices = tokenPrices;
		this.data = {
			balances: {},
			prices: {},
			transactions: [],
			statistics: {}
		};
	}

	async fetchTokenPrices(): Promise<void> {
		// If prices were provided, use them directly
		if (this.providedTokenPrices) {
			this.data.prices = this.providedTokenPrices;
			return;
		}
		
		// Otherwise fetch from CoinGecko
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
				console.log(`[WalletAnalyzer] Token prices fetched:`, this.data.prices);
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
			console.log(`[WalletAnalyzer] Using default token prices due to error:`, error);
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

		// Retry logic with minimal delay
		const maxRetries = 3; // Reduce retries since we're using ClickHouse
		let retryDelay = 100; // Start with 100ms instead of 2 seconds

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
							console.log(`[WalletAnalyzer] Fetched ${tokens.length} token balances for ${this.walletAddress}`);
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

					// Retry with minimal delay
					if (attempt < maxRetries - 1) {
						await new Promise((resolve) => setTimeout(resolve, retryDelay));
						retryDelay = Math.min(retryDelay * 1.5, 500); // Gentler backoff, max 500ms
					}
				} catch (error) {
					lastError = error instanceof Error ? error.message : String(error);
					console.error(
						`[WalletAnalyzer] Failed to fetch from ${endpoint.name} for ${this.walletAddress} (attempt ${attempt + 1}/${maxRetries}):`,
						error
					);
					if (attempt < maxRetries - 1) {
						await new Promise((resolve) => setTimeout(resolve, retryDelay));
						retryDelay = Math.min(retryDelay * 1.5, 500); // Gentler backoff, max 500ms
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
			// Try ClickHouse first if configured
			if (clickhouseService.isConfigured()) {
				try {
					console.log(`[WalletAnalyzer] Fetching transactions from ClickHouse for ${this.walletAddress}`);
					const transactions = await clickhouseService.fetchTransactions(
						this.walletAddress,
						this.startDate,
						this.endDate
					);

					// Convert ClickHouse transactions to our TransactionData format
					// Filter for swap transactions and convert the data structure
					this.data.transactions = transactions
						.filter(tx => {
							// Check if this is a swap transaction
							// ClickHouse uses different field names
							return tx.action_args_method_name === 'DexV3Contract:BatchSubmit:Swap';
						})
						.map(tx => {
							// Extract token from collection or token_id
							// token_id format is like "GALA|Unit|none|none"
							const token = tx.collection || tx.token_id?.split('|')[0] || '';
							
							// Calculate age from created_at
							const createdDate = new Date(tx.created_at);
							const ageInDays = Math.floor((Date.now() - createdDate.getTime()) / 86400000);
							
							return {
								hash: tx.transaction_id,
								method: tx.action_args_method_name,
								from: tx.from_wallet,
								to: tx.to_wallet,
								age: `${ageInDays} days`,
								token: token,
								amount: tx.quantity?.toString() || '0',
								fee: tx.fee || '0',
								type: 'swap',
								timestamp: tx.created_at
							};
						});

					console.log(`[WalletAnalyzer] Successfully fetched ${this.data.transactions.length} swap transactions from ClickHouse`);
					return;
				} catch (clickhouseError) {
					// Silently fall back to GalaScan for auth failures (already logged by ClickHouse service)
					if (!(clickhouseError instanceof Error && clickhouseError.message.includes('401'))) {
						console.error('[WalletAnalyzer] ClickHouse query failed, falling back to GalaScan:', clickhouseError);
					}
				}
			} else {
				console.log('[WalletAnalyzer] ClickHouse not configured, using GalaScan API');
			}

			// Fallback to GalaScan API
			console.log(`[WalletAnalyzer] Fetching transactions from GalaScan for ${this.walletAddress}`);
			const response = await fetch(
				`https://galascan.gala.com/api/all-transactions/${this.walletAddress}`
			);

			if (response.ok) {
				const transactions = (await response.json()) as GalaScanTransaction[];

				// Filter transactions by date range and only include swaps
				const filteredTransactions = transactions.filter((tx) => {
					const txDate = new Date(tx.CreatedAt);
					return (
						txDate >= this.startDate &&
						txDate <= this.endDate &&
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

				console.log(`[WalletAnalyzer] Fetched ${this.data.transactions.length} transactions from GalaScan`);
			} else {
				console.warn(`[WalletAnalyzer] GalaScan API returned status ${response.status}`);
				this.data.transactions = [];
			}
		} catch (error) {
			console.error('[WalletAnalyzer] Failed to fetch transactions:', error);
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

			if (value > 0) {
				console.log(`[WalletAnalyzer] ${this.walletAddress} - ${token}: ${quantity} @ $${price} = $${value}`);
			}

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
		const tokenVolumes: { [token: string]: number } = {};
		const walletLower = this.walletAddress.toLowerCase();

		// Group transactions by hash to handle swap pairs
		const txByHash: { [hash: string]: TransactionData[] } = {};
		for (const tx of this.data.transactions) {
			if (tx.type === 'swap') {
				if (!txByHash[tx.hash]) {
					txByHash[tx.hash] = [];
				}
				txByHash[tx.hash].push(tx);
			}
		}

		// Process each unique swap (by transaction hash)
		for (const [hash, txPair] of Object.entries(txByHash)) {
			// For each swap, calculate the value of what was traded
			// We'll use the outgoing transaction (FROM wallet) as the volume
			for (const tx of txPair) {
				const amount = parseFloat(tx.amount);
				const token = tx.token;
				const fromLower = tx.from.toLowerCase();
				
				// Only count outgoing from our wallet (what we traded away)
				if (!isNaN(amount) && amount > 0 && fromLower === walletLower) {
					if (!tokenVolumes[token]) {
						tokenVolumes[token] = 0;
					}
					tokenVolumes[token] += amount;
					// Only count once per hash - break after finding our outgoing tx
					break;
				}
			}
		}

		// Calculate total volume in USD
		// This represents one side of all swaps (what was traded away)
		// To get total trading volume, we could multiply by 2, but single-sided is more conservative
		for (const [token, volume] of Object.entries(tokenVolumes)) {
			const price = this.data.prices[token] || 0;
			const volumeValue = volume * price;
			totalVolumeMoved += volumeValue;
		}

		// Create volume data for display
		const volumeDataArray: VolumeData[] = [];
		for (const holding of holdings) {
			const volume = tokenVolumes[holding.token] || 0;
			const volumeValue = volume * holding.price;

			volumeDataArray.push({
				token: holding.token,
				currentHolding: holding.quantity,
				estimatedVolume: volume,
				volumeValue,
				calculationMethod: volume > 0 ? 'Real Transaction Data' : 'No Transactions'
			});
		}

		// Calculate metrics from real transactions
		// We already grouped transactions by hash, so count unique hashes for number of trades
		const estimatedTrades = Object.keys(txByHash).length;
		const avgTradeSize = estimatedTrades > 0 ? totalVolumeMoved / estimatedTrades : 0;

		// P&L Calculation - More conservative approach
		// Without historical prices, we can only estimate based on current data
		
		// Calculate the net cost basis (approximation)
		// Look at the first few transactions to estimate initial investment
		let estimatedInitialValue = 0;
		const uniqueTokens = new Set<string>();
		
		// Count unique tokens traded
		for (const tx of this.data.transactions) {
			if (tx.type === 'swap' && tx.token) {
				uniqueTokens.add(tx.token);
			}
		}
		
		// Estimate initial value as a percentage of current value
		// This is a conservative estimate assuming some profit/loss
		// If wallet has high volume relative to holdings, they're likely profitable
		const volumeToValueRatio = totalValue > 0 ? totalVolumeMoved / totalValue : 0;
		
		if (volumeToValueRatio > 10) {
			// High volume relative to holdings suggests active trading with profits
			estimatedInitialValue = totalValue * 0.8; // Assume 25% profit
		} else if (volumeToValueRatio > 5) {
			// Moderate volume
			estimatedInitialValue = totalValue * 0.9; // Assume 11% profit
		} else {
			// Low volume, holdings are mostly from initial investment
			estimatedInitialValue = totalValue * 0.95; // Assume 5% profit
		}
		
		// Calculate P&L
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
			volumeData: volumeDataArray,
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

		// Don't throw error for empty balances, just log and continue with 0 values
		if (Object.keys(this.data.balances).length === 0) {
			console.log(`[WalletAnalyzer] No balances found for ${this.walletAddress}, continuing with empty portfolio`);
			// Don't throw - let it calculate statistics with empty balances
		}

		return this.calculateStatistics();
	}
}

export async function analyzeWallet(
	walletAddress: string,
	startDate: Date,
	endDate?: Date,
	tokenPrices?: { [key: string]: number }
): Promise<WalletStatistics> {
	const analyzer = new WalletAnalyzer(walletAddress, startDate, endDate, tokenPrices);
	return await analyzer.analyze();
}
