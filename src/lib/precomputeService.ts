import { leaderboardStore } from './leaderboardStore';
import { analyzeWallet } from './walletAnalyzer';
import { defaultWallets } from './defaultWallets';
import * as fs from 'fs';
import * as path from 'path';
import fetch from 'node-fetch';

const DEFAULT_START_DATE = '2025-09-24';
const CONCURRENCY_LIMIT = 3; // Reduce concurrency to avoid overwhelming the balance API
const MAX_RETRIES = 3; // Reduced retries
const INITIAL_RETRY_DELAY = 500; // 500ms instead of 200ms
const DELAY_BETWEEN_WALLETS = 100; // Small delay between starting new wallets

// Use file-based lock to persist across HMR reloads
const LOCK_FILE = path.join(process.cwd(), '.precompute.lock');

function isPrecomputeLocked(): boolean {
	try {
		if (fs.existsSync(LOCK_FILE)) {
			const lockData = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf-8'));
			const lockAge = Date.now() - lockData.timestamp;
			// Lock expires after 30 minutes (in case of crash)
			if (lockAge < 30 * 60 * 1000) {
				return true;
			}
			// Lock expired, remove it
			fs.unlinkSync(LOCK_FILE);
		}
	} catch (error) {
		// If lock file is corrupted, remove it
		try {
			fs.unlinkSync(LOCK_FILE);
		} catch {}
	}
	return false;
}

function acquirePrecomputeLock(): boolean {
	if (isPrecomputeLocked()) {
		return false;
	}
	try {
		fs.writeFileSync(LOCK_FILE, JSON.stringify({ timestamp: Date.now() }));
		return true;
	} catch {
		return false;
	}
}

function releasePrecomputeLock(): void {
	try {
		if (fs.existsSync(LOCK_FILE)) {
			fs.unlinkSync(LOCK_FILE);
		}
	} catch {}
}

// Retry with exponential backoff
async function analyzeWalletWithRetry(
	walletAddress: string,
	startDate: Date,
	tokenPrices: { [key: string]: number },
	maxRetries: number = MAX_RETRIES
): Promise<{ success: boolean; error?: string }> {
	let lastError: Error | null = null;

	for (let attempt = 0; attempt < maxRetries; attempt++) {
		try {
			const statistics = await analyzeWallet(walletAddress, startDate, tokenPrices);
			leaderboardStore.addOrUpdateEntry(walletAddress, statistics);
			return { success: true };
		} catch (error) {
			lastError = error instanceof Error ? error : new Error(String(error));

			// Don't retry if it's a "No balances found" error (not rate limiting)
			if (lastError.message.includes('No balances found')) {
				return { success: false, error: lastError.message };
			}

			// Gentler backoff: 200ms, 300ms, 450ms
			const delay = INITIAL_RETRY_DELAY * Math.pow(1.5, attempt);

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

// Fetch token prices once for all wallets
async function fetchGlobalTokenPrices(): Promise<{ [key: string]: number }> {
	try {
		const response = await fetch(
			'https://api.coingecko.com/api/v3/simple/price?ids=gala,ethereum,bitcoin,usd-coin,tether&vs_currencies=usd'
		);
		
		if (response.ok) {
			const prices = await response.json() as any;
			const tokenPrices = {
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
			console.log('[Precompute] Global token prices fetched:', tokenPrices);
			return tokenPrices;
		}
	} catch (error) {
		console.error('[Precompute] Failed to fetch global token prices:', error);
	}
	
	// Use default prices
	const defaultPrices = {
		GALA: 0.015,
		GWETH: 4000,
		ETH: 4000,
		GWBTC: 95000,
		BTC: 95000,
		GUSDC: 1,
		USDC: 1,
		GUSDT: 1,
		USDT: 1
	};
	console.log('[Precompute] Using default token prices');
	return defaultPrices;
}

// Process wallets in parallel with concurrency limit
async function processWalletsInParallel(
	wallets: string[],
	startDate: Date,
	concurrencyLimit: number,
	tokenPrices: { [key: string]: number }
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

			// Add delay only if configured (not needed with ClickHouse)
			if (DELAY_BETWEEN_WALLETS > 0 && processedCount > 0) {
				await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_WALLETS));
			}

			const task = analyzeWalletWithRetry(walletAddress, startDate, tokenPrices).then((result) => {
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
	// Try to acquire lock (prevents multiple simultaneous precompute operations across HMR reloads)
	if (!acquirePrecomputeLock()) {
		console.log('[Precompute] Already in progress (lock file exists), skipping...');
		return;
	}

	leaderboardStore.setPrecomputing(true);

	console.log(`[Precompute] Starting leaderboard precomputation for ${defaultWallets.length} wallets`);
	console.log(`[Precompute] Concurrency: ${CONCURRENCY_LIMIT}, Max retries: ${MAX_RETRIES}, Delay between wallets: ${DELAY_BETWEEN_WALLETS}ms`);
	console.log(`[Precompute] Start date: ${startDate}`);

	const startTime = Date.now();

	try {
		// Fetch token prices once for all wallets
		const tokenPrices = await fetchGlobalTokenPrices();
		
		const { successCount, failureCount } = await processWalletsInParallel(
			defaultWallets,
			new Date(startDate),
			CONCURRENCY_LIMIT,
			tokenPrices
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
		releasePrecomputeLock();
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
	return isPrecomputeLocked();
}
