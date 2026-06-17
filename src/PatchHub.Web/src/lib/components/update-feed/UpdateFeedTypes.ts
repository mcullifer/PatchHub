export type UpdateFeedPostListItem = {
	id: string;
	title: string;
	dateLabel: string;
	summary?: string;
	isSelected: boolean;
};

export type UpdateFeedMetaItem = {
	label: string;
	value: string | number;
};
