export async function marketingFetch<T>(url: string, options?: RequestInit): Promise<T> {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.error || 'Não foi possível concluir a operação.');
    }
    return data as T;
}
