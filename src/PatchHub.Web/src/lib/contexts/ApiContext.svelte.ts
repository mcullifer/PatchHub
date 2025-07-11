import { ApiService } from '$lib/services/ApiService';
import { getContext, setContext } from 'svelte';

const CTX = 'API_CTX';

export function getApiContext() {
	return getContext<ApiService>(CTX);
}

export function setApiContext() {
	return setContext<ApiService>(CTX, new ApiService());
}
