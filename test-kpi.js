import { calculateKPIValue } from './src/utils/kpiLogic.js';

const now = new Date();
const targetV = 100;

// Fake metrics for last 3 days
const m1 = { value: 10, timestamp: now.getTime() - 86400000 * 2 }; // 2 days ago
const m2 = { value: 30, timestamp: now.getTime() - 86400000 * 1 }; // 1 day ago
const m3 = { value: 20, timestamp: now.getTime() }; // today
const metrics = [m1, m2, m3];

const start = now.getTime() - 86400000 * 5;
const end = now.getTime() + 86400000;

console.log("=== KPI TESTS ===");

const test = (name, behavior, expected) => {
    const res = calculateKPIValue(metrics, behavior, start, end, targetV);
    const passed = expected === res ? "✅ PASS" : `❌ FAIL (Expected ${expected}, Got ${res})`;
    console.log(`${name.padEnd(20)}: ${passed}`);
}

test('cumulative', 'cumulative', 60); // 10+30+20
test('snapshot', 'snapshot', 20); // latest is m3 (20)
test('count', 'count', 3); // 3 items
test('weighted', 'weighted', 60); // sum
test('average', 'average', 20); // 60 / 3
test('calc_pct', 'calc_pct', 20); // 60 / 3 = 20
test('progress', 'progress', 60); // (60 / 100) * 100 = 60
test('differential', 'differential', -10); // 20 - 30 = -10
test('period_val', 'period_val', 60); // sum
test('duration', 'duration', 60); // sum
test('state', 'state', true); // 20 > 0
test('min_threshold', 'min_threshold', false); // 20 >= 100 -> false
test('max_control', 'max_control', true); // 20 <= 100 -> true
test('tendency', 'tendency', -1); // 20 is less than 30 (previous) -> -1
test('auto_reset', 'auto_reset', 60); // sum
test('hybrid', 'hybrid', 20); // average
