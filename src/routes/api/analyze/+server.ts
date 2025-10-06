import { json } from '@sveltejs/kit';
import { analyzeWallet } from '$lib/walletAnalyzer';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { walletAddress, startDate } = await request.json();

		if (!walletAddress) {
			return json({ error: 'Wallet address is required' }, { status: 400 });
		}

		const start = startDate ? new Date(startDate) : new Date('2025-09-22');
		const statistics = await analyzeWallet(walletAddress, start);

		return json({
			walletAddress,
			statistics,
			analyzedAt: new Date().toISOString()
		});
	} catch (error) {
		console.error('Error analyzing wallet:', error);
		return json(
			{ error: error instanceof Error ? error.message : 'Failed to analyze wallet' },
			{ status: 500 }
		);
	}
};
