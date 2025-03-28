import atlassianWorkspacesController from './atlassian.workspaces.controller.js';
import { getAtlassianCredentials } from '../utils/transport.util.js';
import { config } from '../utils/config.util.js';
import { McpError } from '../utils/error.util.js';

describe('Atlassian Workspaces Controller', () => {
	// Load configuration and check for credentials before all tests
	beforeAll(() => {
		config.load(); // Ensure config is loaded
		const credentials = getAtlassianCredentials();
		if (!credentials) {
			console.warn(
				'Skipping Atlassian Workspaces Controller tests: No credentials available',
			);
		}
	});

	// Helper function to skip tests when credentials are missing
	const skipIfNoCredentials = () => !getAtlassianCredentials();

	describe('list', () => {
		it('should return a formatted list of workspaces in Markdown', async () => {
			if (skipIfNoCredentials()) return;

			const result = await atlassianWorkspacesController.list({});

			// Verify the response structure
			expect(result).toHaveProperty('content');
			expect(typeof result.content).toBe('string');
			expect(result).toHaveProperty('pagination');

			// Basic Markdown content checks
			if (result.content !== 'No Bitbucket workspaces found.') {
				expect(result.content).toMatch(/^# Bitbucket Workspaces/m);
				expect(result.content).toContain('**UUID**');
				expect(result.content).toContain('**Slug**');
				expect(result.content).toContain('**Permission Level**');
			}

			// Verify pagination structure
			expect(result.pagination).toBeDefined();
			expect(result.pagination).toHaveProperty('hasMore');
			expect(typeof result.pagination?.hasMore).toBe('boolean');
			// nextCursor might be undefined if hasMore is false
			if (result.pagination?.hasMore) {
				expect(result.pagination).toHaveProperty('nextCursor');
				expect(typeof result.pagination?.nextCursor).toBe('string');
			}
		}, 30000); // Increased timeout

		it('should handle pagination options (limit/cursor)', async () => {
			if (skipIfNoCredentials()) return;

			// Fetch first page
			const result1 = await atlassianWorkspacesController.list({
				limit: 1,
			});

			expect(result1.pagination?.count).toBeLessThanOrEqual(1);

			// If there's a next page, fetch it
			if (result1.pagination?.hasMore && result1.pagination.nextCursor) {
				const result2 = await atlassianWorkspacesController.list({
					limit: 1,
					cursor: result1.pagination.nextCursor,
				});
				expect(result2.pagination?.count).toBeLessThanOrEqual(1);
				// Ensure content is different (or handle case where only 1 item exists)
				if (
					result1.content !== 'No Bitbucket workspaces found.' &&
					result2.content !== 'No Bitbucket workspaces found.'
				) {
					// Only compare if we actually have multiple workspaces
					expect(result1.content).not.toEqual(result2.content);
				}
			} else {
				console.warn(
					'Skipping cursor part of pagination test: Only one page of workspaces found.',
				);
			}
		}, 30000);
	});

	describe('get', () => {
		// Helper to get a valid slug for testing 'get'
		async function getFirstWorkspaceSlugForController(): Promise<
			string | null
		> {
			if (skipIfNoCredentials()) return null;
			try {
				const listResult = await atlassianWorkspacesController.list({
					limit: 1,
				});
				if (listResult.content === 'No Bitbucket workspaces found.')
					return null;
				// Extract slug from Markdown content
				const slugMatch = listResult.content.match(
					/\*\*Slug\*\*:\s+([^\s\n]+)/,
				);
				return slugMatch ? slugMatch[1] : null;
			} catch (error) {
				console.warn(
					"Could not fetch workspace list for controller 'get' test setup:",
					error,
				);
				return null;
			}
		}

		it('should return formatted details for a valid workspace slug in Markdown', async () => {
			const workspaceSlug = await getFirstWorkspaceSlugForController();
			if (!workspaceSlug) {
				console.warn(
					'Skipping controller get test: No workspace slug found.',
				);
				return;
			}

			const result = await atlassianWorkspacesController.get({
				workspaceSlug,
			});

			// Verify the ControllerResponse structure
			expect(result).toHaveProperty('content');
			expect(typeof result.content).toBe('string');
			expect(result).not.toHaveProperty('pagination'); // 'get' shouldn't have pagination

			// Verify Markdown content
			expect(result.content).toMatch(/^# Workspace:/m);
			expect(result.content).toContain(`**Slug**: ${workspaceSlug}`);
			expect(result.content).toContain('## Basic Information');
			expect(result.content).toContain('## Links');
		}, 30000);

		it('should throw McpError for an invalid workspace slug', async () => {
			if (skipIfNoCredentials()) return;

			const invalidSlug = 'this-slug-definitely-does-not-exist-12345';

			// Expect the controller call to reject with an McpError
			await expect(
				atlassianWorkspacesController.get({
					workspaceSlug: invalidSlug,
				}),
			).rejects.toThrow(McpError);

			// Optionally check the status code via the error handler's behavior
			try {
				await atlassianWorkspacesController.get({
					workspaceSlug: invalidSlug,
				});
			} catch (e) {
				expect(e).toBeInstanceOf(McpError);
				// The controller error handler wraps the service error
				expect((e as McpError).statusCode).toBe(404); // Expecting Not Found
				expect((e as McpError).message).toContain('not found');
			}
		}, 30000);
	});
});
