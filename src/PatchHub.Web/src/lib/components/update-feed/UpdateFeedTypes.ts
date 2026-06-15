export type UpdateFeedPostListItem = {
	id: string;
	title: string;
	dateLabel: string;
	summary: string;
	isSelected: boolean;
};

export type UpdateFeedStat = {
	label: string;
	value: string | number;
};

export type UpdateFeedMetaItem = {
	label: string;
	value: string | number;
};
