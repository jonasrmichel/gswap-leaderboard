import { leaderboardStore } from './leaderboardStore';
import { analyzeWallet } from './walletAnalyzer';
import { defaultWallets } from './defaultWallets';

const DEFAULT_START_DATE = '2025-09-24';
const CONCURRENCY_LIMIT = 10; // Process up to 10 wallets in parallel
const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY = 1000; // 1 second

let precomputeInProgress = false;

// Retry with exponential backoff
async function analyzeWalletWithRetry(
	walletAddress: string,
	startDate: Date,
	maxRetries: number = MAX_RETRIES
): Promise<{ success: boolean; error?: string }> {
	let lastError: Error | null = null;

	for (let attempt = 0; attempt < maxRetries; attempt++) {
		try {
			const statistics = await analyzeWallet(walletAddress, startDate);
			leaderboardStore.addOrUpdateEntry(walletAddress, statistics);
			return { success: true };
		} catch (error) {
			lastError = error instanceof Error ? error : new Error(String(error));

			// Don't retry if it's a "No balances found" error (not rate limiting)
			if (lastError.message.includes('No balances found')) {
				return { success: false, error: lastError.message };
			}

			// Exponential backoff: 1s, 2s, 4s, 8s, 16s
			const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt);

			if (attempt < maxRetries - 1) {
				console.log(
					`[Precompute] Retry ${attempt + 1}/${maxRetries} for ${walletAddress} after ${delay}ms`
				);
				await new Promise((resolve) => setTimeout(resolve, delay));
			}
		}
	}

	return { success: false, error: lastError?.message || 'Unknown error' };
}

// Process wallets in parallel with concurrency limit
async function processWalletsInParallel(
	wallets: string[],
	startDate: Date,
	concurrencyLimit: number
): Promise<{ successCount: number; failureCount: number }> {
	let successCount = 0;
	let failureCount = 0;
	let processedCount = 0;

	const queue = [...wallets];
	const inProgress = new Set<Promise<void>>();

	while (queue.length > 0 || inProgress.size > 0) {
		// Fill up to concurrency limit
		while (queue.length > 0 && inProgress.size < concurrencyLimit) {
			const walletAddress = queue.shift()!;

			const task = analyzeWalletWithRetry(walletAddress, startDate).then((result) => {
				if (result.success) {
					successCount++;
				} else {
					failureCount++;
					if (!result.error?.includes('No balances found')) {
						console.error(`[Precompute] Failed to analyze wallet ${walletAddress}: ${result.error}`);
					}
				}

				processedCount++;

				// Log progress every 10 wallets
				if (processedCount % 10 === 0 || processedCount === wallets.length) {
					console.log(
						`[Precompute] Progress: ${processedCount}/${wallets.length} (${successCount} success, ${failureCount} failed)`
					);
				}
			});

			inProgress.add(task);
			task.finally(() => inProgress.delete(task));
		}

		// Wait for at least one task to complete
		if (inProgress.size > 0) {
			await Promise.race(inProgress);
		}
	}

	return { successCount, failureCount };
}

export async function precomputeLeaderboard(startDate: string = DEFAULT_START_DATE): Promise<void> {
	// Prevent multiple simultaneous precompute operations
	if (precomputeInProgress) {
		console.log('Precompute already in progress, skipping...');
		return;
	}

	precomputeInProgress = true;
	leaderboardStore.setPrecomputing(true);

	console.log(`[Precompute] Starting leaderboard precomputation for ${defaultWallets.length} wallets`);
	console.log(`[Precompute] Concurrency: ${CONCURRENCY_LIMIT}, Max retries: ${MAX_RETRIES}`);
	console.log(`[Precompute] Start date: ${startDate}`);

	const startTime = Date.now();

	try {
		const { successCount, failureCount } = await processWalletsInParallel(
			defaultWallets,
			new Date(startDate),
			CONCURRENCY_LIMIT
		);

		// Mark cache as valid
		leaderboardStore.setCacheMetadata(startDate);

		const duration = ((Date.now() - startTime) / 1000).toFixed(1);
		console.log(
			`[Precompute] Completed in ${duration}s - ${successCount} success, ${failureCount} failed`
		);
	} catch (error) {
		console.error('[Precompute] Unexpected error:', error);
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
