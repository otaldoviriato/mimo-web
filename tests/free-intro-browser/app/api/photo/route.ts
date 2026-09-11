import { readFile } from 'node:fs/promises';
import path from 'node:path';

export async function GET() {
    return new Response(await readFile(path.resolve(process.cwd(), 'public/assets/isabella.png')), { headers: { 'Content-Type': 'image/png' } });
}
