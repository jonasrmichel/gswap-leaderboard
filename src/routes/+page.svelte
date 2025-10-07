<script lang="ts">
	import { onMount } from 'svelte';
	import type { LeaderboardEntry } from '$lib/walletAnalyzer';

	let leaderboard: LeaderboardEntry[] = [];
	let loading = false;
	let initializing = false;
	let initProgress = { current: 0, total: 0 };
	let error = '';
	let walletAddress = '';
	let startDate = '2025-09-24';
	let sortBy: 'volume' | 'pnl' | 'pnlPercent' | 'value' | 'trades' | 'diversification' | 'risk' =
		'pnl';
	let analyzing = false;
	let hideZeroBalance = false;
	let hideZeroVolume = false;

	$: filteredLeaderboard = leaderboard.filter(entry => {
		if (hideZeroBalance && entry.totalValue <= 0) return false;
		if (hideZeroVolume && entry.totalVolume <= 0) return false;
		return true;
	});

	async function fetchLeaderboard() {
		loading = true;
		error = '';
		try {
			const response = await fetch(`/api/leaderboard?sortBy=${sortBy}`);
			if (!response.ok) throw new Error('Failed to fetch leaderboard');
			const data = await response.json();
			leaderboard = data.leaderboard;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load leaderboard';
		} finally {
			loading = false;
		}
	}

	async function addWallet() {
		if (!walletAddress.trim()) {
			error = 'Please enter a wallet address';
			return;
		}

		analyzing = true;
		error = '';
		try {
			const response = await fetch('/api/leaderboard', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ walletAddress: walletAddress.trim(), startDate })
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Failed to analyze wallet');
			}

			const data = await response.json();
			leaderboard = data.leaderboard;
			walletAddress = '';
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to add wallet';
		} finally {
			analyzing = false;
		}
	}

	async function reanalyzeAll() {
		if (leaderboard.length === 0) return;

		initializing = true;
		initProgress = { current: 0, total: 54 };
		error = '';

		try {
			const response = await fetch('/api/init-stream', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ startDate, force: true })
			});

			if (!response.ok) {
				throw new Error('Failed to start reanalysis');
			}

			const reader = response.body?.getReader();
			if (!reader) {
				throw new Error('No response body');
			}

			const decoder = new TextDecoder();
			let buffer = '';

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split('\n\n');
				buffer = lines.pop() || '';

				for (const line of lines) {
					if (line.startsWith('data: ')) {
						const data = JSON.parse(line.slice(6));

						if (data.type === 'progress') {
							initProgress = {
								current: data.current,
								total: data.total
							};
						} else if (data.type === 'complete') {
							if (data.leaderboard) {
								leaderboard = data.leaderboard;
							}
						} else if (data.type === 'error') {
							error = data.error;
						}
					}
				}
			}
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to reanalyze wallets';
		} finally {
			initializing = false;
			setTimeout(() => {
				initProgress = { current: 0, total: 0 };
			}, 2000);
		}
	}

	async function initializeDefaults() {
		// First, try to fetch existing leaderboard
		await fetchLeaderboard();

		// If leaderboard is empty, initialize with defaults
		if (leaderboard.length === 0) {
			initializing = true;
			initProgress = { current: 0, total: 54 };
			try {
				const response = await fetch('/api/init-stream', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ startDate })
				});

				if (!response.ok) {
					throw new Error('Failed to start initialization');
				}

				const reader = response.body?.getReader();
				if (!reader) {
					throw new Error('No response body');
				}

				const decoder = new TextDecoder();
				let buffer = '';

				while (true) {
					const { done, value } = await reader.read();
					if (done) break;

					buffer += decoder.decode(value, { stream: true });
					const lines = buffer.split('\n\n');
					buffer = lines.pop() || '';

					for (const line of lines) {
						if (line.startsWith('data: ')) {
							const data = JSON.parse(line.slice(6));

							if (data.type === 'progress') {
								initProgress = {
									current: data.current,
									total: data.total
								};
							} else if (data.type === 'complete') {
								if (data.leaderboard) {
									leaderboard = data.leaderboard;
								}
							} else if (data.type === 'error') {
								error = data.error;
							}
						}
					}
				}
			} catch (e) {
				console.error('Failed to initialize defaults:', e);
			} finally {
				initializing = false;
				setTimeout(() => {
					initProgress = { current: 0, total: 0 };
				}, 2000);
			}
		}
	}

	function formatCurrency(value: number): string {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 2
		}).format(value);
	}

	function formatPercent(value: number): string {
		const sign = value >= 0 ? '+' : '';
		return `${sign}${value.toFixed(2)}%`;
	}

	function getRiskColor(risk: string): string {
		switch (risk) {
			case 'Low':
				return '#34d399';
			case 'Medium':
				return '#fbbf24';
			case 'High':
				return '#fb923c';
			case 'Very High':
				return '#f87171';
			default:
				return '#94a3b8';
		}
	}

	function getPnlColor(pnl: number): string {
		return pnl >= 0 ? '#34d399' : '#f87171';
	}

	async function changeSortBy(
		newSortBy: 'volume' | 'pnl' | 'pnlPercent' | 'value' | 'trades' | 'diversification' | 'risk'
	) {
		sortBy = newSortBy;
		await fetchLeaderboard();
	}

	function getSortLabel(sort: typeof sortBy): string {
		const labels = {
			volume: 'Trading Volume',
			pnl: 'P&L ($)',
			pnlPercent: 'P&L %',
			value: 'Portfolio Value',
			trades: 'Trade Count',
			diversification: 'Diversification',
			risk: 'Risk Level'
		};
		return labels[sort];
	}

	onMount(() => {
		initializeDefaults();
	});
</script>

<svelte:head>
	<title>GSwap Trading Leaderboard</title>
</svelte:head>

<main>
	<div class="container">
		<header>
			<h1>🏆 GSwap Trading Leaderboard</h1>
			<p class="subtitle">Track and rank the best GSwap traders</p>
		</header>

		<div class="add-wallet-section">
			<div class="section-top">
				<h2>Add Wallet to Leaderboard</h2>
				<div class="date-selector">
					<label for="startDate">Analysis Start Date:</label>
					<input
						type="date"
						id="startDate"
						bind:value={startDate}
						disabled={initializing}
						max={new Date().toISOString().split('T')[0]}
					/>
					<button
						type="button"
						on:click={reanalyzeAll}
						disabled={initializing || leaderboard.length === 0}
						class="reanalyze-btn"
					>
						{initializing ? 'Reanalyzing...' : 'Apply to All'}
					</button>
				</div>
			</div>
			<form on:submit|preventDefault={addWallet}>
				<div class="input-group">
					<input
						type="text"
						bind:value={walletAddress}
						placeholder="Enter wallet address (e.g., eth|0x...)"
						disabled={analyzing}
					/>
					<button type="submit" disabled={analyzing}>
						{analyzing ? 'Analyzing...' : 'Add Wallet'}
					</button>
				</div>
			</form>
			{#if error}
				<p class="error">{error}</p>
			{/if}
		</div>

		<div class="leaderboard-section">
			<div class="section-header">
				<h2>Leaderboard</h2>
				<div class="controls">
					<div class="filter-option">
						<input 
							type="checkbox" 
							id="hideZero" 
							bind:checked={hideZeroBalance}
						/>
						<label for="hideZero">Hide $0 balance</label>
					</div>
					<div class="filter-option">
						<input 
							type="checkbox" 
							id="hideZeroVolume" 
							bind:checked={hideZeroVolume}
						/>
						<label for="hideZeroVolume">Hide $0 volume</label>
					</div>
					<div class="sort-info">
						<span class="sort-label">Sort by:</span>
						<select bind:value={sortBy} on:change={() => fetchLeaderboard()} disabled={loading}>
							<option value="volume">Trading Volume</option>
							<option value="value">Portfolio Value</option>
							<option value="pnl">P&L ($)</option>
							<option value="pnlPercent">P&L %</option>
							<option value="trades">Trade Count</option>
							<option value="diversification">Diversification</option>
							<option value="risk">Risk Level (Low to High)</option>
						</select>
					</div>
				</div>
			</div>

			{#if loading || initializing}
				<div class="loading">
					{#if initializing}
						<div class="spinner"></div>
						<p>Analyzing wallets...</p>
						{#if initProgress.total > 0}
							<div class="progress-container">
								<div class="progress-bar">
									<div
										class="progress-fill"
										style="width: {(initProgress.current / initProgress.total) * 100}%"
									></div>
								</div>
								<p class="progress-text">
									{initProgress.current} / {initProgress.total} wallets processed
								</p>
							</div>
							<p class="subtext">This will take approximately {Math.ceil((initProgress.total - initProgress.current) * 5 / 60)} minutes</p>
						{:else}
							<p class="subtext">This may take 4-5 minutes</p>
						{/if}
					{:else}
						Loading leaderboard...
					{/if}
				</div>
			{:else if filteredLeaderboard.length === 0}
				<div class="empty">
					{#if leaderboard.length > 0}
						<p>No wallets match the current filter.</p>
						<p>Try adjusting your filter settings.</p>
					{:else}
						<p>No wallets in the leaderboard yet.</p>
						<p>Add a wallet address above to get started!</p>
					{/if}
				</div>
			{:else}
				<div class="table-container">
					<table>
						<thead>
							<tr>
								<th>Rank</th>
								<th>Wallet</th>
								<th
									class="sortable"
									class:active={sortBy === 'value'}
									on:click={() => changeSortBy('value')}
								>
									Portfolio Value {sortBy === 'value' ? '▼' : ''}
								</th>
								<th
									class="sortable"
									class:active={sortBy === 'volume'}
									on:click={() => changeSortBy('volume')}
								>
									Trading Volume {sortBy === 'volume' ? '▼' : ''}
								</th>
								<th
									class="sortable"
									class:active={sortBy === 'pnl'}
									on:click={() => changeSortBy('pnl')}
									title="Click to sort by P&L dollar amount"
								>
									P&L $ {sortBy === 'pnl' ? '▼' : ''}
								</th>
								<th
									class="sortable"
									class:active={sortBy === 'pnlPercent'}
									on:click={() => changeSortBy('pnlPercent')}
									title="Click to sort by P&L percentage"
								>
									P&L % {sortBy === 'pnlPercent' ? '▼' : ''}
								</th>
								<th
									class="sortable"
									class:active={sortBy === 'trades'}
									on:click={() => changeSortBy('trades')}
								>
									Trades {sortBy === 'trades' ? '▼' : ''}
								</th>
								<th
									class="sortable"
									class:active={sortBy === 'risk'}
									on:click={() => changeSortBy('risk')}
								>
									Risk {sortBy === 'risk' ? '▼' : ''}
								</th>
								<th
									class="sortable"
									class:active={sortBy === 'diversification'}
									on:click={() => changeSortBy('diversification')}
								>
									Diversification {sortBy === 'diversification' ? '▼' : ''}
								</th>
								<th>Last Updated</th>
							</tr>
						</thead>
						<tbody>
							{#each filteredLeaderboard as entry, i}
								<tr>
									<td class="rank">
										{#if entry.rank === 1}
											🥇
										{:else if entry.rank === 2}
											🥈
										{:else if entry.rank === 3}
											🥉
										{:else}
											#{entry.rank}
										{/if}
									</td>
									<td class="wallet" title={entry.walletAddress}>
										{entry.walletAddress.length > 50
											? entry.walletAddress.slice(0, 25) + '...' + entry.walletAddress.slice(-20)
											: entry.walletAddress}
									</td>
									<td>{formatCurrency(entry.totalValue)}</td>
									<td>{formatCurrency(entry.totalVolume)}</td>
									<td style="color: {getPnlColor(entry.pnl)}; font-weight: 600;">
										{formatCurrency(entry.pnl)}
									</td>
									<td style="color: {getPnlColor(entry.pnlPercent)}; font-weight: 600;">
										{formatPercent(entry.pnlPercent)}
									</td>
									<td>{entry.estimatedTrades}</td>
									<td style="color: {getRiskColor(entry.riskLevel)}; font-weight: 600;">
										{entry.riskLevel}
									</td>
									<td>{entry.diversificationScore.toFixed(1)}/10</td>
									<td class="date">{new Date(entry.lastUpdated).toLocaleString()}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>
	</div>
</main>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		background: #0a0a0f;
		min-height: 100vh;
		color: #e2e8f0;
	}

	main {
		padding: 2rem 1rem;
		max-width: 1600px;
		margin: 0 auto;
	}

	.container {
		background: linear-gradient(180deg, #1a1a2e 0%, #16162a 100%);
		border-radius: 24px;
		box-shadow: 0 25px 80px rgba(0, 0, 0, 0.5), 0 0 1px rgba(255, 255, 255, 0.1) inset;
		overflow: hidden;
		border: 1px solid rgba(255, 255, 255, 0.05);
	}

	header {
		background: rgba(30, 30, 50, 0.4);
		border-bottom: 1px solid rgba(139, 92, 246, 0.2);
		color: white;
		padding: 1.5rem 2rem;
		text-align: center;
		position: relative;
		overflow: hidden;
	}

	header::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: radial-gradient(
			circle at 50% 50%,
			rgba(139, 92, 246, 0.05) 0%,
			transparent 70%
		);
		pointer-events: none;
	}

	h1 {
		margin: 0;
		font-size: 1.75rem;
		font-weight: 700;
		letter-spacing: -0.01em;
		position: relative;
		z-index: 1;
		color: #e0e7ff;
	}

	.subtitle {
		margin: 0.25rem 0 0;
		font-size: 0.9rem;
		opacity: 0.7;
		font-weight: 400;
		position: relative;
		z-index: 1;
		color: #cbd5e1;
	}

	h2 {
		margin: 0 0 1.5rem;
		font-size: 1.75rem;
		font-weight: 700;
		color: #f1f5f9;
		letter-spacing: -0.01em;
	}

	.add-wallet-section {
		padding: 2.5rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
		background: rgba(15, 15, 25, 0.5);
		backdrop-filter: blur(10px);
	}

	.section-top {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
		flex-wrap: wrap;
		gap: 1.5rem;
	}

	.date-selector {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.date-selector label {
		font-weight: 600;
		color: #cbd5e1;
		font-size: 0.95rem;
	}

	.date-selector input[type='date'] {
		padding: 0.75rem 1rem;
		background: rgba(30, 30, 50, 0.6);
		border: 2px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		font-size: 0.95rem;
		color: #e2e8f0;
		transition: all 0.3s ease;
		min-width: 160px;
		color-scheme: dark;
	}

	.date-selector input[type='date']:focus {
		outline: none;
		border-color: #8b5cf6;
		background: rgba(30, 30, 50, 0.8);
		box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.1);
	}

	.date-selector input[type='date']:disabled {
		background: rgba(30, 30, 50, 0.3);
		cursor: not-allowed;
		opacity: 0.5;
	}

	.date-selector input[type='date']::-webkit-calendar-picker-indicator {
		filter: invert(1);
		cursor: pointer;
	}

	.reanalyze-btn {
		padding: 0.75rem 1.5rem;
		font-size: 0.95rem;
		white-space: nowrap;
	}

	.input-group {
		display: flex;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	input {
		flex: 1;
		padding: 1rem 1.25rem;
		background: rgba(30, 30, 50, 0.6);
		border: 2px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		font-size: 1rem;
		color: #e2e8f0;
		transition: all 0.3s ease;
	}

	input::placeholder {
		color: rgba(226, 232, 240, 0.4);
	}

	input:focus {
		outline: none;
		border-color: #8b5cf6;
		background: rgba(30, 30, 50, 0.8);
		box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.1), 0 8px 16px rgba(139, 92, 246, 0.2);
	}

	input:disabled {
		background: rgba(30, 30, 50, 0.3);
		cursor: not-allowed;
		opacity: 0.5;
	}

	button {
		padding: 1rem 2rem;
		background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #d946ef 100%);
		color: white;
		border: none;
		border-radius: 12px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		white-space: nowrap;
		position: relative;
		overflow: hidden;
	}

	button::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: linear-gradient(135deg, #8b5cf6 0%, #d946ef 50%, #f43f5e 100%);
		opacity: 0;
		transition: opacity 0.3s;
	}

	button:hover:not(:disabled)::before {
		opacity: 1;
	}

	button:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 12px 24px rgba(139, 92, 246, 0.4), 0 4px 12px rgba(217, 70, 239, 0.3);
	}

	button:active:not(:disabled) {
		transform: translateY(0);
	}

	button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		transform: none;
	}

	.error {
		color: #f87171;
		margin: 0.75rem 0 0;
		font-weight: 500;
		font-size: 0.95rem;
	}

	.leaderboard-section {
		padding: 2.5rem;
		background: rgba(10, 10, 20, 0.3);
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 2rem;
		flex-wrap: wrap;
		gap: 1.5rem;
	}

	.controls {
		display: flex;
		align-items: center;
		gap: 2rem;
		flex-wrap: wrap;
	}

	.filter-option {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.filter-option input[type='checkbox'] {
		width: 20px;
		height: 20px;
		accent-color: #8b5cf6;
		cursor: pointer;
	}

	.filter-option label {
		font-size: 0.95rem;
		color: #cbd5e1;
		cursor: pointer;
		user-select: none;
		transition: color 0.2s;
	}

	.filter-option label:hover {
		color: #e0e7ff;
	}

	.sort-info {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.sort-label {
		font-weight: 600;
		color: #cbd5e1;
		font-size: 0.95rem;
	}

	select {
		padding: 0.75rem 2.5rem 0.75rem 1.25rem;
		background: rgba(30, 30, 50, 0.6);
		border: 2px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		font-size: 0.95rem;
		color: #e2e8f0;
		cursor: pointer;
		transition: all 0.3s ease;
		appearance: none;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23cbd5e1' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right 1rem center;
	}

	select:hover:not(:disabled) {
		border-color: #8b5cf6;
		background: rgba(30, 30, 50, 0.8);
	}

	select:focus {
		outline: none;
		border-color: #8b5cf6;
		box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.1);
	}

	select:disabled {
		background-color: rgba(30, 30, 50, 0.3);
		cursor: not-allowed;
		opacity: 0.5;
	}

	select option {
		background: #1a1a2e;
		color: #e2e8f0;
	}

	.loading,
	.empty {
		text-align: center;
		padding: 4rem 2rem;
		color: #94a3b8;
	}

	.loading {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.5rem;
	}

	.loading p {
		margin: 0;
		font-size: 1.1rem;
		color: #cbd5e1;
	}

	.loading .subtext {
		font-size: 0.95rem;
		color: #94a3b8;
	}

	.spinner {
		width: 48px;
		height: 48px;
		border: 4px solid rgba(139, 92, 246, 0.2);
		border-top-color: #8b5cf6;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.progress-container {
		width: 100%;
		max-width: 400px;
		margin: 1.5rem 0 0.5rem;
	}

	.progress-bar {
		width: 100%;
		height: 8px;
		background: rgba(139, 92, 246, 0.2);
		border-radius: 4px;
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		background: linear-gradient(90deg, #6366f1 0%, #8b5cf6 50%, #d946ef 100%);
		border-radius: 4px;
		transition: width 0.3s ease;
	}

	.progress-text {
		margin: 0.5rem 0 0;
		font-size: 0.95rem;
		color: #cbd5e1;
		font-weight: 600;
	}

	.empty p {
		margin: 0.5rem 0;
		font-size: 1.1rem;
	}

	.table-container {
		overflow-x: auto;
		border-radius: 12px;
		background: rgba(15, 15, 25, 0.4);
	}

	table {
		width: 100%;
		border-collapse: collapse;
	}

	th {
		background: rgba(30, 30, 50, 0.8);
		padding: 1.25rem 1.5rem;
		text-align: left;
		font-weight: 600;
		color: #cbd5e1;
		border-bottom: 2px solid rgba(255, 255, 255, 0.05);
		font-size: 0.9rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	th.sortable {
		cursor: pointer;
		user-select: none;
		transition: all 0.3s ease;
		position: relative;
	}

	th.sortable:hover {
		background: rgba(139, 92, 246, 0.2);
		color: #e0e7ff;
	}

	th.sortable.active {
		background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
		color: white;
	}

	td {
		padding: 1.25rem 1.5rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
		color: #e2e8f0;
		font-size: 0.95rem;
	}

	tbody tr {
		transition: all 0.2s ease;
	}

	tbody tr:hover {
		background: rgba(139, 92, 246, 0.08);
	}

	tbody tr:last-child td {
		border-bottom: none;
	}

	.rank {
		font-size: 1.5rem;
		font-weight: 700;
		text-align: center;
		background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.wallet {
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		font-size: 0.9rem;
		color: #94a3b8;
		letter-spacing: -0.01em;
	}

	.date {
		font-size: 0.85rem;
		color: #64748b;
	}

	@media (max-width: 1024px) {
		main {
			padding: 1rem 0.5rem;
		}

		.container {
			border-radius: 16px;
		}

		h2 {
			font-size: 1.5rem;
		}

		.add-wallet-section,
		.leaderboard-section {
			padding: 1.5rem;
		}
	}

	@media (max-width: 768px) {
		main {
			padding: 0.5rem 0.25rem;
		}

		.container {
			border-radius: 12px;
		}

		header {
			padding: 1rem 1.5rem;
		}

		h1 {
			font-size: 1.35rem;
		}

		.subtitle {
			font-size: 0.8rem;
		}

		h2 {
			font-size: 1.25rem;
			margin-bottom: 1rem;
		}

		.section-top {
			flex-direction: column;
			align-items: flex-start;
			gap: 1rem;
		}

		.date-selector {
			width: 100%;
			flex-direction: column;
			align-items: stretch;
			gap: 0.75rem;
		}

		.date-selector label {
			font-size: 0.9rem;
		}

		.date-selector input[type='date'],
		.reanalyze-btn {
			width: 100%;
		}

		.add-wallet-section,
		.leaderboard-section {
			padding: 1.25rem;
		}

		.input-group {
			flex-direction: column;
		}

		input,
		button {
			font-size: 0.95rem;
			padding: 0.875rem 1rem;
		}

		.section-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 1rem;
		}

		.controls {
			width: 100%;
			flex-direction: column;
			align-items: stretch;
			gap: 1rem;
		}

		.filter-option {
			width: 100%;
		}

		.sort-info {
			width: 100%;
			gap: 0.75rem;
		}

		.sort-label {
			font-size: 0.9rem;
		}

		select {
			width: 100%;
			font-size: 0.9rem;
			padding: 0.75rem 2.5rem 0.75rem 1rem;
		}

		.table-container {
			overflow-x: auto;
			-webkit-overflow-scrolling: touch;
			margin: 0 -1.25rem;
			padding: 0 1.25rem;
		}

		table {
			font-size: 0.8rem;
			min-width: 800px;
		}

		th,
		td {
			padding: 0.75rem 0.5rem;
			white-space: nowrap;
		}

		.wallet {
			font-size: 0.75rem;
			max-width: 120px;
			overflow: hidden;
			text-overflow: ellipsis;
		}

		.rank {
			font-size: 1.25rem;
		}

		.date {
			font-size: 0.75rem;
		}

		.loading,
		.empty {
			padding: 2rem 1rem;
		}

		.spinner {
			width: 40px;
			height: 40px;
		}
	}

	@media (max-width: 480px) {
		h1 {
			font-size: 1.15rem;
		}

		.subtitle {
			font-size: 0.75rem;
		}

		h2 {
			font-size: 1.1rem;
		}

		.add-wallet-section,
		.leaderboard-section {
			padding: 1rem;
		}

		input,
		button {
			font-size: 0.9rem;
			padding: 0.75rem 0.875rem;
		}

		select {
			font-size: 0.85rem;
		}

		table {
			font-size: 0.75rem;
			min-width: 700px;
		}

		th,
		td {
			padding: 0.625rem 0.375rem;
		}
	}
</style>
