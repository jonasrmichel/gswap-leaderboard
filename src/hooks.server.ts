// Import precompute service to trigger auto-start on server initialization
import '$lib/precomputeService';

export async function handle({ event, resolve }) {
	return resolve(event);
}
