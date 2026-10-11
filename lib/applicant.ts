export function suggestApplicantUsername(name: string) {
    return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .trim().split(/\s+/).map(part => part.replace(/[^a-z0-9]/g, '')).filter(Boolean).slice(0, 2).join('_').slice(0, 30);
}

export function validateApplicantBirthDate(value: unknown, today = new Date()): string | null {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'Informe uma data válida.';
    const date = new Date(`${value}T12:00:00Z`);
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) return 'Informe uma data válida.';
    const local = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(today);
    const part = (type: string) => Number(local.find(p => p.type === type)?.value);
    const [year, month, day] = value.split('-').map(Number);
    let age = part('year') - year;
    if (part('month') < month || (part('month') === month && part('day') < day)) age--;
    if (age < 18) return 'Você precisa ter pelo menos 18 anos de idade.';
    if (age > 120) return 'Informe uma data válida.';
    return null;
}
