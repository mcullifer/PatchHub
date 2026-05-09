import { parseNvidiaDriverSearchHtml } from '$lib/server/software/NvidiaDriverSearchAdapter';
import { describe, expect, it } from 'vitest';

describe('NvidiaDriverSearchAdapter', () => {
	it('parses Game Ready driver search results', () => {
		const entries = parseNvidiaDriverSearchHtml(`
			<tr id="driverList">
				<td class="gridItem driverName">
					<b><a href='//www.nvidia.com/download/driverResults.aspx/267256/en-us'>GeForce Game Ready Driver</a>&nbsp;<sup>WHQL</sup></b>
				</td>
				<td class="gridItem">596.36</td>
				<td class="gridItem" nowrap>April 28, 2026</td>
			</tr>
			<tr id="tr_267256" class="driverInfoBox">
				<td>
					<b>Release Highlights:</b><br>
					<strong>Game Ready for Conan Exiles Enhanced</strong><br>
					This new Game Ready Driver provides the best gaming experience for the latest new games supporting DLSS 4.5 technology including Conan Exiles Enhanced.<br>
					<strong>Gaming Technology</strong><br>
					<ul><li>Adds support for the GeForce RTX 5070 Laptop GPU (12GB)</li></ul>
					<strong>Fixed Gaming Bugs</strong><br>
					<ul>
						<li>God of War: Ragnarok: Certain textures may intermittently flash white during gameplay. [5856704]</li>
						<li>Assassins Creed Shadows: Flickering on character model clothing [5987951]</li>
					</ul>
					<strong>Fixed General Bugs</strong><br>
					<ul><li>Blocky artifacts when playing back H.264 content with DXVA 2.0 [6058551]</li></ul>
					<a href="https://www.nvidia.com/en-us/geforce/news/conan-exiles-enhanced-geforce-game-ready-driver/">Learn more in our Game Ready Driver article here.</a>
				</td>
			</tr>
		`);

		expect(entries).toHaveLength(1);
		expect(entries[0]).toMatchObject({
			id: 'nvidia-game-ready-driver-596.36',
			title: 'GeForce Game Ready Driver 596.36',
			sourceUrl: 'https://www.nvidia.com/download/driverResults.aspx/267256/en-us',
			publishedAt: '2026-04-28T05:00:00.000Z',
			authors: ['NVIDIA'],
			metadata: {
				updateType: 'Game Ready Driver',
				driverVersion: '596.36'
			}
		});
		expect(entries[0].summary).toContain('Game Ready for Conan Exiles Enhanced');
		expect(entries[0].contentHtml).toContain('<h3>Fixed Gaming Bugs</h3>');
		expect(entries[0].contentHtml).toContain(
			'<li>God of War: Ragnarok: Certain textures may intermittently flash white during gameplay. [5856704]</li>'
		);
	});
});
