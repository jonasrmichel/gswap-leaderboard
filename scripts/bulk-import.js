#!/usr/bin/env node

/**
 * Bulk Import Wallets to Leaderboard
 *
 * Usage:
 *   node scripts/bulk-import.js [api-url] [wallets-file]
 *
 * Examples:
 *   node scripts/bulk-import.js http://localhost:5173 wallets.txt
 *   node scripts/bulk-import.js https://your-app.vercel.app wallets.txt
 */

import fs from 'fs/promises';
import fetch from 'node-fetch';

async function importWallets(apiUrl, walletsFile) {
  console.log('🚀 Starting bulk wallet import...');
  console.log(`📡 API URL: ${apiUrl}`);
  console.log(`📄 Wallets file: ${walletsFile}\n`);

  // Read wallets from file
  const content = await fs.readFile(walletsFile, 'utf-8');
  const wallets = content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'));

  console.log(`Found ${wallets.length} wallet addresses\n`);

  let successful = 0;
  let failed = 0;
  const errors = [];

  for (let i = 0; i < wallets.length; i++) {
    const wallet = wallets[i];
    console.log(`[${i + 1}/${wallets.length}] Processing: ${wallet}`);

    try {
      const response = await fetch(`${apiUrl}/api/leaderboard`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: wallet,
          startDate: '2025-09-22'
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`  ✅ Success! Portfolio: $${data.statistics.totalValue.toFixed(2)}\n`);
        successful++;
      } else {
        const error = await response.json();
        console.log(`  ❌ Failed: ${error.error}\n`);
        failed++;
        errors.push({ wallet, error: error.error });
      }

      // Add delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.log(`  ❌ Error: ${error.message}\n`);
      failed++;
      errors.push({ wallet, error: error.message });
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 IMPORT SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((successful / wallets.length) * 100).toFixed(1)}%`);

  if (errors.length > 0) {
    console.log('\n❌ FAILED WALLETS:');
    errors.forEach(({ wallet, error }) => {
      console.log(`  ${wallet}: ${error}`);
    });
  }

  console.log('\n✨ Import complete!');
  console.log(`View leaderboard at: ${apiUrl}\n`);
}

// Parse arguments
const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('Usage: node scripts/bulk-import.js [api-url] [wallets-file]');
  console.log('');
  console.log('Examples:');
  console.log('  node scripts/bulk-import.js http://localhost:5173 wallets.txt');
  console.log('  node scripts/bulk-import.js https://your-app.vercel.app wallets.txt');
  process.exit(1);
}

const [apiUrl, walletsFile] = args;

// Run import
importWallets(apiUrl, walletsFile).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
