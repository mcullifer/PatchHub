export type UpdateFeedPostListItem = {
	id: string;
	title: string;
	dateLabel: string;
	summary: string;
	icon: string;
	isSelected: boolean;
};

export type UpdateFeedStat = {
	label: string;
	value: string | number;
};
