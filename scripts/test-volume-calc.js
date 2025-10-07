import fetch from 'node-fetch';

async function testVolumeCalculation() {
	const testWallet = 'eth|Ce74B68cd1e9786F4BD3b9f7152D6151695A0bA5';
	console.log('Testing volume calculation for:', testWallet);
	
	// Fetch transactions
	const response = await fetch(`https://galascan.gala.com/api/all-transactions/${encodeURIComponent(testWallet)}`);
	const allTxs = await response.json();
	
	// Filter for swaps
	const startDate = new Date('2025-09-24');
	const swaps = allTxs.filter(tx => 
		new Date(tx.CreatedAt) >= startDate &&
		tx.Method === 'DexV3Contract:BatchSubmit:Swap' &&
		tx.is_nft === 0
	);
	
	console.log(`\nFound ${swaps.length} swap records`);
	
	// Group by hash
	const txByHash = {};
	swaps.forEach(tx => {
		if (!txByHash[tx.TransactionHash]) {
			txByHash[tx.TransactionHash] = [];
		}
		txByHash[tx.TransactionHash].push(tx);
	});
	
	console.log(`Unique swaps: ${Object.keys(txByHash).length}`);
	
	// Method 1: Current implementation - count outgoing only
	const walletLower = testWallet.toLowerCase();
	const tokenVolumes1 = {};
	
	for (const [hash, txPair] of Object.entries(txByHash)) {
		for (const tx of txPair) {
			const [amount, token] = tx.Amount.split(':');
			const amountNum = parseFloat(amount);
			const fromLower = tx.FromWallet.toLowerCase();
			
			if (!isNaN(amountNum) && amountNum > 0 && fromLower === walletLower) {
				if (!tokenVolumes1[token]) tokenVolumes1[token] = 0;
				tokenVolumes1[token] += amountNum;
				break; // Only count once per hash
			}
		}
	}
	
	// Method 2: Count each side separately
	const tokenVolumesSent = {};
	const tokenVolumesReceived = {};
	
	for (const tx of swaps) {
		const [amount, token] = tx.Amount.split(':');
		const amountNum = parseFloat(amount);
		
		if (!isNaN(amountNum) && amountNum > 0) {
			if (tx.FromWallet.toLowerCase() === walletLower) {
				if (!tokenVolumesSent[token]) tokenVolumesSent[token] = 0;
				tokenVolumesSent[token] += amountNum;
			}
			if (tx.ToWallet.toLowerCase() === walletLower) {
				if (!tokenVolumesReceived[token]) tokenVolumesReceived[token] = 0;
				tokenVolumesReceived[token] += amountNum;
			}
		}
	}
	
	// Method 3: Look at actual swap pairs
	console.log('\n\nSample swap pairs:');
	let sampleCount = 0;
	const swapPairs = [];
	
	for (const [hash, txPair] of Object.entries(txByHash)) {
		if (sampleCount < 5) {
			console.log(`\nSwap ${sampleCount + 1} (${hash.substring(0, 10)}...):`);
			const swapData = { sent: null, received: null };
			
			txPair.forEach(tx => {
				const [amount, token] = tx.Amount.split(':');
				const direction = tx.FromWallet.toLowerCase() === walletLower ? 'SENT' : 'RECEIVED';
				console.log(`  ${direction}: ${amount} ${token}`);
				
				if (direction === 'SENT') {
					swapData.sent = { amount: parseFloat(amount), token };
				} else {
					swapData.received = { amount: parseFloat(amount), token };
				}
			});
			
			swapPairs.push(swapData);
			sampleCount++;
		}
	}
	
	// Calculate USD values
	const prices = { GALA: 0.015, GWETH: 4000, GWBTC: 95000, GUSDC: 1, GUSDT: 1 };
	
	console.log('\n\n=== Volume Calculation Methods ===');
	
	// Method 1 results
	console.log('\nMethod 1 (Current - outgoing only, no duplicates):');
	let total1 = 0;
	for (const [token, volume] of Object.entries(tokenVolumes1)) {
		const value = volume * (prices[token] || 0);
		total1 += value;
		console.log(`  ${token}: ${volume.toFixed(2)} = $${value.toFixed(2)}`);
	}
	console.log(`  TOTAL: $${total1.toFixed(2)}`);
	
	// Method 2 results  
	console.log('\nMethod 2a (All outgoing):');
	let total2a = 0;
	for (const [token, volume] of Object.entries(tokenVolumesSent)) {
		const value = volume * (prices[token] || 0);
		total2a += value;
		console.log(`  ${token}: ${volume.toFixed(2)} = $${value.toFixed(2)}`);
	}
	console.log(`  TOTAL: $${total2a.toFixed(2)}`);
	
	console.log('\nMethod 2b (All incoming):');
	let total2b = 0;
	for (const [token, volume] of Object.entries(tokenVolumesReceived)) {
		const value = volume * (prices[token] || 0);
		total2b += value;
		console.log(`  ${token}: ${volume.toFixed(2)} = $${value.toFixed(2)}`);
	}
	console.log(`  TOTAL: $${total2b.toFixed(2)}`);
	
	// Method 3: Average of sent and received
	console.log('\nMethod 3 (Average of sent and received):');
	const avgTotal = (total2a + total2b) / 2;
	console.log(`  TOTAL: $${avgTotal.toFixed(2)}`);
	
	// Analyze swap value consistency
	console.log('\n\n=== Swap Value Analysis ===');
	swapPairs.forEach((swap, i) => {
		if (swap.sent && swap.received) {
			const sentValue = swap.sent.amount * (prices[swap.sent.token] || 0);
			const receivedValue = swap.received.amount * (prices[swap.received.token] || 0);
			const diff = Math.abs(sentValue - receivedValue);
			const diffPercent = (diff / sentValue * 100).toFixed(2);
			console.log(`Swap ${i + 1}: Sent $${sentValue.toFixed(2)}, Received $${receivedValue.toFixed(2)}, Diff: ${diffPercent}%`);
		}
	});
}

testVolumeCalculation().catch(console.error);