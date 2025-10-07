#!/usr/bin/env node

import dotenv from 'dotenv';
import { WalletAnalyzer } from '../src/lib/walletAnalyzer.js';

// Load environment variables
dotenv.config();

async function testCalculations() {
	console.log('Testing Volume and P&L Calculations\n');
	console.log('=' . repeat(50));
	
	// Test wallet with known activity
	const testWallet = 'eth|Ce74B68cd1e9786F4BD3b9f7152D6151695A0bA5';
	const startDate = new Date('2025-09-24');
	
	console.log(`\nAnalyzing wallet: ${testWallet}`);
	console.log(`Start date: ${startDate.toISOString().split('T')[0]}\n`);
	
	const analyzer = new WalletAnalyzer(testWallet, startDate);
	
	try {
		const stats = await analyzer.analyze();
		
		console.log('Portfolio Metrics:');
		console.log(`  Total Value: $${stats.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
		console.log(`  Number of Holdings: ${stats.holdings.length}`);
		console.log(`  Active Tokens: ${stats.activeTokens}`);
		console.log('');
		
		console.log('Trading Activity:');
		console.log(`  Total Volume: $${stats.totalVolumeMoved.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
		console.log(`  Estimated Trades: ${stats.estimatedTrades}`);
		console.log(`  Avg Trade Size: $${stats.avgTradeSize.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
		console.log(`  Volume/Portfolio Ratio: ${stats.volumeToPortfolioRatio.toFixed(2)}x`);
		console.log('');
		
		console.log('P&L Estimates:');
		console.log(`  Estimated Initial Value: $${stats.estimatedInitialValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
		console.log(`  P&L: $${stats.pnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
		console.log(`  P&L %: ${stats.pnlPercent.toFixed(2)}%`);
		console.log('');
		
		console.log('Risk Metrics:');
		console.log(`  Largest Position: ${stats.largestPosition}`);
		console.log(`  Concentration: ${stats.concentration.toFixed(2)}%`);
		console.log(`  Risk Level: ${stats.riskLevel}`);
		console.log(`  Diversification Score: ${stats.diversificationScore.toFixed(1)}/10`);
		console.log('');
		
		console.log('Top 3 Holdings:');
		const top3 = stats.holdings.slice(0, 3);
		for (const holding of top3) {
			console.log(`  ${holding.token}: ${holding.quantity.toLocaleString()} @ $${holding.price} = $${holding.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${holding.percentage.toFixed(1)}%)`);
		}
		console.log('');
		
		// Sanity checks
		console.log('Sanity Checks:');
		const volumeReasonable = stats.totalVolumeMoved < stats.totalValue * 100;
		const pnlReasonable = Math.abs(stats.pnlPercent) < 1000;
		
		console.log(`  ✓ Volume reasonable (<100x portfolio): ${volumeReasonable ? 'PASS' : 'FAIL'}`);
		console.log(`  ✓ P&L % reasonable (<1000%): ${pnlReasonable ? 'PASS' : 'FAIL'}`);
		
		if (!volumeReasonable || !pnlReasonable) {
			console.error('\n⚠️  WARNING: Some calculations appear unreasonable!');
		} else {
			console.log('\n✅ All calculations appear reasonable!');
		}
		
	} catch (error) {
		console.error('Error analyzing wallet:', error);
	}
}

// Run the test
testCalculations().catch(console.error);