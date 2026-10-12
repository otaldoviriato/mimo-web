// Bounded batches keep popular names from producing one database query per candidate.
export async function suggestUsernames(
    name: string,
    findTaken: (candidates: string[]) => Promise<string[]>,
    isReserved: (username: string) => boolean,
): Promise<string[]> {
    const words = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().match(/[a-z0-9]+/g) || [];
    const base = words.join('').slice(0, 24);
    if (base.length < 2) return [];
    const first = (words[0] || '').slice(0, 20);
    const last = words.length > 1 ? (words[words.length - 1] || '').slice(0, 9) : '';
    const preferred = [base, last ? `${first}.${last}` : `${base.slice(0, 22)}.oficial`, last ? `${first}_${last}` : `sou.${base}`];
    const available: string[] = [];
    for (let batch = 0; batch < 4 && available.length < 3; batch++) {
        const candidates = [...new Set([
            ...(batch === 0 ? preferred : []),
            ...Array.from({ length: 24 }, (_, index) => `${base}${batch * 24 + index + 1}`),
        ])].filter(candidate => !isReserved(candidate));
        const taken = new Set(await findTaken(candidates));
        available.push(...candidates.filter(candidate => !taken.has(candidate)));
    }
    return available.slice(0, 3);
}
