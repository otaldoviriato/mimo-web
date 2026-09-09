import assert from 'node:assert/strict';
import test from 'node:test';
import { rankExploreUsers } from './exploreRanking';

test('organiza o ranking das profissionais colocando em primeiro lugar as online agora ou com acesso mais recente', () => {
    const users = [
        { clerkId: 'user_offline_recent', isOnline: false, lastActiveTime: 3000, accessCount: 50 },
        { clerkId: 'user_online', isOnline: true, lastActiveTime: 1000, accessCount: 5 },
        { clerkId: 'user_offline_old', isOnline: false, lastActiveTime: 500, accessCount: 100 },
    ];

    const ranked = rankExploreUsers(users);
    assert.deepEqual(
        ranked.map((u) => u.clerkId),
        ['user_online', 'user_offline_recent', 'user_offline_old']
    );
});

test('entre profissionais com o mesmo status online, prioriza o acesso mais recente', () => {
    const users = [
        { clerkId: 'user_online_older', isOnline: true, lastActiveTime: 1000, accessCount: 20 },
        { clerkId: 'user_online_newer', isOnline: true, lastActiveTime: 2000, accessCount: 10 },
        { clerkId: 'user_offline_older', isOnline: false, lastActiveTime: 100, accessCount: 40 },
        { clerkId: 'user_offline_newer', isOnline: false, lastActiveTime: 200, accessCount: 10 },
    ];

    const ranked = rankExploreUsers(users);
    assert.deepEqual(
        ranked.map((u) => u.clerkId),
        ['user_online_newer', 'user_online_older', 'user_offline_newer', 'user_offline_older']
    );
});

test('desempata por número de acessos quando status online e recência forem iguais', () => {
    const users = [
        { clerkId: 'user_lower_access', isOnline: false, lastActiveTime: 100, accessCount: 5 },
        { clerkId: 'user_higher_access', isOnline: false, lastActiveTime: 100, accessCount: 25 },
        { clerkId: 'user_undefined_access', isOnline: false, lastActiveTime: 100 },
    ];

    const ranked = rankExploreUsers(users);
    assert.deepEqual(
        ranked.map((u) => u.clerkId),
        ['user_higher_access', 'user_lower_access', 'user_undefined_access']
    );
});
