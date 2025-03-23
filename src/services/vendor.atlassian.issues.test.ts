import atlassianIssuesService from './vendor.atlassian.issues.service.js';
import { getAtlassianCredentials } from '../utils/transport.util.js';
import { config } from '../utils/config.util.js';

describe('Vendor Atlassian Issues Service', () => {
	// Load configuration and skip all tests if Atlassian credentials are not available
	beforeAll(() => {
		// Load configuration from all sources
		config.load();

		const credentials = getAtlassianCredentials();
		if (!credentials) {
			console.warn(
				'Skipping Atlassian Issues tests: No credentials available',
			);
		}
	});

	describe('search', () => {
		it('should return a list of issues', async () => {
			// Check if credentials are available
			const credentials = getAtlassianCredentials();
			if (!credentials) {
				return; // Skip this test if no credentials
			}

			// Call the function with the real API
			const result = await atlassianIssuesService.search({
				jql: 'created >= -30d',
				maxResults: 5,
			});

			// Verify the response structure
			expect(result).toHaveProperty('issues');
			expect(Array.isArray(result.issues)).toBe(true);
			expect(result).toHaveProperty('total');
			expect(result).toHaveProperty('maxResults');
			expect(result).toHaveProperty('startAt');

			// If issues are returned, verify their structure
			if (result.issues.length > 0) {
				const issue = result.issues[0];
				expect(issue).toHaveProperty('id');
				expect(issue).toHaveProperty('key');
				expect(issue).toHaveProperty('self');
				expect(issue).toHaveProperty('fields');
				expect(issue.fields).toHaveProperty('project');
			}
		}, 15000);

		it('should handle pagination parameters', async () => {
			// Check if credentials are available
			const credentials = getAtlassianCredentials();
			if (!credentials) {
				return; // Skip this test if no credentials
			}

			// Call the function with pagination parameters
			const result = await atlassianIssuesService.search({
				maxResults: 2,
				startAt: 0,
			});

			// Verify pagination parameters are respected
			expect(result.maxResults).toBe(2);
			expect(result.startAt).toBe(0);
		}, 15000);
	});

	describe('get', () => {
		it('should return issue details', async () => {
			// Check if credentials are available
			const credentials = getAtlassianCredentials();
			if (!credentials) {
				return; // Skip this test if no credentials
			}

			// First get an issue key from search
			const searchResult = await atlassianIssuesService.search({
				maxResults: 1,
			});

			// Skip if no issues found
			if (searchResult.issues.length === 0) {
				console.warn('Skipping issue details test: No issues found');
				return;
			}

			const issueKey = searchResult.issues[0].key;

			// Call the function with the real API
			const result = await atlassianIssuesService.get(issueKey);

			// Verify the response structure
			expect(result).toHaveProperty('id');
			expect(result).toHaveProperty('key');
			expect(result).toHaveProperty('self');
			expect(result).toHaveProperty('fields');
			expect(result.fields).toHaveProperty('project');

			// Verify the issue key matches
			expect(result.key).toBe(issueKey);
		}, 15000);

		it('should handle field parameters', async () => {
			// Check if credentials are available
			const credentials = getAtlassianCredentials();
			if (!credentials) {
				return; // Skip this test if no credentials
			}

			// First get an issue key from search
			const searchResult = await atlassianIssuesService.search({
				maxResults: 1,
			});

			// Skip if no issues found
			if (searchResult.issues.length === 0) {
				console.warn('Skipping issue details test: No issues found');
				return;
			}

			const issueKey = searchResult.issues[0].key;

			// Call the function with specific fields
			const result = await atlassianIssuesService.get(issueKey, {
				fields: ['summary', 'status'],
			});

			// Verify only requested fields are present
			expect(result.fields).toHaveProperty('summary');
			expect(result.fields).toHaveProperty('status');
		}, 15000);
	});
});
