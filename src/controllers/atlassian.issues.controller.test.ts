import atlassianIssuesController from './atlassian.issues.controller.js';
import { config } from '../utils/config.util.js';
import { getAtlassianCredentials } from '../utils/transport.util.js';

describe('Atlassian Issues Controller', () => {
	// Load configuration and check for credentials before running tests
	beforeAll(() => {
		// Load configuration
		config.load();

		// Check if Atlassian credentials are available
		const credentials = getAtlassianCredentials();
		if (!credentials) {
			console.warn('Atlassian credentials are required for these tests.');
		}
	});

	describe('list', () => {
		it('should format issues list correctly', async () => {
			// Skip test if credentials are not available
			const credentials = getAtlassianCredentials();
			if (!credentials) {
				console.warn(
					'Skipping test: Atlassian credentials are required.',
				);
				return;
			}

			// Call the controller
			const result = await atlassianIssuesController.list();

			// Verify the response structure
			expect(result).toBeDefined();
			expect(typeof result.content).toBe('string');
			expect(result.content).toContain('# Jira Issues');

			// Check if pagination is handled correctly
			if (result.pagination) {
				expect(typeof result.pagination.hasMore).toBe('boolean');
				if (result.pagination.hasMore) {
					expect(result.pagination.nextCursor).toBeDefined();
				}
			}
		}, 15000);

		it('should handle pagination parameters', async () => {
			// Skip test if credentials are not available
			const credentials = getAtlassianCredentials();
			if (!credentials) {
				console.warn(
					'Skipping test: Atlassian credentials are required.',
				);
				return;
			}

			// Call the controller with pagination parameters
			const result = await atlassianIssuesController.list({
				limit: 10,
				cursor: '0',
			});

			// Verify the response structure
			expect(result).toBeDefined();
			expect(typeof result.content).toBe('string');

			// Check if pagination is handled correctly
			if (result.pagination && result.pagination.hasMore) {
				expect(result.pagination.nextCursor).toBeDefined();
				expect(
					parseInt(result.pagination.nextCursor as string, 10),
				).toBe(10);
			}
		}, 15000);

		it('should handle filtering parameters', async () => {
			// Skip test if credentials are not available
			const credentials = getAtlassianCredentials();
			if (!credentials) {
				console.warn(
					'Skipping test: Atlassian credentials are required.',
				);
				return;
			}

			// Call the controller with filtering parameters
			const result = await atlassianIssuesController.list({
				jql: 'project is not empty',
			});

			// Verify the response structure
			expect(result).toBeDefined();
			expect(typeof result.content).toBe('string');
			expect(result.content).toContain('# Jira Issues');
		}, 15000);
	});

	describe('get', () => {
		it('should format issue details correctly', async () => {
			// Skip test if credentials are not available
			const credentials = getAtlassianCredentials();
			if (!credentials) {
				console.warn(
					'Skipping test: Atlassian credentials are required.',
				);
				return;
			}

			// First, get an issue key from the list
			const listResult = await atlassianIssuesController.list({
				limit: 1,
			});
			expect(listResult).toBeDefined();
			expect(typeof listResult.content).toBe('string');

			// Extract an issue key from the result
			const match = listResult.content.match(/\w+-\d+/);
			expect(match).toBeDefined();
			const issueKey = match ? match[0] : '';
			expect(issueKey).toBeTruthy();

			// Call the controller with the issue key
			const result = await atlassianIssuesController.get(issueKey);

			// Verify the response structure
			expect(result).toBeDefined();
			expect(typeof result.content).toBe('string');
			expect(result.content).toContain(issueKey);
			expect(result.content).toContain('# Jira Issue:');
		}, 15000);

		it('should include optional fields when requested', async () => {
			// Skip test if credentials are not available
			const credentials = getAtlassianCredentials();
			if (!credentials) {
				console.warn(
					'Skipping test: Atlassian credentials are required.',
				);
				return;
			}

			// First, get an issue key from the list
			const listResult = await atlassianIssuesController.list({
				limit: 1,
			});
			expect(listResult).toBeDefined();

			// Extract an issue key from the result
			const match = listResult.content.match(/\w+-\d+/);
			expect(match).toBeDefined();
			const issueKey = match ? match[0] : '';
			expect(issueKey).toBeTruthy();

			// Call the controller with the issue key and optional fields
			const result = await atlassianIssuesController.get(issueKey, {
				includeComments: true,
				includeAttachments: true,
				includeWorklog: true,
			});

			// Verify the response structure
			expect(result).toBeDefined();
			expect(typeof result.content).toBe('string');
		}, 15000);

		it('should handle non-existent issue gracefully', async () => {
			// Skip test if credentials are not available
			const credentials = getAtlassianCredentials();
			if (!credentials) {
				console.warn(
					'Skipping test: Atlassian credentials are required.',
				);
				return;
			}

			// Call the controller with a non-existent issue key
			try {
				await atlassianIssuesController.get('NONEXISTENT-99999');
				// If we get here, the test should fail
				expect(true).toBe(false);
			} catch (error) {
				// Verify that an error was thrown
				expect(error).toBeDefined();
				expect(error).toHaveProperty('statusCode', 404);
			}
		}, 15000);
	});
});
