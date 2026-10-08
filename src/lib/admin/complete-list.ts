// Não confundir uma página limitada pela API com o conjunto completo.
export async function completeList<T>(page: (from: number, to: number) => PromiseLike<{
  data: T[] | null; error: unknown; count: number | null;
}>) {
  const rows: T[] = [];
  let total: number | null = null;
  do {
    const result = await page(rows.length, rows.length + 199);
    if (result.error || !result.data || result.count === null
      || (total !== null && total !== result.count)) return { data: [] as T[], error: true };
    total = result.count;
    if (!result.data.length && rows.length < total) return { data: [] as T[], error: true };
    rows.push(...result.data);
  } while (rows.length < total);
  return { data: rows, error: false };
}
