import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import { getAbacatePixWebhookId } from '../lib/abacatePix.ts';
import { getWebhookEventId, verifyAbacateWebhook } from '../lib/abacateWebhook.ts';

const PUBLIC_KEY =
    't9dXRhHHo3yDEj5pVDYz0frf7q6bMKyMRmxxCPIPp3RCplBfXRxqlC6ZpiWmOqj4L63qEaeUOtrCI8P0VMUgo6iIga2ri9ogaHFs0WIIywSMg0q7RmBfybe1E5XJcfC4IW3alNqym0tXoAKkzvfEjZxV6bE0oG2zJrNNYmUCKZyV0KZ3JS8Votf9EAWWYdiDkMkpbMdPggfh1EqHlVkMiTady6jOR3hyzGEHrIz2Ret0xHKMbiqkr9HS1JhNHDX9';

test('accepts an authentic signed webhook and rejects tampering', () => {
    process.env.ABACATE_PAY_WEBHOOK_SECRET = 'test-secret';
    const body = JSON.stringify({ id: 'log_1', data: { id: 'pix_char_abc123' } });
    const signature = crypto.createHmac('sha256', PUBLIC_KEY).update(body).digest('base64');

    assert.equal(verifyAbacateWebhook(body, 'test-secret', signature), true);
    assert.equal(verifyAbacateWebhook(`${body} `, 'test-secret', signature), false);
    assert.equal(verifyAbacateWebhook(body, 'wrong-secret', signature), false);
    assert.equal(verifyAbacateWebhook(body, 'test-secret', null), false);
});

test('extracts only a PIX charge id instead of the webhook log id', () => {
    assert.equal(getAbacatePixWebhookId({
        id: 'log_event',
        event: 'transparent.completed',
        data: { transparent: { id: 'pix_char_payment123', status: 'PAID' } },
    }), 'pix_char_payment123');
});

test('uses a stable payload hash when the provider omits an event id', () => {
    const raw = JSON.stringify({ data: { id: 'pix_char_payment123' } });
    assert.equal(getWebhookEventId(JSON.parse(raw), raw), getWebhookEventId(JSON.parse(raw), raw));
    assert.match(getWebhookEventId(JSON.parse(raw), raw), /^payload_[a-f0-9]{64}$/);
});
