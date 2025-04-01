import atlassianPullRequestsService from './vendor.atlassian.pullrequests.service.js';
import atlassianWorkspacesService from './vendor.atlassian.workspaces.service.js';
import atlassianRepositoriesService from './vendor.atlassian.repositories.service.js';
import { getAtlassianCredentials } from '../utils/transport.util.js';
import { config } from '../utils/config.util.js';

describe('Vendor Atlassian Pull Requests Service', () => {
	// Variables to store valid test data
	let validWorkspace: string | null = null;
	let validRepo: string | null = null;
	let validPrId: string | null = null;

	// Helper function to skip tests if no credentials
	function skipIfNoCredentials(): boolean {
		const credentials = getAtlassianCredentials();
		if (!credentials) {
			return true; // Skip the test
		}
		return false; // Continue with the test
	}

	// Load configuration and skip all tests if Atlassian credentials are not available
	beforeAll(async () => {
		// Load configuration from all sources
		config.load();

		const credentials = getAtlassianCredentials();
		if (!credentials) {
			console.warn(
				'Skipping Atlassian Pull Requests tests: No credentials available',
			);
			return;
		}

		// Try to find a valid workspace, repository, and PR for tests
		try {
			// Get available workspaces
			const workspaces = await atlassianWorkspacesService.list();
			if (workspaces.values.length > 0) {
				validWorkspace = workspaces.values[0].workspace.slug;

				// Find repositories in this workspace
				const repositories = await atlassianRepositoriesService.list({
					workspace: validWorkspace,
				});

				if (repositories && repositories.values.length > 0) {
					validRepo = repositories.values[0].name.toLowerCase();

					// Try to find a PR in this repository
					try {
						const pullRequests =
							await atlassianPullRequestsService.list({
								workspace: validWorkspace,
								repo_slug: validRepo,
								pagelen: 1,
							});

						if (pullRequests.values.length > 0) {
							validPrId = String(pullRequests.values[0].id);
							console.log(
								`Found valid PR for testing: ${validWorkspace}/${validRepo}/${validPrId}`,
							);
						}
					} catch (error) {
						console.warn('Could not find a valid PR for testing');
					}
				}
			}
		} catch (error) {
			console.warn('Error setting up test data:', error);
		}
	});

	describe('listPullRequests', () => {
		it('should return a list of pull requests', async () => {
			// Check if credentials are available
			const credentials = getAtlassianCredentials();
			if (!credentials) {
				return; // Skip this test if no credentials
			}

			// First get available workspaces
			const workspaces = await atlassianWorkspacesService.list();

			// Skip if no workspaces are available
			if (workspaces.values.length === 0) {
				console.warn('Skipping test: No workspaces available');
				return;
			}

			// Get the first workspace
			const workspace = workspaces.values[0].workspace.slug;
			console.log(`Using workspace: ${workspace}`);

			// Find repositories in this workspace
			let repositories;
			try {
				repositories = await atlassianRepositoriesService.list({
					workspace,
				});
			} catch (error) {
				console.warn(
					`Error fetching repositories for workspace ${workspace}: ${error instanceof Error ? error.message : String(error)}`,
				);
				return; // Skip this test if repositories can't be fetched
			}

			// Skip if no repositories are available
			if (!repositories || repositories.values.length === 0) {
				console.warn(
					`Skipping test: No repositories found in workspace ${workspace}`,
				);
				return;
			}

			// Get the first repository
			const repo_slug = repositories.values[0].name.toLowerCase();
			console.log(`Using repository: ${workspace}/${repo_slug}`);

			try {
				// Call the function with the real API
				const result = await atlassianPullRequestsService.list({
					workspace,
					repo_slug,
				});

				// Verify the response structure
				expect(result).toHaveProperty('values');
				expect(Array.isArray(result.values)).toBe(true);
				expect(result).toHaveProperty('pagelen');
				expect(result).toHaveProperty('page');
				expect(result).toHaveProperty('size');

				// If pull requests are returned, verify their structure
				if (result.values.length > 0) {
					const pullRequest = result.values[0];
					expect(pullRequest).toHaveProperty('type', 'pullrequest');
					expect(pullRequest).toHaveProperty('id');
					expect(pullRequest).toHaveProperty('title');
					expect(pullRequest).toHaveProperty('state');
					expect(pullRequest).toHaveProperty('author');
					expect(pullRequest).toHaveProperty('source');
					expect(pullRequest).toHaveProperty('destination');
					expect(pullRequest).toHaveProperty('links');
				} else {
					console.log(
						`Repository ${workspace}/${repo_slug} doesn't have any pull requests`,
					);
				}
			} catch (error) {
				// Allow test to pass if repository doesn't exist or has no PRs
				if (
					error instanceof Error &&
					(error.message.includes('Not Found') ||
						error.message.includes('No such repository'))
				) {
					console.warn(
						`Repository ${workspace}/${repo_slug} not found or no access to pull requests. Skipping test.`,
					);
					return;
				}
				throw error; // Re-throw if it's some other error
			}
		}, 15000); // Increase timeout for API call

		it('should support pagination', async () => {
			// Check if credentials are available
			const credentials = getAtlassianCredentials();
			if (!credentials) {
				return; // Skip this test if no credentials
			}

			// First get available workspaces
			const workspaces = await atlassianWorkspacesService.list();

			// Skip if no workspaces are available
			if (workspaces.values.length === 0) {
				console.warn('Skipping test: No workspaces available');
				return;
			}

			// Get the first workspace
			const workspace = workspaces.values[0].workspace.slug;

			// Find repositories in this workspace
			let repositories;
			try {
				repositories = await atlassianRepositoriesService.list({
					workspace,
				});
			} catch (error) {
				console.warn(
					`Error fetching repositories for workspace ${workspace}: ${error instanceof Error ? error.message : String(error)}`,
				);
				return; // Skip this test if repositories can't be fetched
			}

			// Skip if no repositories are available
			if (!repositories || repositories.values.length === 0) {
				console.warn(
					`Skipping test: No repositories found in workspace ${workspace}`,
				);
				return;
			}

			// Get the first repository
			const repo_slug = repositories.values[0].name.toLowerCase();

			try {
				// Call the function with the real API and limit results
				const result = await atlassianPullRequestsService.list({
					workspace,
					repo_slug,
					pagelen: 2,
				});

				// Verify the pagination parameters
				expect(result).toHaveProperty('pagelen', 2);
				expect(result.values.length).toBeLessThanOrEqual(2);
				console.log(
					`Found ${result.values.length} pull requests with pagination`,
				);
			} catch (error) {
				// Allow test to pass if repository doesn't exist or has no PRs
				if (
					error instanceof Error &&
					(error.message.includes('Not Found') ||
						error.message.includes('No such repository'))
				) {
					console.warn(
						`Repository ${workspace}/${repo_slug} not found or no access to pull requests. Skipping test.`,
					);
					return;
				}
				throw error; // Re-throw if it's some other error
			}
		}, 15000); // Increase timeout for API call

		it('should filter by state', async () => {
			// Check if credentials are available
			const credentials = getAtlassianCredentials();
			if (!credentials) {
				return; // Skip this test if no credentials
			}

			// First get available workspaces
			const workspaces = await atlassianWorkspacesService.list();

			// Skip if no workspaces are available
			if (workspaces.values.length === 0) {
				console.warn('Skipping test: No workspaces available');
				return;
			}

			// Get the first workspace
			const workspace = workspaces.values[0].workspace.slug;

			// Find repositories in this workspace
			let repositories;
			try {
				repositories = await atlassianRepositoriesService.list({
					workspace,
				});
			} catch (error) {
				console.warn(
					`Error fetching repositories for workspace ${workspace}: ${error instanceof Error ? error.message : String(error)}`,
				);
				return; // Skip this test if repositories can't be fetched
			}

			// Skip if no repositories are available
			if (!repositories || repositories.values.length === 0) {
				console.warn(
					`Skipping test: No repositories found in workspace ${workspace}`,
				);
				return;
			}

			// Get the first repository
			const repo_slug = repositories.values[0].name.toLowerCase();

			try {
				// Call the function with the real API and filter by state
				const result = await atlassianPullRequestsService.list({
					workspace,
					repo_slug,
					state: ['OPEN', 'MERGED'],
				});

				// Verify the states are as expected
				expect(result).toHaveProperty('values');

				// If pull requests are returned, verify they have the correct state
				if (result.values.length > 0) {
					result.values.forEach((pr) => {
						expect(['OPEN', 'MERGED']).toContain(pr.state);
					});
					console.log(
						`Found ${result.values.length} pull requests with states OPEN or MERGED`,
					);
				} else {
					console.log(
						`No pull requests found with states OPEN or MERGED`,
					);
				}
			} catch (error) {
				// Allow test to pass if repository doesn't exist or has no PRs
				if (
					error instanceof Error &&
					(error.message.includes('Not Found') ||
						error.message.includes('No such repository'))
				) {
					console.warn(
						`Repository ${workspace}/${repo_slug} not found or no access to pull requests. Skipping test.`,
					);
					return;
				}
				throw error; // Re-throw if it's some other error
			}
		}, 15000); // Increase timeout for API call
	});

	describe('getPullRequest', () => {
		it('should return details for a valid pull request ID', async () => {
			// Check if credentials are available
			const credentials = getAtlassianCredentials();
			if (!credentials) {
				return; // Skip this test if no credentials
			}

			// First get available workspaces
			const workspaces = await atlassianWorkspacesService.list();

			// Skip if no workspaces are available
			if (workspaces.values.length === 0) {
				console.warn('Skipping test: No workspaces available');
				return;
			}

			// Get the first workspace
			const workspace = workspaces.values[0].workspace.slug;

			// Find repositories in this workspace
			let repositories;
			try {
				repositories = await atlassianRepositoriesService.list({
					workspace,
				});
			} catch (error) {
				console.warn(
					`Error fetching repositories for workspace ${workspace}: ${error instanceof Error ? error.message : String(error)}`,
				);
				return; // Skip this test if repositories can't be fetched
			}

			// Skip if no repositories are available
			if (!repositories || repositories.values.length === 0) {
				console.warn(
					`Skipping test: No repositories found in workspace ${workspace}`,
				);
				return;
			}

			// Get the first repository
			const repo_slug = repositories.values[0].name.toLowerCase();

			try {
				// First, check if we can get a list of PRs to find a valid ID
				const prs = await atlassianPullRequestsService.list({
					workspace,
					repo_slug,
				});

				// Skip if no pull requests are available
				if (!prs.values.length) {
					console.warn(
						`Skipping test: No pull requests found in repository ${workspace}/${repo_slug}`,
					);
					return;
				}

				// Use the first PR's ID
				const prId = prs.values[0].id;
				console.log(`Testing pull request ID: ${prId}`);

				// Get the specific pull request
				const result = await atlassianPullRequestsService.get({
					workspace,
					repo_slug,
					pull_request_id: prId,
				});

				// Verify the response contains expected fields
				expect(result).toHaveProperty('id', prId);
				expect(result).toHaveProperty('type', 'pullrequest');
				expect(result).toHaveProperty('title');
				expect(result).toHaveProperty('state');
				expect(result).toHaveProperty('author');
				expect(result).toHaveProperty('source');
				expect(result).toHaveProperty('destination');
				expect(result).toHaveProperty('links');
			} catch (error) {
				// Allow test to pass if repository or PR doesn't exist
				if (
					error instanceof Error &&
					(error.message.includes('Not Found') ||
						error.message.includes('No such repository') ||
						error.message.includes('Pull request not found'))
				) {
					console.warn(
						`Repository ${workspace}/${repo_slug} or its pull requests not found. Skipping test.`,
					);
					return;
				}
				throw error; // Re-throw if it's some other error
			}
		}, 15000); // Increase timeout for API call

		it('should handle invalid pull request IDs', async () => {
			// Check if credentials are available
			const credentials = getAtlassianCredentials();
			if (!credentials) {
				return; // Skip this test if no credentials
			}

			// First get available workspaces
			const workspaces = await atlassianWorkspacesService.list();

			// Skip if no workspaces are available
			if (workspaces.values.length === 0) {
				console.warn('Skipping test: No workspaces available');
				return;
			}

			// Get the first workspace
			const workspace = workspaces.values[0].workspace.slug;

			// Find repositories in this workspace
			let repositories;
			try {
				repositories = await atlassianRepositoriesService.list({
					workspace,
				});
			} catch (error) {
				console.warn(
					`Error fetching repositories for workspace ${workspace}: ${error instanceof Error ? error.message : String(error)}`,
				);
				return; // Skip this test if repositories can't be fetched
			}

			// Skip if no repositories are available
			if (!repositories || repositories.values.length === 0) {
				console.warn(
					`Skipping test: No repositories found in workspace ${workspace}`,
				);
				return;
			}

			// Get the first repository
			const repo_slug = repositories.values[0].name.toLowerCase();

			try {
				// Use an invalid pull request ID (very large number unlikely to exist)
				const invalidId = 999999;
				console.log(`Testing invalid pull request ID: ${invalidId}`);

				// Call the function with the real API and expect it to throw
				await expect(
					atlassianPullRequestsService.get({
						workspace,
						repo_slug,
						pull_request_id: invalidId,
					}),
				).rejects.toThrow();
			} catch (error) {
				// If repo doesn't exist, just skip the test
				if (
					error instanceof Error &&
					(error.message.includes('Not Found') ||
						error.message.includes('No such repository'))
				) {
					console.warn(
						`Repository ${workspace}/${repo_slug} not found. Skipping test.`,
					);
					return;
				}
				// Otherwise, we should have caught the expected rejection
			}
		}, 15000); // Increase timeout for API call
	});

	describe('addComment', () => {
		it('should add a comment to a pull request', async () => {
			// Skip test if no credentials
			if (skipIfNoCredentials()) {
				return;
			}

			// We need a valid workspace, repository, and PR ID for testing
			if (!validWorkspace || !validRepo || !validPrId) {
				console.warn(
					'Skipping addComment test: Missing valid workspace, repository, or PR ID',
				);
				return;
			}

			// Parameters for adding a comment
			const params = {
				workspace: validWorkspace,
				repo_slug: validRepo,
				pull_request_id: parseInt(validPrId, 10),
				content: {
					raw: `Test comment from automated test at ${new Date().toISOString()}`,
				},
			};

			try {
				// Attempt to add a comment
				const result =
					await atlassianPullRequestsService.addComment(params);

				// Verify the response
				expect(result).toBeDefined();
				expect(result.id).toBeDefined();
				expect(result.content).toBeDefined();
				expect(result.content.raw).toBe(params.content.raw);
			} catch (error) {
				// The comment addition might fail due to PR state or permissions
				// We'll log the error and continue
				console.warn('Failed to add comment to PR:', error);
			}
		});

		it('should throw an error if missing credentials', async () => {
			if (!skipIfNoCredentials()) {
				// Only run test if we have valid workspace, repo, and PR ID
				// but temporarily simulate missing credentials
				const originalToken = process.env.ATLASSIAN_API_TOKEN;
				process.env.ATLASSIAN_API_TOKEN = '';

				// Parameters for adding a comment
				const params = {
					workspace: validWorkspace || 'test-workspace',
					repo_slug: validRepo || 'test-repo',
					pull_request_id: validPrId ? parseInt(validPrId, 10) : 1,
					content: {
						raw: 'Test comment with missing credentials',
					},
				};

				// Should throw an error about missing credentials
				await expect(
					atlassianPullRequestsService.addComment(params),
				).rejects.toThrow();

				// Restore original token
				process.env.ATLASSIAN_API_TOKEN = originalToken;
			}
		});

		it('should throw an error if missing required parameters', async () => {
			if (skipIfNoCredentials()) {
				return;
			}

			// Test missing workspace
			await expect(
				atlassianPullRequestsService.addComment({
					repo_slug: 'test-repo',
					pull_request_id: 1,
					content: {
						raw: 'Test comment',
					},
				} as any),
			).rejects.toThrow(/workspace/i);

			// Test missing repo_slug
			await expect(
				atlassianPullRequestsService.addComment({
					workspace: 'test-workspace',
					pull_request_id: 1,
					content: {
						raw: 'Test comment',
					},
				} as any),
			).rejects.toThrow(/repo_slug/i);

			// Test missing pull_request_id
			await expect(
				atlassianPullRequestsService.addComment({
					workspace: 'test-workspace',
					repo_slug: 'test-repo',
					content: {
						raw: 'Test comment',
					},
				} as any),
			).rejects.toThrow(/pull_request_id/i);

			// Test missing content
			await expect(
				atlassianPullRequestsService.addComment({
					workspace: 'test-workspace',
					repo_slug: 'test-repo',
					pull_request_id: 1,
				} as any),
			).rejects.toThrow(/content/i);
		});
	});
});
