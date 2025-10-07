import fetch from 'node-fetch';

export interface ClickHouseTransaction {
	TransactionHash: string;
	Method: string;
	Channel: string;
	Block: string;
	SecondsAgo: number;
	CreatedAt: string;
	FromWallet: string;
	ToWallet: string;
	Amount: string;
	token_path: string;
	Fee: string;
	is_nft: number;
}

export class ClickHouseService {
	private keyId: string;
	private keySecret: string;
	private queryId: string;
	private baseUrl: string = 'https://queries.clickhouse.cloud/run';
	private authFailureLogged: boolean = false;

	constructor() {
		this.keyId = process.env.CLICKHOUSE_KEY_ID || '';
		this.keySecret = process.env.CLICKHOUSE_KEY_SECRET || '';
		this.queryId = process.env.CLICKHOUSE_QUERY_ID || '71d43d53-b7da-407b-a5db-267a365802b1';
	}

	isConfigured(): boolean {
		return !!(this.keyId && this.keySecret);
	}

	async fetchTransactions(
		walletAddress: string,
		startDate: Date,
		endDate?: Date
	): Promise<ClickHouseTransaction[]> {
		if (!this.isConfigured()) {
			throw new Error('ClickHouse credentials not configured');
		}

		const startDateStr = startDate.toISOString().split('T')[0];
		const endDateStr = (endDate || new Date()).toISOString().split('T')[0];

		// Build the query URL with parameters
		const params = new URLSearchParams({
			format: 'JSONEachRow',
			param_wallet_id: walletAddress,
			param_start_dt: startDateStr,
			param_end_dt: endDateStr,
			param_txid: ''
		});

		const url = `${this.baseUrl}/${this.queryId}?${params.toString()}`;

		try {
			const response = await fetch(url, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					Authorization: 'Basic ' + Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64')
				}
			});

			if (!response.ok) {
				const errorText = await response.text();
				
				// Log more details for debugging
				if (response.status === 401) {
					if (!this.authFailureLogged) {
						console.error(`[ClickHouse] Authentication failed (401). Please verify your credentials in .env file.`);
						console.error(`[ClickHouse] Key ID: ${this.keyId.substring(0, 8)}...`);
						console.error(`[ClickHouse] Falling back to GalaScan API for all subsequent requests.`);
						this.authFailureLogged = true;
					}
				} else {
					console.error(`[ClickHouse] Query failed: ${response.status} - ${errorText}`);
				}
				
				throw new Error(`ClickHouse query failed with status ${response.status}: ${errorText}`);
			}

			const text = await response.text();
			
			// Handle empty response
			if (!text || text.trim() === '') {
				return [];
			}

			// Parse JSONEachRow format (newline-delimited JSON)
			const transactions: ClickHouseTransaction[] = [];
			const lines = text.trim().split('\n');
			
			for (const line of lines) {
				if (line.trim()) {
					try {
						const tx = JSON.parse(line);
						transactions.push(tx);
					} catch (parseError) {
						console.warn('Failed to parse transaction line:', line, parseError);
					}
				}
			}

			return transactions;
		} catch (error) {
			console.error('ClickHouse service error:', error);
			throw error;
		}
	}

	async testConnection(): Promise<boolean> {
		if (!this.isConfigured()) {
			console.log('ClickHouse not configured');
			return false;
		}

		try {
			// Test with a minimal query - fetch 1 transaction for any wallet
			const testDate = new Date();
			testDate.setDate(testDate.getDate() - 1);
			
			const params = new URLSearchParams({
				format: 'JSONEachRow',
				param_wallet_id: '0x0000000000000000000000000000000000000000',
				param_start_dt: testDate.toISOString().split('T')[0],
				param_end_dt: new Date().toISOString().split('T')[0],
				param_txid: ''
			});

			const url = `${this.baseUrl}/${this.queryId}?${params.toString()}`;

			const response = await fetch(url, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					Authorization: 'Basic ' + Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64')
				}
			});

			if (response.ok) {
				console.log('ClickHouse connection successful');
				return true;
			} else {
				const errorText = await response.text();
				console.error(`ClickHouse connection test failed: ${response.status} - ${errorText}`);
				return false;
			}
		} catch (error) {
			console.error('ClickHouse connection test error:', error);
			return false;
		}
	}
}

// Singleton instance
export const clickhouseService = new ClickHouseService();