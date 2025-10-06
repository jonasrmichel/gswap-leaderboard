import { json } from '@sveltejs/kit';
import { leaderboardStore } from '$lib/leaderboardStore';
import { analyzeWallet } from '$lib/walletAnalyzer';
import type { RequestHandler } from './$types';

// GET endpoint to retrieve leaderboard
export const GET: RequestHandler = async ({ url }) => {
	const sortBy = (url.searchParams.get('sortBy') || 'volume') as
		| 'volume'
		| 'pnl'
		| 'pnlPercent'
		| 'value'
		| 'trades'
		| 'diversification'
		| 'risk';
	const leaderboard = leaderboardStore.getLeaderboard(sortBy);

	return json({
		leaderboard,
		count: leaderboard.length,
		sortBy
	});
};

// POST endpoint to add a wallet to the leaderboard
export const POST: RequestHandler = async ({ request }) => {
	try {
		const { walletAddress, startDate } = await request.json();

		if (!walletAddress) {
			return json({ error: 'Wallet address is required' }, { status: 400 });
		}

		const start = startDate ? new Date(startDate) : new Date('2025-09-22');
		const statistics = await analyzeWallet(walletAddress, start);

		// Add to leaderboard
		leaderboardStore.addOrUpdateEntry(walletAddress, statistics);

		// Get updated leaderboard
		const leaderboard = leaderboardStore.getLeaderboard();

		return json({
			message: 'Wallet added to leaderboard',
			walletAddress,
			statistics,
			leaderboard
		});
	} catch (error) {
		console.error('Error adding to leaderboard:', error);
		return json(
			{ error: error instanceof Error ? error.message : 'Failed to add wallet to leaderboard' },
			{ status: 500 }
		);
	}
};
