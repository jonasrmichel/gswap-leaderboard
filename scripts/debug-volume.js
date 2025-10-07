import fetch from 'node-fetch';

const testWallet = 'eth|Ce74B68cd1e9786F4BD3b9f7152D6151695A0bA5';

async function debugVolume() {
	console.log('Fetching transactions for:', testWallet);
	
	// Fetch transactions directly from GalaScan
	const response = await fetch(`https://galascan.gala.com/api/all-transactions/${encodeURIComponent(testWallet)}`);
	
	if (!response.ok) {
		console.error('Failed to fetch transactions');
		return;
	}
	
	const allTransactions = await response.json();
	
	// Filter for swaps since Sept 24
	const startDate = new Date('2025-09-24');
	const swapTransactions = allTransactions.filter(tx => {
		const txDate = new Date(tx.CreatedAt);
		return txDate >= startDate && 
			   tx.Method === 'DexV3Contract:BatchSubmit:Swap' && 
			   tx.is_nft === 0;
	});
	
	console.log(`\nTotal swap transactions: ${swapTransactions.length}`);
	
	// Analyze transaction patterns
	const walletLower = testWallet.toLowerCase();
	let fromWalletCount = 0;
	let toWalletCount = 0;
	const tokenVolumes = {};
	
	console.log('\nFirst 10 swap transactions:');
	swapTransactions.slice(0, 10).forEach((tx, i) => {
		const [amount, token] = tx.Amount.split(':');
		const amountNum = parseFloat(amount);
		
		console.log(`\n${i + 1}. Hash: ${tx.TransactionHash.substring(0, 10)}...`);
		console.log(`   From: ${tx.FromWallet}`);
		console.log(`   To: ${tx.ToWallet}`);
		console.log(`   Amount: ${amount} ${token}`);
		console.log(`   Is FROM wallet: ${tx.FromWallet.toLowerCase() === walletLower}`);
		console.log(`   Is TO wallet: ${tx.ToWallet.toLowerCase() === walletLower}`);
		
		if (tx.FromWallet.toLowerCase() === walletLower) {
			fromWalletCount++;
			if (!tokenVolumes[token]) tokenVolumes[token] = { sent: 0, received: 0 };
			tokenVolumes[token].sent += amountNum;
		}
		
		if (tx.ToWallet.toLowerCase() === walletLower) {
			toWalletCount++;
			if (!tokenVolumes[token]) tokenVolumes[token] = { sent: 0, received: 0 };
			tokenVolumes[token].received += amountNum;
		}
	});
	
	console.log(`\n\nTransaction Summary:`);
	console.log(`  Transactions FROM wallet: ${fromWalletCount}`);
	console.log(`  Transactions TO wallet: ${toWalletCount}`);
	console.log(`  Total transactions: ${swapTransactions.length}`);
	
	// Calculate volume different ways
	console.log('\n\nVolume by token (first 10 txs):');
	const prices = { GALA: 0.015, GWETH: 4000, GWBTC: 95000, GUSDC: 1, GUSDT: 1 };
	
	let totalVolumeMethod1 = 0; // Count only outgoing
	let totalVolumeMethod2 = 0; // Count both in and out
	let totalVolumeMethod3 = 0; // Count unique trades (half of total)
	
	for (const [token, volumes] of Object.entries(tokenVolumes)) {
		const price = prices[token] || 0;
		const sentValue = volumes.sent * price;
		const receivedValue = volumes.received * price;
		const totalValue = sentValue + receivedValue;
		
		console.log(`  ${token}:`);
		console.log(`    Sent: ${volumes.sent.toFixed(2)} ($${sentValue.toFixed(2)})`);
		console.log(`    Received: ${volumes.received.toFixed(2)} ($${receivedValue.toFixed(2)})`);
		
		totalVolumeMethod1 += sentValue;
		totalVolumeMethod2 += totalValue;
	}
	
	totalVolumeMethod3 = totalVolumeMethod2 / 2;
	
	console.log('\n\nVolume Calculation Methods:');
	console.log(`  Method 1 (outgoing only): $${totalVolumeMethod1.toFixed(2)}`);
	console.log(`  Method 2 (in + out): $${totalVolumeMethod2.toFixed(2)}`);
	console.log(`  Method 3 (total / 2): $${totalVolumeMethod3.toFixed(2)}`);
	
	// Check for duplicate transactions
	const txHashes = new Set();
	let duplicates = 0;
	swapTransactions.forEach(tx => {
		if (txHashes.has(tx.TransactionHash)) {
			duplicates++;
		}
		txHashes.add(tx.TransactionHash);
	});
	
	console.log(`\n\nDuplicate transactions: ${duplicates}`);
}

debugVolume().catch(console.error);