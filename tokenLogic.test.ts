import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseQrPayload,
  generateQrPayload,
  calculateQueueMetrics,
  verifyTokenInStore,
  validateStatusTransition,
  type QueueToken,
} from './tokenLogic.ts';

const mockTokens: QueueToken[] = [
  {
    id: 'tok-1',
    tokenNumber: 'A010',
    customerName: 'Marcus Vance',
    customerPhone: '+1 (555) 234-5678',
    serviceCenter: 'Downtown Central Hub',
    department: 'Customer Care & Billing',
    counterId: 'Counter 1',
    bookingTime: '09:00 AM',
    status: 'serving',
    qrPayload: 'QUEUELESS:TOKEN:A010',
  },
  {
    id: 'tok-2',
    tokenNumber: 'A011',
    customerName: 'Elena Rostova',
    serviceCenter: 'Downtown Central Hub',
    department: 'Customer Care & Billing',
    counterId: 'Counter 2',
    bookingTime: '09:15 AM',
    status: 'arrived',
    qrPayload: 'QUEUELESS:TOKEN:A011',
  },
  {
    id: 'tok-3',
    tokenNumber: 'A024',
    customerName: 'Jordan Hayes',
    serviceCenter: 'Downtown Central Hub',
    department: 'Customer Care & Billing',
    bookingTime: '09:30 AM',
    status: 'waiting',
    qrPayload: 'QUEUELESS:TOKEN:A024',
  },
  {
    id: 'tok-4',
    tokenNumber: 'A005',
    customerName: 'Sarah Connor',
    serviceCenter: 'Downtown Central Hub',
    department: 'Customer Care & Billing',
    bookingTime: '08:30 AM',
    status: 'completed',
    qrPayload: 'QUEUELESS:TOKEN:A005',
  },
  {
    id: 'tok-5',
    tokenNumber: 'A009',
    customerName: 'David Miller',
    serviceCenter: 'Downtown Central Hub',
    department: 'Customer Care & Billing',
    bookingTime: '08:45 AM',
    status: 'cancelled',
    qrPayload: 'QUEUELESS:TOKEN:A009',
  },
];

test('generateQrPayload formats standard token payload', () => {
  assert.equal(generateQrPayload('a024'), 'QUEUELESS:TOKEN:A024');
  assert.equal(generateQrPayload(' B105 '), 'QUEUELESS:TOKEN:B105');
});

test('parseQrPayload parses standard QUEUELESS format', () => {
  const result = parseQrPayload('QUEUELESS:TOKEN:A024');
  assert.equal(result.isValid, true);
  assert.equal(result.tokenNumber, 'A024');
});

test('parseQrPayload handles lowercase and spaces', () => {
  const result = parseQrPayload('  queueless:token:b109  ');
  assert.equal(result.isValid, true);
  assert.equal(result.tokenNumber, 'B109');
});

test('parseQrPayload handles URL formats', () => {
  const result = parseQrPayload('https://queueless.app/verify?token=C301');
  assert.equal(result.isValid, true);
  assert.equal(result.tokenNumber, 'C301');
});

test('parseQrPayload handles JSON payloads', () => {
  const result = parseQrPayload('{"type":"queueless","token":"D402"}');
  assert.equal(result.isValid, true);
  assert.equal(result.tokenNumber, 'D402');
});

test('parseQrPayload handles plain token numbers as fallback', () => {
  const result = parseQrPayload('A024');
  assert.equal(result.isValid, true);
  assert.equal(result.tokenNumber, 'A024');
});

test('parseQrPayload safely rejects malformed or random data', () => {
  const empty = parseQrPayload('');
  assert.equal(empty.isValid, false);

  const garbage = parseQrPayload('SOME_RANDOM_BARCODE_NOT_A_TOKEN_XYZ_99999');
  assert.equal(garbage.isValid, false);
  assert.ok(garbage.error?.includes('Invalid or malformed'));
});

test('calculateQueueMetrics computes position and wait time accurately', () => {
  // In Customer Care & Billing: A011 (arrived), A024 (waiting)
  const metrics = calculateQueueMetrics(mockTokens, 'A024', 10);
  assert.equal(metrics.position, 2);
  assert.equal(metrics.peopleAhead, 1);
  assert.equal(metrics.estWaitMinutes, 10);
});

test('verifyTokenInStore identifies valid waiting token', () => {
  const res = verifyTokenInStore(mockTokens, 'QUEUELESS:TOKEN:A024');
  assert.equal(res.success, true);
  assert.equal(res.category, 'valid_waiting');
  assert.equal(res.token?.tokenNumber, 'A024');
  assert.equal(res.peopleAhead, 1);
});

test('verifyTokenInStore identifies already serving token', () => {
  const res = verifyTokenInStore(mockTokens, 'QUEUELESS:TOKEN:A010');
  assert.equal(res.success, true);
  assert.equal(res.category, 'already_serving');
  assert.ok(res.message.includes('currently being served'));
});

test('verifyTokenInStore identifies completed token', () => {
  const res = verifyTokenInStore(mockTokens, 'QUEUELESS:TOKEN:A005');
  assert.equal(res.success, false);
  assert.equal(res.category, 'completed');
  assert.ok(res.message.includes('already been completed'));
});

test('verifyTokenInStore identifies cancelled token', () => {
  const res = verifyTokenInStore(mockTokens, 'QUEUELESS:TOKEN:A009');
  assert.equal(res.success, false);
  assert.equal(res.category, 'cancelled');
  assert.ok(res.message.includes('cancelled'));
});

test('verifyTokenInStore returns not_found for unknown token', () => {
  const res = verifyTokenInStore(mockTokens, 'QUEUELESS:TOKEN:Z999');
  assert.equal(res.success, false);
  assert.equal(res.category, 'not_found');
  assert.ok(res.message.includes('not found'));
});

test('verifyTokenInStore returns malformed for garbage QR', () => {
  const res = verifyTokenInStore(mockTokens, 'INVALID_PAYLOAD_STRING');
  assert.equal(res.success, false);
  assert.equal(res.category, 'malformed');
});

test('validateStatusTransition enforces legal queue state changes', () => {
  // waiting -> arrived (Allowed)
  const t1 = validateStatusTransition('waiting', 'mark_arrived');
  assert.equal(t1.allowed, true);
  assert.equal(t1.newStatus, 'arrived');

  // waiting -> mark_completed (Illegal: cannot jump to completed directly)
  const t2 = validateStatusTransition('waiting', 'mark_completed');
  assert.equal(t2.allowed, false);

  // arrived -> serving (Allowed)
  const t3 = validateStatusTransition('arrived', 'mark_serving');
  assert.equal(t3.allowed, true);
  assert.equal(t3.newStatus, 'serving');

  // serving -> completed (Allowed)
  const t4 = validateStatusTransition('serving', 'mark_completed');
  assert.equal(t4.allowed, true);
  assert.equal(t4.newStatus, 'completed');

  // completed -> anything (Disallowed)
  const t5 = validateStatusTransition('completed', 'mark_arrived');
  assert.equal(t5.allowed, false);

  // cancelled -> anything (Disallowed)
  const t6 = validateStatusTransition('cancelled', 'mark_serving');
  assert.equal(t6.allowed, false);
});
