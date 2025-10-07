import fetch from 'node-fetch';

const wallet = 'eth|525b8736346f2caCdaEF4Cb5ADc8c363cD686328';

async function analyzeHighVolume() {
	console.log('Analyzing high volume wallet:', wallet);
	
	// Fetch transactions
	const response = await fetch(`https://galascan.gala.com/api/all-transactions/${encodeURIComponent(wallet)}`);
	const allTxs = await response.json();
	
	// Filter for swaps since Sept 24
	const startDate = new Date('2025-09-24');
	const swaps = allTxs.filter(tx => 
		new Date(tx.CreatedAt) >= startDate &&
		tx.Method === 'DexV3Contract:BatchSubmit:Swap' &&
		tx.is_nft === 0
	);
	
	console.log(`\nFound ${swaps.length} swap transaction records`);
	console.log(`Unique transactions: ${new Set(swaps.map(tx => tx.TransactionHash)).size}`);
	
	// Group by transaction hash
	const txGroups = {};
	swaps.forEach(tx => {
		if (!txGroups[tx.TransactionHash]) {
			txGroups[tx.TransactionHash] = [];
		}
		txGroups[tx.TransactionHash].push(tx);
	});
	
	// Analyze volume
	const walletLower = wallet.toLowerCase();
	const tokenVolumes = {};
	let sampleTrades = 0;
	
	for (const [hash, txPair] of Object.entries(txGroups)) {
		if (sampleTrades < 5) {
			console.log(`\nTrade ${sampleTrades + 1} (${hash.substring(0, 10)}...):`);
			txPair.forEach(tx => {
				const [amount, token] = tx.Amount.split(':');
				const direction = tx.FromWallet.toLowerCase() === walletLower ? 'SENT' : 'RECEIVED';
				console.log(`  ${direction}: ${amount} ${token}`);
			});
			sampleTrades++;
		}
		
		// Count volume (outgoing only)
		for (const tx of txPair) {
			const [amount, token] = tx.Amount.split(':');
			const amountNum = parseFloat(amount);
			
			if (tx.FromWallet.toLowerCase() === walletLower) {
				if (!tokenVolumes[token]) {
					tokenVolumes[token] = 0;
				}
				tokenVolumes[token] += amountNum;
			}
		}
	}
	
	// Calculate USD volume
	const prices = { 
		GALA: 0.015, 
		GWETH: 4000, 
		GWBTC: 95000, 
		GUSDC: 1, 
		GUSDT: 1 
	};
	
	console.log('\n\nToken Volumes (outgoing only):');
	let totalUSD = 0;
	for (const [token, volume] of Object.entries(tokenVolumes)) {
		const price = prices[token] || 0;
		const usdValue = volume * price;
		totalUSD += usdValue;
		console.log(`  ${token}: ${volume.toFixed(2)} units = $${usdValue.toFixed(2)}`);
	}
	
	console.log(`\nTotal Volume (one-sided): $${totalUSD.toFixed(2)}`);
	console.log(`Average per trade: $${(totalUSD / Object.keys(txGroups).length).toFixed(2)}`);
	
	// Get current balance
	const balanceResponse = await fetch(
		`https://dex-backend-prod1.defi.gala.com/user/assets?address=${encodeURIComponent(wallet)}&page=1&limit=20`
	);
	
	if (balanceResponse.ok) {
		const balanceData = await balanceResponse.json();
		console.log('\nCurrent Holdings:');
		
		let totalValue = 0;
		if (balanceData.data?.token) {
			const tokens = Array.isArray(balanceData.data.token) ? balanceData.data.token : [balanceData.data.token];
			tokens.forEach(t => {
				const price = prices[t.symbol] || 0;
				const value = parseFloat(t.quantity) * price;
				totalValue += value;
				console.log(`  ${t.symbol}: ${t.quantity} = $${value.toFixed(2)}`);
			});
		}
		
		console.log(`\nTotal Portfolio Value: $${totalValue.toFixed(2)}`);
		console.log(`Volume to Portfolio Ratio: ${(totalUSD / totalValue).toFixed(2)}x`);
	}
}

analyzeHighVolume().catch(console.error);