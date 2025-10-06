import { leaderboardStore } from '$lib/leaderboardStore';
import { analyzeWallet } from '$lib/walletAnalyzer';
import { defaultWallets } from '$lib/defaultWallets';
import type { RequestHandler } from './$types';

// SSE endpoint for real-time initialization progress
export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => ({}));
	const startDate = body.startDate ? new Date(body.startDate) : new Date('2025-09-24');
	const force = body.force === true;

	// Create a readable stream for SSE
	const stream = new ReadableStream({
		async start(controller) {
			const encoder = new TextEncoder();

			// Helper function to send SSE message
			const sendEvent = (data: any) => {
				const message = `data: ${JSON.stringify(data)}\n\n`;
				controller.enqueue(encoder.encode(message));
			};

			try {
				// Check if already initialized (unless force is true)
				if (!force && leaderboardStore.size() > 0) {
					sendEvent({
						type: 'complete',
						message: 'Leaderboard already initialized',
						count: leaderboardStore.size(),
						leaderboard: leaderboardStore.getLeaderboard()
					});
					controller.close();
					return;
				}

				// Clear existing data if forcing reanalysis
				if (force) {
					leaderboardStore.clear();
				}

				// Send initial progress
				sendEvent({
					type: 'progress',
					current: 0,
					total: defaultWallets.length,
					successful: 0,
					failed: 0
				});

				const results = {
					successful: 0,
					failed: 0,
					errors: [] as string[]
				};

				// Process wallets sequentially with delays
				for (let i = 0; i < defaultWallets.length; i++) {
					const walletAddress = defaultWallets[i];

					try {
						const statistics = await analyzeWallet(walletAddress, startDate);
						leaderboardStore.addOrUpdateEntry(walletAddress, statistics);
						results.successful++;

						// Send progress update
						sendEvent({
							type: 'progress',
							current: i + 1,
							total: defaultWallets.length,
							successful: results.successful,
							failed: results.failed,
							walletAddress
						});
					} catch (error) {
						results.failed++;
						const errorMsg = error instanceof Error ? error.message : 'Unknown error';
						results.errors.push(`${walletAddress}: ${errorMsg}`);

						// Send progress update with error
						sendEvent({
							type: 'progress',
							current: i + 1,
							total: defaultWallets.length,
							successful: results.successful,
							failed: results.failed,
							walletAddress,
							error: errorMsg
						});
					}

					// Delay between each wallet to avoid overwhelming the API
					if (i < defaultWallets.length - 1) {
						await new Promise((resolve) => setTimeout(resolve, 5000)); // 5 second delay
					}
				}

				const leaderboard = leaderboardStore.getLeaderboard();

				// Send completion message
				sendEvent({
					type: 'complete',
					message: 'Default wallets loaded',
					successful: results.successful,
					failed: results.failed,
					errors: results.errors,
					leaderboard
				});

				controller.close();
			} catch (error) {
				console.error('Error initializing leaderboard:', error);
				sendEvent({
					type: 'error',
					error: error instanceof Error ? error.message : 'Failed to initialize leaderboard'
				});
				controller.close();
			}
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive'
		}
	});
};
