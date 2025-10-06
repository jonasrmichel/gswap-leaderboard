import { leaderboardStore } from './leaderboardStore';
import { analyzeWallet } from './walletAnalyzer';
import { defaultWallets } from './defaultWallets';

const DEFAULT_START_DATE = '2025-09-24';
let precomputeInProgress = false;

export async function precomputeLeaderboard(startDate: string = DEFAULT_START_DATE): Promise<void> {
	// Prevent multiple simultaneous precompute operations
	if (precomputeInProgress) {
		console.log('Precompute already in progress, skipping...');
		return;
	}

	precomputeInProgress = true;
	leaderboardStore.setPrecomputing(true);

	console.log(`[Precompute] Starting leaderboard precomputation for ${defaultWallets.length} wallets`);
	console.log(`[Precompute] Start date: ${startDate}`);

	const startTime = Date.now();
	let successCount = 0;
	let failureCount = 0;

	try {
		for (let i = 0; i < defaultWallets.length; i++) {
			const walletAddress = defaultWallets[i];

			try {
				const statistics = await analyzeWallet(walletAddress, new Date(startDate));
				leaderboardStore.addOrUpdateEntry(walletAddress, statistics);
				successCount++;

				if ((i + 1) % 10 === 0 || i === defaultWallets.length - 1) {
					console.log(
						`[Precompute] Progress: ${i + 1}/${defaultWallets.length} (${successCount} success, ${failureCount} failed)`
					);
				}
			} catch (error) {
				failureCount++;
				console.error(`[Precompute] Failed to analyze wallet ${walletAddress}:`, error);
			}

			// Add a small delay to avoid overwhelming APIs
			if (i < defaultWallets.length - 1) {
				await new Promise((resolve) => setTimeout(resolve, 5000));
			}
		}

		// Mark cache as valid
		leaderboardStore.setCacheMetadata(startDate);

		const duration = ((Date.now() - startTime) / 1000).toFixed(1);
		console.log(
			`[Precompute] Completed in ${duration}s - ${successCount} success, ${failureCount} failed`
		);
	} finally {
		precomputeInProgress = false;
		leaderboardStore.setPrecomputing(false);
	}
}

// Auto-start precomputation on module load (server start)
if (typeof window === 'undefined') {
	// Only run on server-side
	console.log('[Precompute] Scheduling initial leaderboard precomputation...');
	// Delay slightly to allow server to fully initialize
	setTimeout(() => {
		precomputeLeaderboard().catch((err) => {
			console.error('[Precompute] Failed to precompute leaderboard:', err);
		});
	}, 1000);
}

export function isPrecomputeInProgress(): boolean {
	return precomputeInProgress;
}
