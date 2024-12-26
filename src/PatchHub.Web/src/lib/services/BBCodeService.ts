import { BBToHTML } from '$lib/models/BBCode';

export class BBCodeService {
	static readonly steamClanImgUrl = 'https://clan.akamai.steamstatic.com/images/';

	static bbcodeToHtml(bbcode: string): string {
		let html = bbcode;
		for (const bbTag in BBToHTML) {
			html = html.replaceAll(bbTag, BBToHTML[bbTag]);
		}

		// Handle special cases like [url=...]...[/url]
		// it also needs to handle the case when it's just [url]...[/url]
		// html = html.replace(/\[url\](.*?)\[\/url\]/gi, '<a href="$1">$1</a>');
		html = html.replace(/\[url=(.*?)\](.*?)\[\/url\]/gi, '<a href="$1">$2</a>');

		// Handle list items and ensure closing </li> tags
		html = html.replace(/\[\*\](.*?)($|\[\*\]|\[\/list\])/g, '<li>$1</li>$2');

		// Handle [previewyoutube=...]...[/previewyoutube] with a preview
		html = html.replace(
			/\[previewyoutube=(.*?);.*?\](.*?)\[\/previewyoutube\]/g,
			(match, videoId) => {
				const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
				const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
				return `
				<div>
					<a href="${videoUrl}" target="_blank">
						<img src="${thumbnailUrl}" alt="YouTube Video Thumbnail" style="margin-left: auto;margin-right:auto;">
					</a>
				</div>`;
			}
		);

		// Handle [color=...]...[/color] blocks
		// Example: [color=#FF474D]Old[/color] -> <span style="color:#FF474D">Old</span>
		html = html.replace(/\[color=(.*?)\](.*?)\[\/color\]/g, '<span style="color:$1">$2</span>');

		html = html.replaceAll('{STEAM_CLAN_IMAGE}', this.steamClanImgUrl);
		return html;
	}
}
