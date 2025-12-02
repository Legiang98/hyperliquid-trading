import { validateSignal } from '../src/services/validateSignal';
import { WebhookPayload } from '../src/types';
import * as fs from 'fs';

// Load environment variables from local.settings.json
const settings = JSON.parse(fs.readFileSync('local.settings.json', 'utf8'));
Object.entries(settings.Values).forEach(([key, value]) => {
    process.env[key] = value as string;
});

async function testValidateSignal() {
    console.log('=== Testing validateSignal ===');
    console.log(`User Address: ${process.env.HYPERLIQUID_USER_ADDRESS}`);
    console.log(`Testnet: ${process.env.HYPERLIQUID_TESTNET}\n`);

    // Test 1: Entry with existing position
    const entryPayload: WebhookPayload = {
        symbol: 'ETH',
        action: 'ENTRY',
        type: 'BUY',
        price: 3500,
        stopLoss: 3400,
        strategy: 'baseline_v1.2'
    };

    console.log('Test 1: Entry signal for ETH');
    console.log('Payload:', JSON.stringify(entryPayload, null, 2));
    const result1 = await validateSignal(entryPayload);
    console.log('Result:', JSON.stringify(result1, null, 2));
    console.log('\n---\n');

    // Test 2: Exit signal
    const exitPayload: WebhookPayload = {
        symbol: 'ETH',
        action: 'EXIT',
        type: 'SELL',
        price: 3600,
        strategy: 'baseline_v1.2'
    };

    console.log('Test 2: Exit signal for ETH');
    console.log('Payload:', JSON.stringify(exitPayload, null, 2));
    const result2 = await validateSignal(exitPayload);
    console.log('Result:', JSON.stringify(result2, null, 2));
    console.log('\n---\n');

    // Test 3: Entry for different symbol
    const btcPayload: WebhookPayload = {
        symbol: 'BTC',
        action: 'ENTRY',
        type: 'BUY',
        price: 95000,
        stopLoss: 94000,
        strategy: 'baseline_v1.2'
    };

    console.log('Test 3: Entry signal for BTC');
    console.log('Payload:', JSON.stringify(btcPayload, null, 2));
    const result3 = await validateSignal(btcPayload);
    console.log('Result:', JSON.stringify(result3, null, 2));

    process.exit(0);
}

testValidateSignal().catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});
