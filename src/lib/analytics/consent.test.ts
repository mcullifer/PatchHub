import { describe, expect, it } from 'vitest';
import {
	analyticsCaptureAllowed,
	parseAnalyticsConsent,
	requiresAnalyticsConsent
} from './consent';

describe('parseAnalyticsConsent', () => {
	it('accepts the supported cookie values', () => {
		expect(parseAnalyticsConsent('granted')).toBe('granted');
		expect(parseAnalyticsConsent('denied')).toBe('denied');
	});

	it('rejects absent and unknown cookie values', () => {
		expect(parseAnalyticsConsent(undefined)).toBeNull();
		expect(parseAnalyticsConsent('unknown')).toBeNull();
	});
});

describe('requiresAnalyticsConsent', () => {
	it('requires consent for EU requests', () => {
		expect(requiresAnalyticsConsent('DE', true)).toBe(true);
	});

	it.each(['GB', 'IS', 'LI', 'NO'])('requires consent for %s', (country) => {
		expect(requiresAnalyticsConsent(country, false)).toBe(true);
	});

	it('does not require consent for a known country outside the UK and EEA', () => {
		expect(requiresAnalyticsConsent('US', false)).toBe(false);
	});

	it.each([undefined, 'T1', 't1', 'XX', 'xx'])(
		'defaults unknown location %s to consent required',
		(country) => {
			expect(requiresAnalyticsConsent(country, false)).toBe(true);
		}
	);
});

describe('analyticsCaptureAllowed', () => {
	it('allows analytics by default outside consent-required regions', () => {
		expect(analyticsCaptureAllowed(false, null)).toBe(true);
	});

	it('waits for consent in consent-required regions', () => {
		expect(analyticsCaptureAllowed(true, null)).toBe(false);
		expect(analyticsCaptureAllowed(true, 'granted')).toBe(true);
	});

	it('respects a denial in every region', () => {
		expect(analyticsCaptureAllowed(false, 'denied')).toBe(false);
		expect(analyticsCaptureAllowed(true, 'denied')).toBe(false);
	});
});
