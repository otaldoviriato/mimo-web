// Run: node scripts/test-stack-navigation.cjs (no network, database, or added dependencies).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const { test } = require('node:test');

require.extensions['.ts'] = (module, filename) => {
    const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText;
    module._compile(source, filename);
};
const { initializeStackHistory, readStackEntry, resolveStackRoute, replaceStackUrl, stackOverlayState } = require('../lib/stackHistory.ts');

class History {
    constructor(url) { this.entries = [{ url, state: null }]; this.index = 0; this.writes = 0; }
    get state() { return this.entries[this.index].state; }
    get url() { return this.entries[this.index].url; }
    replaceState(state, _, url = this.url) { this.writes++; this.entries[this.index] = { state: structuredClone(state), url }; }
    pushState(state, _, url = this.url) {
        this.writes++;
        this.entries.splice(++this.index, Infinity, { state: structuredClone(state), url });
    }
    go(delta) { this.index += delta; }
}
let key = 0;
const initialize = (history, url = history.url) => initializeStackHistory(history, url, () => `screen-${++key}`);

test('direct info seeds its two parents without route loads; repeats/reload do not add entries', () => {
    const history = new History('/chat/ana/info');
    const entry = initialize(history);
    assert.deepEqual(history.entries.map(item => item.url), ['/chats', '/chat/ana', '/chat/ana/info']);
    assert.deepEqual(entry.screens.map(item => item.type), ['chat', 'chatInfo']);
    const writes = history.writes;
    assert.deepEqual(initialize(history), entry);
    assert.deepEqual(initialize(history), entry);
    assert.equal(history.writes, writes);
});

test('back, forward and multi-entry traversal restore the corresponding full stack', () => {
    const history = new History('/chat/ana/info');
    const info = initialize(history);
    history.go(-1);
    assert.deepEqual(initialize(history).screens.map(item => item.type), ['chat']);
    history.go(1);
    assert.deepEqual(initialize(history), info);
    history.go(-2);
    assert.equal(initialize(history).screens.length, 0);
    assert.equal(history.writes, 3);
});

test('settings uses profile as its parent; public profile uses chats', () => {
    assert.equal(initialize(new History('/settings')).basePath, '/profile');
    assert.equal(initialize(new History('/ana')).basePath, '/chats');
    assert.equal(initialize(new History('/ana')).screens[0].params.username, 'ana');
});

test('aliases and legacy open parameters become canonical stacks and retain gift/query/hash', () => {
    for (const url of ['/ana/chat?gift=ABC&source=link#latest', '/chats?openChat=ana&gift=ABC&source=link#latest']) {
        const history = new History(url);
        const entry = initialize(history);
        assert.equal(entry.url, '/chat/ana?gift=ABC&source=link#latest');
        assert.equal(entry.screens[0].params.giftCode, 'ABC');
    }
    assert.equal(initialize(new History('/profile?openSettings=true')).url, '/settings');
});

test('ordinary/reserved paths and malformed or external URLs do not synthesize ancestry', () => {
    for (const url of ['/chats', '/search', '/activation', '/onboarding', '/wallet/statement', '/profile/edit', '/chat/%ZZ', '//external.test/chat/ana', '/\\external.test/ana']) {
        assert.equal(resolveStackRoute(url), null, url);
    }
});

test('URL canonicalization and gift cleanup preserve stack identity across reload', () => {
    const history = new History('/chat/user_123?gift=ABC');
    const entry = initialize(history);
    global.window = { history, location: { origin: 'https://mimo.local' } };
    replaceStackUrl('/chat/ana?gift=ABC');
    assert.equal(readStackEntry(history.state).screens[0].key, entry.screens[0].key);
    replaceStackUrl('/chat/ana');
    assert.equal(initialize(history).screens[0].params.giftCode, undefined);
    assert.equal(history.entries.length, 2);
    delete global.window;
});

test('modal entries retain the stack and return to the same screen', () => {
    const history = new History('/chat/ana');
    const entry = initialize(history);
    global.window = { history };
    history.pushState(stackOverlayState({ mimoViewerOpen: true }), '');
    assert.deepEqual(readStackEntry(history.state), entry);
    history.go(-1);
    assert.deepEqual(readStackEntry(history.state), entry);
    assert.equal(history.state.mimoViewerOpen, undefined);
    delete global.window;
});

test('stale versions or another URL are not mistaken for a restorable stack', () => {
    assert.equal(readStackEntry({ mimoNavigation: { version: 0 } }), null);
    const history = new History('/chat/ana');
    initialize(history);
    assert.equal(readStackEntry(history.state, '/chat/bia'), null);
});

test('seeding parents preserves the entry preceding the application', () => {
    const history = new History('https://external.example/article');
    history.pushState(null, '', '/chat/ana/info');
    initialize(history);
    assert.deepEqual(history.entries.map(item => item.url), [
        'https://external.example/article', '/chats', '/chat/ana', '/chat/ana/info',
    ]);
});

test('nested overlays preserve each other and the navigation owner', () => {
    const history = new History('/chat/ana');
    const entry = initialize(history);
    global.window = { history };
    history.pushState(stackOverlayState({ mimoMessageSelectionOpen: true }), '');
    history.pushState(stackOverlayState({ mimoViewerOpen: true }), '');
    assert.equal(history.state.mimoMessageSelectionOpen, true);
    assert.equal(history.state.mimoViewerOpen, true);
    assert.deepEqual(readStackEntry(history.state), entry);
    history.go(-1);
    assert.equal(history.state.mimoViewerOpen, undefined);
    assert.equal(history.state.mimoMessageSelectionOpen, true);
    delete global.window;
});
