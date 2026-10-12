import test from 'node:test';
import assert from 'node:assert/strict';
import { suggestUsernames } from '../lib/usernameSuggestions.ts';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';

test('normalizes accents and offers three distinct available names', async () => {
    const result = await suggestUsernames('Ána Júlia', async () => ['anajulia', 'ana.julia'], () => false);
    assert.equal(result.length, 3);
    assert.equal(new Set(result).size, 3);
    assert.ok(result.includes('ana_julia'));
    assert.ok(result.every(name => /^[a-z0-9._-]{2,30}$/.test(name)));
    assert.ok(!result.includes('anajulia') && !result.includes('ana.julia'));
});

test('continues past occupied batches and excludes reserved names', async () => {
    let calls = 0;
    const result = await suggestUsernames('Admin', async candidates => ++calls === 1 ? candidates : [], name => name === 'admin');
    assert.equal(calls, 2);
    assert.equal(result.length, 3);
    assert.ok(!result.includes('admin'));
});

test('never invents availability on exhaustion or lookup failure', async () => {
    assert.deepEqual(await suggestUsernames('Julia', async names => names, () => false), []);
    await assert.rejects(suggestUsernames('Julia', async () => { throw new Error('offline'); }, () => false));
});

test('handles short, non-Latin and long names safely', async () => {
    for (const name of ['', 'A', '李']) assert.deepEqual(await suggestUsernames(name, async () => [], () => false), []);
    const result = await suggestUsernames('A'.repeat(80), async () => [], () => false);
    assert.equal(result.length, 3);
    assert.ok(result.every(name => name.length <= 30));
});

test('API authenticates, filters occupied names and returns uncached suggestions', async () => {
    let userId = null;
    let fail = false;
    let connections = 0;
    const require = createRequire(import.meta.url);
    const dependencies = {
        '@clerk/nextjs/server': { auth: async () => ({ userId }) },
        '@/lib/db': { connectToDatabase: async () => { connections++; if (fail) throw new Error('offline'); } },
        '@/lib/routes': { isReservedRoute: path => path === '/admin' },
        '@/lib/usernameSuggestions': { suggestUsernames },
        '@/models/User': { User: { find: query => {
            assert.equal(query.clerkId.$ne, 'fixture-user');
            assert.ok(Array.isArray(query.username.$in));
            return { select: () => ({ lean: async () => [{ username: 'anajulia' }] }) };
        } } },
    };
    const source = readFileSync(new URL('../app/api/users/username-suggestions/route.ts', import.meta.url), 'utf8');
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
    const exports = {};
    vm.runInNewContext(code, { exports, require: key => dependencies[key] || require(key) });
    const request = name => ({ nextUrl: new URL('http://fixture.test?name=' + encodeURIComponent(name)) });
    assert.equal((await exports.GET(request('Ana Julia'))).status, 401);
    assert.equal(connections, 0);
    userId = 'fixture-user';
    assert.deepEqual(await (await exports.GET(request('A'))).json(), { suggestions: [] });
    assert.equal(connections, 0);
    const response = await exports.GET(request('Ana Julia'));
    const { suggestions } = await response.json();
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    assert.equal(suggestions.length, 3);
    assert.ok(!suggestions.includes('anajulia'));
    fail = true;
    assert.equal((await exports.GET(request('Ana Julia'))).status, 503);
});
