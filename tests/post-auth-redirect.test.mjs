import test from 'node:test';
import assert from 'node:assert/strict';
import { POST_AUTH_REDIRECT_STORAGE_KEY, getPendingPostAuthRedirect, storePostAuthRedirect, consumePostAuthRedirect } from '../lib/postAuthRedirect.ts';

test('normal login ignores abandoned applicant redirects; explicit OAuth can resume them', () => {
    const savedWindow = globalThis.window;
    const savedStorage = globalThis.localStorage;
    const storage = new Map();
    globalThis.window = {};
    globalThis.localStorage = {
        getItem: key => storage.get(key) ?? null,
        setItem: (key, value) => storage.set(key, value),
        removeItem: key => storage.delete(key),
    };
    try {
        for (const destination of ['/participar', '/participar/cadastro', '/participar/cadastro?origem=google#perfil']) {
            storePostAuthRedirect(destination);
            assert.equal(getPendingPostAuthRedirect(), undefined, 'regular Google login must not restore the stale target');
            assert.equal(getPendingPostAuthRedirect({ allowApplicant: true }), destination, 'intentional applicant OAuth still works');
            assert.equal(consumePostAuthRedirect('/chats'), '/chats', 'email and existing sessions use the normal destination');
            assert.equal(storage.has(POST_AUTH_REDIRECT_STORAGE_KEY), false);
        }
        for (const destination of ['/chats', '/julia?gift=123', '/search']) {
            storePostAuthRedirect(destination);
            assert.equal(getPendingPostAuthRedirect(), destination);
            assert.equal(consumePostAuthRedirect(), destination);
        }
        for (const destination of ['//evil.test', 'https://evil.test', '/login', '/sso-callback']) {
            storePostAuthRedirect(destination);
            assert.equal(getPendingPostAuthRedirect(), undefined);
        }
    } finally {
        if (savedWindow === undefined) delete globalThis.window;
        else globalThis.window = savedWindow;
        if (savedStorage === undefined) delete globalThis.localStorage;
        else globalThis.localStorage = savedStorage;
    }
});
