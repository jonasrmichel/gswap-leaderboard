#!/usr/bin/env node

import dotenv from 'dotenv';
import { clickhouseService } from '../src/lib/clickhouseService.js';
import { WalletAnalyzer } from '../src/lib/walletAnalyzer.js';

// Load environment variables
dotenv.config();

async function testClickHouseConnection() {
	console.log('Testing ClickHouse connection...\n');
	
	// Check if configured
	if (!clickhouseService.isConfigured()) {
		console.error('❌ ClickHouse is not configured. Please check your .env file.');
		console.log('\nRequired environment variables:');
		console.log('  CLICKHOUSE_KEY_ID');
		console.log('  CLICKHOUSE_KEY_SECRET');
		console.log('  CLICKHOUSE_QUERY_ID (optional, defaults to: 71d43d53-b7da-407b-a5db-267a365802b1)');
		process.exit(1);
	}
	
	console.log('✅ ClickHouse credentials found in environment\n');
	
	// Test connection
	console.log('Testing ClickHouse connection...');
	const connected = await clickhouseService.testConnection();
	
	if (!connected) {
		console.error('❌ Failed to connect to ClickHouse. Please check your credentials.');
		process.exit(1);
	}
	
	console.log('✅ Successfully connected to ClickHouse\n');
	
	// Test with a sample wallet
	const testWallet = '0x8c2b23f948a7c007a61f7c45c2e3c9df0af577fa'; // Example wallet
	const startDate = new Date('2025-09-24');
	
	console.log(`Testing transaction fetch for wallet: ${testWallet}`);
	console.log(`Start date: ${startDate.toISOString().split('T')[0]}\n`);
	
	try {
		const transactions = await clickhouseService.fetchTransactions(testWallet, startDate);
		console.log(`✅ Successfully fetched ${transactions.length} transactions`);
		
		if (transactions.length > 0) {
			console.log('\nSample transaction:');
			const sample = transactions[0];
			console.log(JSON.stringify(sample, null, 2));
			
			// Count swap transactions
			const swaps = transactions.filter(tx => 
				tx.Method === 'DexV3Contract:BatchSubmit:Swap' && tx.is_nft === 0
			);
			console.log(`\n📊 Found ${swaps.length} swap transactions`);
		}
	} catch (error) {
		console.error('❌ Failed to fetch transactions:', error);
		process.exit(1);
	}
	
	// Test full wallet analysis
	console.log('\n\nTesting full wallet analysis with ClickHouse...');
	const analyzer = new WalletAnalyzer(testWallet, startDate);
	
	try {
		const stats = await analyzer.analyze();
		console.log('✅ Successfully analyzed wallet\n');
		console.log('Wallet Statistics:');
		console.log(`  Total Value: $${stats.totalValue.toFixed(2)}`);
		console.log(`  Total Volume: $${stats.totalVolumeMoved.toFixed(2)}`);
		console.log(`  Estimated Trades: ${stats.estimatedTrades}`);
		console.log(`  Active Tokens: ${stats.activeTokens}`);
		console.log(`  Risk Level: ${stats.riskLevel}`);
	} catch (error) {
		console.error('❌ Failed to analyze wallet:', error);
		process.exit(1);
	}
	
	console.log('\n✅ All tests passed successfully!');
}

// Run the test
testClickHouseConnection().catch(console.error);