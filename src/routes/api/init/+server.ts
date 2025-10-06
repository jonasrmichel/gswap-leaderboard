import { json } from '@sveltejs/kit';
import { leaderboardStore } from '$lib/leaderboardStore';
import { analyzeWallet } from '$lib/walletAnalyzer';
import { defaultWallets } from '$lib/defaultWallets';
import type { RequestHandler } from './$types';

// POST endpoint to initialize leaderboard with default wallets
export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json().catch(() => ({}));
		const startDate = body.startDate ? new Date(body.startDate) : new Date('2025-09-24');
		const force = body.force === true;

		// Check if already initialized (unless force is true)
		if (!force && leaderboardStore.size() > 0) {
			return json({
				message: 'Leaderboard already initialized',
				count: leaderboardStore.size()
			});
		}

		// Clear existing data if forcing reanalysis
		if (force) {
			leaderboardStore.clear();
		}

		// Analyze and add default wallets
		const results = {
			successful: 0,
			failed: 0,
			errors: [] as string[]
		};

		// Process wallets sequentially with delays to avoid API rate limiting
		for (let i = 0; i < defaultWallets.length; i++) {
			const walletAddress = defaultWallets[i];

			console.log(`Processing wallet ${i + 1}/${defaultWallets.length}: ${walletAddress}`);

			try {
				const statistics = await analyzeWallet(walletAddress, startDate);
				leaderboardStore.addOrUpdateEntry(walletAddress, statistics);
				results.successful++;
				console.log(`  ✓ Success (${results.successful} successful, ${results.failed} failed)`);
			} catch (error) {
				results.failed++;
				const errorMsg = error instanceof Error ? error.message : 'Unknown error';
				results.errors.push(`${walletAddress}: ${errorMsg}`);
				console.log(`  ✗ Failed: ${errorMsg}`);
			}

			// Delay between each wallet to avoid overwhelming the API
			if (i < defaultWallets.length - 1) {
				await new Promise((resolve) => setTimeout(resolve, 3000)); // 3 second delay
			}
		}

		const leaderboard = leaderboardStore.getLeaderboard();

		return json({
			message: 'Default wallets loaded',
			successful: results.successful,
			failed: results.failed,
			errors: results.errors,
			leaderboard
		});
	} catch (error) {
		console.error('Error initializing leaderboard:', error);
		return json(
			{ error: error instanceof Error ? error.message : 'Failed to initialize leaderboard' },
			{ status: 500 }
		);
	}
};
