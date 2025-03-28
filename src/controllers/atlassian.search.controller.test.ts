import atlassianSearchController from './atlassian.search.controller.js';
import { getAtlassianCredentials } from '../utils/transport.util.js';
import { config } from '../utils/config.util.js';
import atlassianRepositoriesController from './atlassian.repositories.controller.js';
import atlassianWorkspacesController from './atlassian.workspaces.controller.js';

describe('Atlassian Search Controller', () => {
	// Load configuration and check for credentials before all tests
	beforeAll(() => {
		config.load(); // Ensure config is loaded
		const credentials = getAtlassianCredentials();
		if (!credentials) {
			console.warn(
				'Skipping Atlassian Search Controller tests: No credentials available',
			);
		}
	});

	// Helper function to skip tests when credentials are missing
	const skipIfNoCredentials = () => !getAtlassianCredentials();

	// Helper to get valid repository information for testing
	async function getRepositoryInfo(): Promise<{
		workspaceSlug: string;
		repoSlug: string;
	} | null> {
		if (skipIfNoCredentials()) return null;

		try {
			// First get a workspace
			const workspacesResult = await atlassianWorkspacesController.list({
				limit: 1,
			});

			if (workspacesResult.content === 'No Bitbucket workspaces found.') {
				return null;
			}

			// Extract workspace slug
			const workspaceMatch = workspacesResult.content.match(
				/\*\*Slug\*\*:\s+([^\s\n]+)/,
			);
			const workspaceSlug = workspaceMatch ? workspaceMatch[1] : null;

			if (!workspaceSlug) return null;

			// Get a repository from this workspace
			const reposResult = await atlassianRepositoriesController.list({
				workspaceSlug,
				limit: 1,
			});

			if (
				reposResult.content ===
				'No repositories found in this workspace.'
			) {
				return null;
			}

			// Extract repo slug
			const repoSlugMatch = reposResult.content.match(
				/\*\*Slug\*\*:\s+([^\s\n]+)/,
			);
			const repoSlug = repoSlugMatch ? repoSlugMatch[1] : null;

			if (!repoSlug) return null;

			return { workspaceSlug, repoSlug };
		} catch (error) {
			console.warn(
				'Could not fetch repository info for search tests:',
				error,
			);
			return null;
		}
	}

	describe('search', () => {
		it('should search across all scopes when scope=all', async () => {
			if (skipIfNoCredentials()) return;

			const repoInfo = await getRepositoryInfo();
			if (!repoInfo) {
				console.warn('Skipping test: No repository info found.');
				return;
			}

			const result = await atlassianSearchController.search({
				workspaceSlug: repoInfo.workspaceSlug,
				repoSlug: repoInfo.repoSlug,
				scope: 'all',
			});

			// Verify the response structure
			expect(result).toHaveProperty('content');
			expect(typeof result.content).toBe('string');
			expect(result).toHaveProperty('pagination');

			// Should include both repository and PR sections
			expect(result.content).toContain('# Repository Search Results');
			expect(result.content).toContain('# Pull Request Search Results');

			// Should have a summary section
			expect(result.content).toContain('## Search Summary');
			expect(result.content).toContain(`Found `);
			expect(result.content).toContain(
				`in workspace "${repoInfo.workspaceSlug}"`,
			);
		}, 30000);

		it('should search only repositories when scope=repositories', async () => {
			if (skipIfNoCredentials()) return;

			const repoInfo = await getRepositoryInfo();
			if (!repoInfo) {
				console.warn('Skipping test: No repository info found.');
				return;
			}

			const result = await atlassianSearchController.search({
				workspaceSlug: repoInfo.workspaceSlug,
				scope: 'repositories',
			});

			// Verify the response structure
			expect(result).toHaveProperty('content');
			expect(typeof result.content).toBe('string');
			expect(result).toHaveProperty('pagination');

			// Should include only repository section
			expect(result.content).toContain('# Repository Search Results');
			expect(result.content).not.toContain(
				'# Pull Request Search Results',
			);

			// Should have a summary section
			expect(result.content).toContain('## Search Summary');
		}, 30000);

		it('should search only pull requests when scope=pullrequests', async () => {
			if (skipIfNoCredentials()) return;

			const repoInfo = await getRepositoryInfo();
			if (!repoInfo) {
				console.warn('Skipping test: No repository info found.');
				return;
			}

			const result = await atlassianSearchController.search({
				workspaceSlug: repoInfo.workspaceSlug,
				repoSlug: repoInfo.repoSlug,
				scope: 'pullrequests',
			});

			// Verify the response structure
			expect(result).toHaveProperty('content');
			expect(typeof result.content).toBe('string');
			expect(result).toHaveProperty('pagination');

			// Should include only PR section
			expect(result.content).not.toContain('# Repository Search Results');
			expect(result.content).toContain('# Pull Request Search Results');

			// Should have a summary section
			expect(result.content).toContain('## Search Summary');
		}, 30000);

		it('should filter results with query parameter', async () => {
			if (skipIfNoCredentials()) return;

			const repoInfo = await getRepositoryInfo();
			if (!repoInfo) {
				console.warn('Skipping test: No repository info found.');
				return;
			}

			// Use a query that might match something (repository name itself often works)
			const result = await atlassianSearchController.search({
				workspaceSlug: repoInfo.workspaceSlug,
				query: repoInfo.repoSlug,
				scope: 'repositories',
			});

			// Verify the response structure
			expect(result).toHaveProperty('content');
			expect(typeof result.content).toBe('string');

			// Should mention the query in the summary
			expect(result.content).toContain(
				`for query "${repoInfo.repoSlug}"`,
			);

			// If results are found, content should include the query term
			if (result.pagination?.count && result.pagination.count > 0) {
				expect(result.content.toLowerCase()).toContain(
					repoInfo.repoSlug.toLowerCase(),
				);
			}
		}, 30000);

		it('should handle pagination options (limit/cursor)', async () => {
			if (skipIfNoCredentials()) return;

			const repoInfo = await getRepositoryInfo();
			if (!repoInfo) {
				console.warn('Skipping test: No repository info found.');
				return;
			}

			// Fetch first page with limit 1
			const result1 = await atlassianSearchController.search({
				workspaceSlug: repoInfo.workspaceSlug,
				scope: 'repositories',
				limit: 1,
			});

			// If pagination is possible, test cursor-based pagination
			if (result1.pagination?.hasMore && result1.pagination.nextCursor) {
				const result2 = await atlassianSearchController.search({
					workspaceSlug: repoInfo.workspaceSlug,
					scope: 'repositories',
					limit: 1,
					cursor: result1.pagination.nextCursor,
				});

				// Both responses should have proper structure
				expect(result2).toHaveProperty('content');
				expect(result2).toHaveProperty('pagination');

				// The content should be different
				expect(result1.content).not.toEqual(result2.content);
			} else {
				console.warn(
					'Skipping cursor part of pagination test: Either no second page available or no items found.',
				);
			}
		}, 30000);

		it('should throw an McpError for missing workspaceSlug', async () => {
			if (skipIfNoCredentials()) return;

			// Expect the controller call to reject due to missing workspaceSlug
			await expect(
				atlassianSearchController.search({
					scope: 'repositories',
				}),
			).rejects.toThrow(/workspaceSlug is required/i);
		}, 10000);

		it('should work without a repoSlug when scope=repositories', async () => {
			if (skipIfNoCredentials()) return;

			const repoInfo = await getRepositoryInfo();
			if (!repoInfo) {
				console.warn('Skipping test: No repository info found.');
				return;
			}

			// Should not throw an error when repoSlug is missing but scope is repositories
			const result = await atlassianSearchController.search({
				workspaceSlug: repoInfo.workspaceSlug,
				scope: 'repositories',
			});

			// Verify the response structure
			expect(result).toHaveProperty('content');
			expect(typeof result.content).toBe('string');
			expect(result).toHaveProperty('pagination');
		}, 30000);

		it('should require repoSlug when scope=pullrequests', async () => {
			if (skipIfNoCredentials()) return;

			const repoInfo = await getRepositoryInfo();
			if (!repoInfo) {
				console.warn('Skipping test: No repository info found.');
				return;
			}

			// When searching pull requests, requesting without a repoSlug should
			// still work (not throw) but PR section will be empty
			const result = await atlassianSearchController.search({
				workspaceSlug: repoInfo.workspaceSlug,
				scope: 'pullrequests',
				// Intentionally omit repoSlug
			});

			// Content should not include PR section (since repoSlug is missing)
			expect(result.content).not.toContain(
				'# Pull Request Search Results',
			);
		}, 10000);

		it('should handle no results scenario', async () => {
			if (skipIfNoCredentials()) return;

			const repoInfo = await getRepositoryInfo();
			if (!repoInfo) {
				console.warn('Skipping test: No repository info found.');
				return;
			}

			// Use a query string that will definitely not match anything
			const noMatchQuery = 'xzqwxtrv12345xyz987nonexistentstring';

			const result = await atlassianSearchController.search({
				workspaceSlug: repoInfo.workspaceSlug,
				query: noMatchQuery,
				scope: 'all',
				repoSlug: repoInfo.repoSlug,
			});

			// Verify the response structure
			expect(result).toHaveProperty('content');
			expect(typeof result.content).toBe('string');
			expect(result).toHaveProperty('pagination');

			// Content should show no results
			expect(result.content).toContain('Found 0 results');
			expect(result.pagination?.count).toBe(0);
			expect(result.pagination?.hasMore).toBe(false);
		}, 30000);

		it('should handle errors in underlying controllers', async () => {
			if (skipIfNoCredentials()) return;

			const invalidWorkspace =
				'this-workspace-definitely-does-not-exist-12345';

			// Expect the controller call to reject when underlying controllers fail
			await expect(
				atlassianSearchController.search({
					workspaceSlug: invalidWorkspace,
					scope: 'repositories',
				}),
			).rejects.toThrow();
		}, 30000);
	});
});
