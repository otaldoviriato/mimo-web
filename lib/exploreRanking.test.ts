import assert from 'node:assert/strict';
import test from 'node:test';
import { rankExploreUsers } from './exploreRanking';

test('organiza o ranking das profissionais prioritariamente pelo numero de acessos', () => {
    const users = [
        { clerkId: 'user_low', isOnline: true, lastActiveTime: 1000, accessCount: 5 },
        { clerkId: 'user_high', isOnline: false, lastActiveTime: 500, accessCount: 50 },
        { clerkId: 'user_medium', isOnline: false, lastActiveTime: 800, accessCount: 20 },
    ];

    const ranked = rankExploreUsers(users);
    assert.deepEqual(
        ranked.map((u) => u.clerkId),
        ['user_high', 'user_medium', 'user_low']
    );
});

test('desempata por status online e recencia quando os acessos forem iguais', () => {
    const users = [
        { clerkId: 'user_offline_old', isOnline: false, lastActiveTime: 100, accessCount: 10 },
        { clerkId: 'user_online', isOnline: true, lastActiveTime: 200, accessCount: 10 },
        { clerkId: 'user_offline_recent', isOnline: false, lastActiveTime: 300, accessCount: 10 },
    ];

    const ranked = rankExploreUsers(users);
    assert.deepEqual(
        ranked.map((u) => u.clerkId),
        ['user_online', 'user_offline_recent', 'user_offline_old']
    );
});

test('trata accessCount indefinido como 0', () => {
    const users = [
        { clerkId: 'user_undefined', isOnline: false, lastActiveTime: 100 },
        { clerkId: 'user_with_access', isOnline: false, lastActiveTime: 100, accessCount: 1 },
    ];

    const ranked = rankExploreUsers(users);
    assert.deepEqual(
        ranked.map((u) => u.clerkId),
        ['user_with_access', 'user_undefined']
    );
});
