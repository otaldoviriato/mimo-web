/**
 * messageCipher.ts
 *
 * Módulo de criptografia de mensagens para proteção durante transporte e armazenamento
 * de mensagens pendentes de cobrança, permitindo descriptografia instantânea no cliente
 * quando o usuário possui saldo, sem delay de requisições de rede.
 */

function sha256(ascii: string): number[] {
    function rightRotate(value: number, amount: number): number {
        return (value >>> amount) | (value << (32 - amount));
    }

    const mathPow = Math.pow;
    const maxWord = mathPow(2, 32);
    const lengthProperty = 'length';
    let i: number;
    let j: number;

    const words: number[] = [];
    const asciiBitLength = ascii.length * 8;

    const hash: number[] = [];
    const k: number[] = [];
    let primeCounter = 0;

    const isComposite: Record<number, number> = {};
    for (let candidate = 2; primeCounter < 64; candidate++) {
        if (!isComposite[candidate]) {
            for (i = 0; i < 313; i += candidate) {
                isComposite[i] = candidate;
            }
            hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
            k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
        }
    }

    let padded = ascii + '\x80';
    while (padded[lengthProperty] % 64 !== 56) padded += '\x00';
    for (i = 0; i < padded[lengthProperty]; i++) {
        j = padded.charCodeAt(i);
        if (j >> 8) return [];
        words[i >> 2] |= j << ((3 - i) % 4) * 8;
    }
    words[words[lengthProperty]] = (asciiBitLength / maxWord) | 0;
    words[words[lengthProperty]] = asciiBitLength;

    for (j = 0; j < words[lengthProperty];) {
        const w = words.slice(j, j += 16);
        const oldHash = [...hash];

        for (i = 0; i < 64; i++) {
            const w15 = w[i - 15];
            const w2 = w[i - 2];

            const a = hash[0];
            const e = hash[4];
            const temp1 = hash[7]
                + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25))
                + ((e & hash[5]) ^ ((~e) & hash[6]))
                + k[i]
                + (w[i] = (i < 16) ? w[i] : (
                        w[i - 16]
                        + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3))
                        + w[i - 7]
                        + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))
                    ) | 0
                );
            const temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22))
                + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));

            hash[7] = hash[6];
            hash[6] = hash[5];
            hash[5] = hash[4];
            hash[4] = (hash[3] + temp1) | 0;
            hash[3] = hash[2];
            hash[2] = hash[1];
            hash[1] = hash[0];
            hash[0] = (temp1 + temp2) | 0;
        }

        for (i = 0; i < 8; i++) {
            hash[i] = (hash[i] + oldHash[i]) | 0;
        }
    }

    const bytes: number[] = [];
    for (i = 0; i < 8; i++) {
        for (j = 3; j >= 0; j--) {
            bytes.push((hash[i] >> (8 * j)) & 255);
        }
    }
    return bytes;
}

const MIMO_CIPHER_SECRET = 'mimo_message_sec_2026_receipt';

export function encryptMessageText(text: string, roomId: string = '', seed: string = ''): string {
    if (!text) return '';
    const encoder = new TextEncoder();
    const inputBytes = encoder.encode(text);

    // Nonce de 8 bytes pseudo-aleatórios
    const nonceBytes: number[] = [];
    for (let i = 0; i < 8; i++) {
        nonceBytes.push(Math.floor(Math.random() * 256));
    }
    const nonceHex = nonceBytes.map(b => b.toString(16).padStart(2, '0')).join('');

    const outputBytes = new Uint8Array(inputBytes.length);
    for (let i = 0; i < inputBytes.length; i += 32) {
        const blockIndex = Math.floor(i / 32);
        const blockKeyString = `${MIMO_CIPHER_SECRET}:${roomId}:${seed}:${nonceHex}:${blockIndex}`;
        const blockKeyBytes = sha256(unescape(encodeURIComponent(blockKeyString)));
        const blockSize = Math.min(32, inputBytes.length - i);
        for (let b = 0; b < blockSize; b++) {
            outputBytes[i + b] = inputBytes[i + b] ^ blockKeyBytes[b];
        }
    }

    let cipherHex = '';
    for (let i = 0; i < outputBytes.length; i++) {
        cipherHex += outputBytes[i].toString(16).padStart(2, '0');
    }
    return `${nonceHex}:${cipherHex}`;
}

export function decryptMessageText(encryptedPayload: string, roomId: string = '', seed: string = ''): string {
    if (!encryptedPayload || typeof encryptedPayload !== 'string') return '';
    const parts = encryptedPayload.split(':');
    if (parts.length !== 2) return '';
    const nonceHex = parts[0];
    const cipherHex = parts[1];
    if (nonceHex.length !== 16 || cipherHex.length % 2 !== 0) return '';

    const inputBytes = new Uint8Array(cipherHex.length / 2);
    for (let i = 0; i < inputBytes.length; i++) {
        inputBytes[i] = parseInt(cipherHex.substring(i * 2, i * 2 + 2), 16);
    }

    const outputBytes = new Uint8Array(inputBytes.length);
    for (let i = 0; i < inputBytes.length; i += 32) {
        const blockIndex = Math.floor(i / 32);
        const blockKeyString = `${MIMO_CIPHER_SECRET}:${roomId}:${seed}:${nonceHex}:${blockIndex}`;
        const blockKeyBytes = sha256(unescape(encodeURIComponent(blockKeyString)));
        const blockSize = Math.min(32, inputBytes.length - i);
        for (let b = 0; b < blockSize; b++) {
            outputBytes[i + b] = inputBytes[i + b] ^ blockKeyBytes[b];
        }
    }

    return new TextDecoder().decode(outputBytes);
}
