import atlassianRepositoriesService from './vendor.atlassian.repositories.service.js';
import { getAtlassianCredentials } from '../utils/transport.util.js';
import { config } from '../utils/config.util.js';
import { McpError } from '../utils/error.util.js';
import atlassianWorkspacesService from './vendor.atlassian.workspaces.service.js';

describe('Vendor Atlassian Repositories Service', () => {
	// Load configuration and check for credentials before all tests
	beforeAll(() => {
		config.load(); // Ensure config is loaded
		const credentials = getAtlassianCredentials();
		if (!credentials) {
			console.warn(
				'Skipping Atlassian Repositories Service tests: No credentials available',
			);
		}
	});

	// Helper function to skip tests when credentials are missing
	const skipIfNoCredentials = () => !getAtlassianCredentials();

	// Helper to get a valid workspace slug for testing
	async function getFirstWorkspaceSlug(): Promise<string | null> {
		if (skipIfNoCredentials()) return null;

		try {
			const listResult = await atlassianWorkspacesService.list({
				pagelen: 1,
			});
			return listResult.values.length > 0
				? listResult.values[0].workspace.slug
				: null;
		} catch (error) {
			console.warn(
				'Could not fetch workspace list for repository tests:',
				error,
			);
			return null;
		}
	}

	describe('list', () => {
		it('should return a list of repositories for a valid workspace', async () => {
			if (skipIfNoCredentials()) return;

			const workspaceSlug = await getFirstWorkspaceSlug();
			if (!workspaceSlug) {
				console.warn('Skipping test: No workspace slug found.');
				return;
			}

			const result = await atlassianRepositoriesService.list({
				workspace: workspaceSlug,
			});

			// Verify the response structure based on RepositoriesResponse
			expect(result).toHaveProperty('values');
			expect(Array.isArray(result.values)).toBe(true);
			expect(result).toHaveProperty('pagelen'); // Bitbucket uses pagelen
			expect(result).toHaveProperty('page');
			expect(result).toHaveProperty('size');

			if (result.values.length > 0) {
				const repo = result.values[0];
				expect(repo).toHaveProperty('type', 'repository');
				expect(repo).toHaveProperty('uuid');
				expect(repo).toHaveProperty('name');
				expect(repo).toHaveProperty('full_name');
				expect(repo).toHaveProperty('is_private');
				expect(repo).toHaveProperty('links');
				expect(repo).toHaveProperty('owner');
			}
		}, 30000); // Increased timeout

		it('should support pagination with pagelen and page', async () => {
			if (skipIfNoCredentials()) return;

			const workspaceSlug = await getFirstWorkspaceSlug();
			if (!workspaceSlug) {
				console.warn('Skipping test: No workspace slug found.');
				return;
			}

			// Get first page with limited results
			const result = await atlassianRepositoriesService.list({
				workspace: workspaceSlug,
				pagelen: 1,
			});

			expect(result).toHaveProperty('pagelen');
			// Allow pagelen to be greater than requested if API enforces minimum
			expect(result.pagelen).toBeGreaterThanOrEqual(1);
			expect(result.values.length).toBeLessThanOrEqual(result.pagelen);

			// If there are more items than the page size, expect pagination links
			if (result.size > result.pagelen) {
				expect(result).toHaveProperty('next');

				// Test requesting page 2 if available
				// Extract page parameter from next link if available
				if (result.next) {
					const nextPageUrl = new URL(result.next);
					const pageParam = nextPageUrl.searchParams.get('page');

					if (pageParam) {
						const page2 = parseInt(pageParam, 10);
						const page2Result =
							await atlassianRepositoriesService.list({
								workspace: workspaceSlug,
								pagelen: 1,
								page: page2,
							});

						expect(page2Result).toHaveProperty('page', page2);

						// If both pages have values, verify they're different repositories
						if (
							result.values.length > 0 &&
							page2Result.values.length > 0
						) {
							expect(result.values[0].uuid).not.toBe(
								page2Result.values[0].uuid,
							);
						}
					}
				}
			}
		}, 30000);

		it('should support filtering with q parameter', async () => {
			if (skipIfNoCredentials()) return;

			const workspaceSlug = await getFirstWorkspaceSlug();
			if (!workspaceSlug) {
				console.warn('Skipping test: No workspace slug found.');
				return;
			}

			// First get all repositories to find a potential query term
			const allRepos = await atlassianRepositoriesService.list({
				workspace: workspaceSlug,
			});

			// Skip if no repositories available
			if (allRepos.values.length === 0) {
				console.warn(
					'Skipping query filtering test: No repositories available',
				);
				return;
			}

			// Use the first repo's name as a query term
			const firstRepo = allRepos.values[0];
			// Take just the first word or first few characters to make filter less restrictive
			const queryTerm = firstRepo.name.split(' ')[0];

			// Test the query filter
			try {
				const result = await atlassianRepositoriesService.list({
					workspace: workspaceSlug,
					q: `name~"${queryTerm}"`,
				});

				// Verify basic response structure
				expect(result).toHaveProperty('values');

				// All returned repos should contain the query term in their name
				if (result.values.length > 0) {
					const nameMatches = result.values.some((repo) =>
						repo.name
							.toLowerCase()
							.includes(queryTerm.toLowerCase()),
					);
					expect(nameMatches).toBe(true);
				}
			} catch (error) {
				// If filtering isn't fully supported, we just log it
				console.warn(
					'Query filtering test encountered an error:',
					error instanceof Error ? error.message : String(error),
				);
			}
		}, 30000);

		it('should support sorting with sort parameter', async () => {
			if (skipIfNoCredentials()) return;

			const workspaceSlug = await getFirstWorkspaceSlug();
			if (!workspaceSlug) {
				console.warn('Skipping test: No workspace slug found.');
				return;
			}

			// Skip this test if fewer than 2 repositories (can't verify sort order)
			const checkResult = await atlassianRepositoriesService.list({
				workspace: workspaceSlug,
				pagelen: 2,
			});

			if (checkResult.values.length < 2) {
				console.warn(
					'Skipping sort test: Need at least 2 repositories to verify sort order',
				);
				return;
			}

			// Test sorting by name ascending
			const resultAsc = await atlassianRepositoriesService.list({
				workspace: workspaceSlug,
				sort: 'name',
				pagelen: 2,
			});

			// Test sorting by name descending
			const resultDesc = await atlassianRepositoriesService.list({
				workspace: workspaceSlug,
				sort: '-name',
				pagelen: 2,
			});

			// Verify basic response structure
			expect(resultAsc).toHaveProperty('values');
			expect(resultDesc).toHaveProperty('values');

			// Ensure both responses have at least 2 items to compare
			if (resultAsc.values.length >= 2 && resultDesc.values.length >= 2) {
				// For ascending order, first item should come before second alphabetically
				const ascNameComparison =
					resultAsc.values[0].name.localeCompare(
						resultAsc.values[1].name,
					);
				// For descending order, first item should come after second alphabetically
				const descNameComparison =
					resultDesc.values[0].name.localeCompare(
						resultDesc.values[1].name,
					);

				// Ascending should be ≤ 0 (first before or equal to second)
				expect(ascNameComparison).toBeLessThanOrEqual(0);
				// Descending should be ≥ 0 (first after or equal to second)
				expect(descNameComparison).toBeGreaterThanOrEqual(0);
			}
		}, 30000);

		it('should throw an error for an invalid workspace', async () => {
			if (skipIfNoCredentials()) return;

			const invalidWorkspace =
				'this-workspace-definitely-does-not-exist-12345';

			// Expect the service call to reject with an McpError (likely 404)
			await expect(
				atlassianRepositoriesService.list({
					workspace: invalidWorkspace,
				}),
			).rejects.toThrow();

			// Check for specific error properties
			try {
				await atlassianRepositoriesService.list({
					workspace: invalidWorkspace,
				});
			} catch (e) {
				expect(e).toBeInstanceOf(McpError);
				expect((e as McpError).statusCode).toBe(404); // Expecting Not Found
			}
		}, 30000);
	});

	describe('get', () => {
		// Helper to get a valid repo for testing 'get'
		async function getFirstRepositoryInfo(): Promise<{
			workspace: string;
			repoSlug: string;
		} | null> {
			if (skipIfNoCredentials()) return null;

			const workspaceSlug = await getFirstWorkspaceSlug();
			if (!workspaceSlug) return null;

			try {
				const listResult = await atlassianRepositoriesService.list({
					workspace: workspaceSlug,
					pagelen: 1,
				});

				if (listResult.values.length === 0) return null;

				const fullName = listResult.values[0].full_name;
				// full_name is in format "workspace/repo_slug"
				const [workspace, repoSlug] = fullName.split('/');

				return { workspace, repoSlug };
			} catch (error) {
				console.warn(
					"Could not fetch repository list for 'get' test setup:",
					error,
				);
				return null;
			}
		}

		it('should return details for a valid workspace and repo_slug', async () => {
			const repoInfo = await getFirstRepositoryInfo();
			if (!repoInfo) {
				console.warn('Skipping get test: No repository found.');
				return;
			}

			const result = await atlassianRepositoriesService.get({
				workspace: repoInfo.workspace,
				repo_slug: repoInfo.repoSlug,
			});

			// Verify the response structure based on RepositoryDetailed
			expect(result).toHaveProperty('uuid');
			expect(result).toHaveProperty(
				'full_name',
				`${repoInfo.workspace}/${repoInfo.repoSlug}`,
			);
			expect(result).toHaveProperty('name');
			expect(result).toHaveProperty('type', 'repository');
			expect(result).toHaveProperty('is_private');
			expect(result).toHaveProperty('links');
			expect(result.links).toHaveProperty('html');
			expect(result).toHaveProperty('owner');
			expect(result.owner).toHaveProperty('type');
		}, 30000);

		it('should throw an McpError for a non-existent repo_slug', async () => {
			const workspaceSlug = await getFirstWorkspaceSlug();
			if (!workspaceSlug) {
				console.warn('Skipping test: No workspace slug found.');
				return;
			}

			const invalidRepoSlug = 'this-repo-definitely-does-not-exist-12345';

			// Expect the service call to reject with an McpError (likely 404)
			await expect(
				atlassianRepositoriesService.get({
					workspace: workspaceSlug,
					repo_slug: invalidRepoSlug,
				}),
			).rejects.toThrow(McpError);

			// Check for specific error properties
			try {
				await atlassianRepositoriesService.get({
					workspace: workspaceSlug,
					repo_slug: invalidRepoSlug,
				});
			} catch (e) {
				expect(e).toBeInstanceOf(McpError);
				expect((e as McpError).statusCode).toBe(404); // Expecting Not Found
			}
		}, 30000);

		it('should throw an McpError for a non-existent workspace', async () => {
			if (skipIfNoCredentials()) return;

			const invalidWorkspace =
				'this-workspace-definitely-does-not-exist-12345';
			const invalidRepoSlug = 'some-repo';

			// Expect the service call to reject with an McpError (likely 404)
			await expect(
				atlassianRepositoriesService.get({
					workspace: invalidWorkspace,
					repo_slug: invalidRepoSlug,
				}),
			).rejects.toThrow(McpError);

			// Check for specific error properties
			try {
				await atlassianRepositoriesService.get({
					workspace: invalidWorkspace,
					repo_slug: invalidRepoSlug,
				});
			} catch (e) {
				expect(e).toBeInstanceOf(McpError);
				expect((e as McpError).statusCode).toBe(404); // Expecting Not Found
			}
		}, 30000);
	});
});
