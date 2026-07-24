export type ExternalItemSearchResult =
	| {
			type: 'steam';
			appid: number;
			name: string;
			slug: string;
	  }
	| {
			type: 'software';
			name: string;
			slug: string;
	  };
