import { User } from '@/models/User';

/**
 * Gera um nome no formato Anônimo[323], garantindo que o número
 * seja aleatório e único (não exista em outro usuário no banco).
 */
export async function generateUniqueAnonymousName(): Promise<string> {
    // Tenta primeiro números de 3 dígitos (100 a 999), exatamente como o exemplo "Anônimo[323]"
    for (let attempt = 0; attempt < 20; attempt++) {
        const num = Math.floor(100 + Math.random() * 900); // 100 a 999
        const candidate = `Anônimo[${num}]`;
        const exists = await User.exists({ name: candidate });
        if (!exists) {
            return candidate;
        }
    }

    // Se houver muitas colisões na faixa de 3 dígitos, expande para 4 ou 5 dígitos
    for (let attempt = 0; attempt < 20; attempt++) {
        const num = Math.floor(1000 + Math.random() * 9000); // 1000 a 9999
        const candidate = `Anônimo[${num}]`;
        const exists = await User.exists({ name: candidate });
        if (!exists) {
            return candidate;
        }
    }

    // Fallback garantido com timestamp
    const fallbackNum = Math.floor(10000 + Math.random() * 90000);
    return `Anônimo[${fallbackNum}]`;
}
