import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
	try {
		const response = await fetch('/api/leaderboard?sortBy=volume');
		if (response.ok) {
			const data = await response.json();
			return {
				leaderboard: data.leaderboard || [],
				cached: data.cached || false,
				precomputing: data.precomputing || false
			};
		}
	} catch (error) {
		console.error('Failed to load leaderboard:', error);
	}
	
	return {
		leaderboard: [],
		cached: false,
		precomputing: false
	};
};