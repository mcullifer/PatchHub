import { Time } from '$lib/util/time';

export const UPSTREAM_FETCH_OPTIONS = {
	timeoutMs: Time.SECOND * 10,
	maxBytes: 2_000_000,
	userAgent: 'PatchHub/beta'
} as const;

export async function boundedFetch(
	fetchFn: typeof fetch,
	url: string,
	opts: { timeoutMs: number; maxBytes: number; userAgent?: string }
): Promise<Response> {
	const controller = new AbortController();
	const timeoutError = new Error(`Request timed out after ${opts.timeoutMs}ms`);
	const timeout = setTimeout(() => controller.abort(timeoutError), opts.timeoutMs);

	try {
		const headers = new Headers();
		if (opts.userAgent) headers.set('user-agent', opts.userAgent);

		const response = await fetchFn(url, { headers, signal: controller.signal });
		assertContentLength(response, opts.maxBytes);
		const body = await readResponseBody(response, opts.maxBytes);

		return new Response(body, {
			status: response.status,
			statusText: response.statusText,
			headers: response.headers
		});
	} catch (error) {
		controller.abort();
		throw error;
	} finally {
		clearTimeout(timeout);
	}
}

function assertContentLength(response: Response, maxBytes: number): void {
	const contentLength = response.headers.get('content-length');
	if (!contentLength) return;

	const size = Number(contentLength);
	if (Number.isFinite(size) && size > maxBytes) {
		throw new Error(`Response exceeds ${maxBytes} byte limit`);
	}
}

async function readResponseBody(response: Response, maxBytes: number): Promise<ArrayBuffer | null> {
	if (!response.body) return null;

	const reader = response.body.getReader();
	const chunks: Uint8Array[] = [];
	let size = 0;

	while (true) {
		const { done, value } = await reader.read();
		if (done) break;

		size += value.byteLength;
		if (size > maxBytes) {
			throw new Error(`Response exceeds ${maxBytes} byte limit`);
		}
		chunks.push(value);
	}

	const body = new Uint8Array(size);
	let offset = 0;
	for (const chunk of chunks) {
		body.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return body.buffer;
}
