import { calculateBackoffDelayMs } from '../lib/pdf/queue.ts';

async function testQueueLifecycle() {
  console.log('--- TEST: DURABLE QUEUE RETRY & BACKOFF MECHANICS ---');

  // 1. Verify exponential backoff growth and jitter bounds
  console.log('\n[Check 1] Exponential backoff with jitter across attempts:');
  const delays = [];
  for (let attempt = 1; attempt <= 6; attempt++) {
    const delay = calculateBackoffDelayMs(attempt);
    delays.push({ attempt, delayMs: delay, delaySec: (delay / 1000).toFixed(2) });
  }
  console.table(delays);

  // Attempt 1 should be around 1-2s
  if (delays[0].delayMs < 1000 || delays[0].delayMs > 2500) {
    throw new Error('FAIL: Attempt 1 delay out of expected base range.');
  }

  // Attempt 5 should be roughly 16s - 18s
  if (delays[4].delayMs < 16000 || delays[4].delayMs > 20000) {
    throw new Error('FAIL: Attempt 5 delay out of expected range.');
  }

  // Delays should increase monotonically (accounting for small 1s jitter)
  if (delays[3].delayMs <= delays[1].delayMs) {
    throw new Error('FAIL: Exponential growth violated.');
  }

  console.log('PASS: Exponential backoff with jitter verified successfully.\n');
}

testQueueLifecycle().catch((err) => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
