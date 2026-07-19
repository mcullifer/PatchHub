export type UpdateFeedPostListItem = {
	id: string;
	title: string;
	dateLabel: string;
	isSelected: boolean;
	badgeLabel?: string;
};

export type UpdateFeedMetaItem = {
	label?: string;
	value: string | number;
};

export type UpdateFeedBadge = {
	label: string;
	tone?: 'info' | 'warning';
};
