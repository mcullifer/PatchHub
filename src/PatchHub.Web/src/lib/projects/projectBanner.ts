export const PROJECT_BANNER_MAX_BYTES = 5 * 1024 * 1024;
export const PROJECT_BANNER_MAX_SIZE_LABEL = '5 MB';
export const PROJECT_BANNER_MIME_TYPES = [
	'image/jpeg',
	'image/png',
	'image/webp',
	'image/gif',
	'image/avif'
] as const;
export const PROJECT_BANNER_ACCEPT = PROJECT_BANNER_MIME_TYPES.join(',');
