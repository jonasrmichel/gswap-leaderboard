import type { LeaderboardEntry, WalletStatistics } from './walletAnalyzer';

// In-memory store for leaderboard data
// In production, this would be replaced with a database
class LeaderboardStore {
	private entries: Map<string, LeaderboardEntry> = new Map();
	private cacheTimestamp: Date | null = null;
	private cacheStartDate: string | null = null;
	private isPrecomputing: boolean = false;

	addOrUpdateEntry(walletAddress: string, statistics: WalletStatistics): void {
		const entry: LeaderboardEntry = {
			walletAddress,
			rank: 0, // Will be calculated when getting leaderboard
			totalValue: statistics.totalValue,
			totalVolume: statistics.totalVolumeMoved,
			pnl: statistics.pnl,
			pnlPercent: statistics.pnlPercent,
			estimatedTrades: statistics.estimatedTrades,
			riskLevel: statistics.riskLevel,
			diversificationScore: statistics.diversificationScore,
			lastUpdated: new Date().toISOString()
		};

		console.log(`[LeaderboardStore] Adding entry for ${walletAddress}: value=$${statistics.totalValue.toFixed(2)}, volume=$${statistics.totalVolumeMoved.toFixed(2)}`);
		this.entries.set(walletAddress, entry);
	}

	getLeaderboard(
		sortBy:
			| 'volume'
			| 'pnl'
			| 'pnlPercent'
			| 'value'
			| 'trades'
			| 'diversification'
			| 'risk' = 'volume'
	): LeaderboardEntry[] {
		const entries = Array.from(this.entries.values());

		// Sort entries based on criteria
		entries.sort((a, b) => {
			switch (sortBy) {
				case 'volume':
					return b.totalVolume - a.totalVolume;
				case 'pnl':
					return b.pnl - a.pnl;
				case 'pnlPercent':
					return b.pnlPercent - a.pnlPercent;
				case 'value':
					return b.totalValue - a.totalValue;
				case 'trades':
					return b.estimatedTrades - a.estimatedTrades;
				case 'diversification':
					return b.diversificationScore - a.diversificationScore;
				case 'risk':
					// Risk level: Low < Medium < High < Very High (lower is better)
					const riskOrder = { Low: 0, Medium: 1, High: 2, 'Very High': 3 };
					const aRisk = riskOrder[a.riskLevel as keyof typeof riskOrder] ?? 4;
					const bRisk = riskOrder[b.riskLevel as keyof typeof riskOrder] ?? 4;
					return aRisk - bRisk;
				default:
					return b.totalVolume - a.totalVolume;
			}
		});

		// Assign ranks
		entries.forEach((entry, index) => {
			entry.rank = index + 1;
		});

		return entries;
	}

	getEntry(walletAddress: string): LeaderboardEntry | undefined {
		return this.entries.get(walletAddress);
	}

	getAllEntries(): LeaderboardEntry[] {
		return Array.from(this.entries.values());
	}

	clear(): void {
		this.entries.clear();
	}

	size(): number {
		return this.entries.size;
	}

	setCacheMetadata(startDate: string): void {
		this.cacheTimestamp = new Date();
		this.cacheStartDate = startDate;
	}

	getCacheMetadata(): { timestamp: Date | null; startDate: string | null; age: number | null } {
		return {
			timestamp: this.cacheTimestamp,
			startDate: this.cacheStartDate,
			age: this.cacheTimestamp ? Date.now() - this.cacheTimestamp.getTime() : null
		};
	}

	isCacheValid(startDate: string, maxAgeMs: number = 3600000): boolean {
		// Cache is valid if:
		// 1. Cache exists (has entries)
		// 2. Start date matches
		// 3. Cache age is within maxAge (default 1 hour)
		if (this.entries.size === 0 || !this.cacheTimestamp || !this.cacheStartDate) {
			return false;
		}
		if (this.cacheStartDate !== startDate) {
			return false;
		}
		const age = Date.now() - this.cacheTimestamp.getTime();
		return age < maxAgeMs;
	}

	setPrecomputing(value: boolean): void {
		this.isPrecomputing = value;
	}

	getPrecomputing(): boolean {
		return this.isPrecomputing;
	}
}

// Export singleton instance
export const leaderboardStore = new LeaderboardStore();
