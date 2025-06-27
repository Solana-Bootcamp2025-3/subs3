#!/usr/bin/env node

/**
 * Utility script to convert Solana keypair JSON file to base64 private key
 * Usage: node scripts/convert-keypair.js path/to/keypair.json
 */

const fs = require('fs');
const path = require('path');

function convertKeypairToBase64(keypairPath) {
  try {
    if (!fs.existsSync(keypairPath)) {
      console.error(`Error: Keypair file not found at ${keypairPath}`);
      process.exit(1);
    }

    const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
    
    if (!Array.isArray(keypairData) || keypairData.length !== 64) {
      console.error('Error: Invalid keypair format. Expected array of 64 numbers.');
      process.exit(1);
    }

    const privateKeyBuffer = Buffer.from(keypairData);
    const base64PrivateKey = privateKeyBuffer.toString('base64');
    
    console.log('Base64 Private Key:');
    console.log(base64PrivateKey);
    console.log('\nAdd this to your .env file as:');
    console.log(`SOLANA_PRIVATE_KEY=${base64PrivateKey}`);
    
  } catch (error) {
    console.error('Error converting keypair:', error.message);
    process.exit(1);
  }
}

// Get command line arguments
const args = process.argv.slice(2);

if (args.length !== 1) {
  console.log('Usage: node scripts/convert-keypair.js path/to/keypair.json');
  console.log('Example: node scripts/convert-keypair.js ~/.config/solana/id.json');
  process.exit(1);
}

const keypairPath = path.resolve(args[0]);
convertKeypairToBase64(keypairPath);
