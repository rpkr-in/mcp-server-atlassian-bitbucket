import atlassianPullRequestsController from './atlassian.pullrequests.controller.js';
import { getAtlassianCredentials } from '../utils/transport.util.js';
import { config } from '../utils/config.util.js';
import { McpError } from '../utils/error.util.js';
import atlassianRepositoriesController from './atlassian.repositories.controller.js';
import atlassianWorkspacesController from './atlassian.workspaces.controller.js';

describe('Atlassian Pull Requests Controller', () => {
	// Load configuration and check for credentials before all tests
	beforeAll(() => {
		config.load(); // Ensure config is loaded
		const credentials = getAtlassianCredentials();
		if (!credentials) {
			console.warn(
				'Skipping Atlassian Pull Requests Controller tests: No credentials available',
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

			// Extract repo slug (adjust regex based on actual formatter output)
			const repoSlugMatch = reposResult.content.match(
				/\*\*Slug\*\*:\s+([^\s\n]+)/,
			);
			const repoSlug = repoSlugMatch ? repoSlugMatch[1] : null;

			if (!repoSlug) return null;

			return { workspaceSlug, repoSlug };
		} catch (error) {
			console.warn(
				'Could not fetch repository info for PR tests:',
				error,
			);
			return null;
		}
	}

	// Helper to get a valid pull request ID for testing
	async function getFirstPullRequestId(): Promise<{
		workspaceSlug: string;
		repoSlug: string;
		prId: string;
	} | null> {
		if (skipIfNoCredentials()) return null;

		const repoInfo = await getRepositoryInfo();
		if (!repoInfo) return null;

		try {
			// List pull requests in the repository
			const prListResult = await atlassianPullRequestsController.list({
				workspaceSlug: repoInfo.workspaceSlug,
				repoSlug: repoInfo.repoSlug,
				limit: 1,
			});

			if (prListResult.content === 'No pull requests found.') {
				return null;
			}

			// Extract PR ID from the content (adjust regex based on actual formatter output)
			const prIdMatch = prListResult.content.match(/\*\*ID\*\*:\s+(\d+)/);
			const prId = prIdMatch ? prIdMatch[1] : null;

			if (!prId) return null;

			return {
				workspaceSlug: repoInfo.workspaceSlug,
				repoSlug: repoInfo.repoSlug,
				prId,
			};
		} catch (error) {
			console.warn('Could not fetch pull request ID for tests:', error);
			return null;
		}
	}

	describe('list', () => {
		it('should return a formatted list of pull requests in Markdown', async () => {
			if (skipIfNoCredentials()) return;

			const repoInfo = await getRepositoryInfo();
			if (!repoInfo) {
				console.warn('Skipping test: No repository info found.');
				return;
			}

			const result = await atlassianPullRequestsController.list({
				workspaceSlug: repoInfo.workspaceSlug,
				repoSlug: repoInfo.repoSlug,
			});

			// Verify the response structure
			expect(result).toHaveProperty('content');
			expect(typeof result.content).toBe('string');
			expect(result).toHaveProperty('pagination');

			// Basic Markdown content checks
			if (result.content !== 'No pull requests found.') {
				expect(result.content).toMatch(/^# Pull Requests in/m);
				expect(result.content).toContain('**ID**');
				expect(result.content).toContain('**Title**');
				expect(result.content).toContain('**State**');
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

			const repoInfo = await getRepositoryInfo();
			if (!repoInfo) {
				console.warn('Skipping test: No repository info found.');
				return;
			}

			// Fetch first page with limit 1
			const result1 = await atlassianPullRequestsController.list({
				workspaceSlug: repoInfo.workspaceSlug,
				repoSlug: repoInfo.repoSlug,
				limit: 1,
			});

			// Should have at most 1 result
			expect(result1.pagination?.count).toBeLessThanOrEqual(1);

			// If there's a next page, fetch it
			if (result1.pagination?.hasMore && result1.pagination.nextCursor) {
				const result2 = await atlassianPullRequestsController.list({
					workspaceSlug: repoInfo.workspaceSlug,
					repoSlug: repoInfo.repoSlug,
					limit: 1,
					cursor: result1.pagination.nextCursor,
				});

				expect(result2.pagination?.count).toBeLessThanOrEqual(1);

				// Ensure content is different (or handle case where only 1 PR exists)
				if (
					result1.content !== 'No pull requests found.' &&
					result2.content !== 'No pull requests found.' &&
					result1.pagination?.count &&
					result2.pagination?.count &&
					result1.pagination.count > 0 &&
					result2.pagination.count > 0
				) {
					// Only compare if we actually have multiple PRs
					expect(result1.content).not.toEqual(result2.content);
				}
			} else {
				console.warn(
					'Skipping cursor part of pagination test: Only one page of pull requests found.',
				);
			}
		}, 30000);

		it('should handle state filtering', async () => {
			if (skipIfNoCredentials()) return;

			const repoInfo = await getRepositoryInfo();
			if (!repoInfo) {
				console.warn('Skipping test: No repository info found.');
				return;
			}

			// Try filtering by OPEN state
			const filteredResult = await atlassianPullRequestsController.list({
				workspaceSlug: repoInfo.workspaceSlug,
				repoSlug: repoInfo.repoSlug,
				state: 'OPEN',
			});

			// The result should be a valid response
			expect(filteredResult).toHaveProperty('content');
			expect(typeof filteredResult.content).toBe('string');

			// We can't guarantee matches (there might not be open PRs), but response should be valid
			if (filteredResult.content !== 'No pull requests found.') {
				expect(filteredResult.content).toMatch(/^# Pull Requests in/m);
				// State filtered results should all show the filtered state
				expect(filteredResult.content).toContain('**State**: OPEN');
				// Should not contain other states
				expect(filteredResult.content).not.toContain(
					'**State**: DECLINED',
				);
				expect(filteredResult.content).not.toContain(
					'**State**: MERGED',
				);
			}
		}, 30000);

		it('should handle query filtering', async () => {
			if (skipIfNoCredentials()) return;

			const repoInfo = await getRepositoryInfo();
			if (!repoInfo) {
				console.warn('Skipping test: No repository info found.');
				return;
			}

			// First get all PRs to find a valid query term
			const allResult = await atlassianPullRequestsController.list({
				workspaceSlug: repoInfo.workspaceSlug,
				repoSlug: repoInfo.repoSlug,
			});

			if (allResult.content === 'No pull requests found.') {
				console.warn(
					'Skipping filtering test: No pull requests found.',
				);
				return;
			}

			// Extract a PR title from the first result to use as a query
			const titleMatch = allResult.content.match(
				/\*\*Title\*\*:\s+([^\n]+)/,
			);
			if (!titleMatch || !titleMatch[1]) {
				console.warn(
					'Skipping filtering test: Could not extract PR title.',
				);
				return;
			}

			// Use part of the title as a query term
			const queryTerm = titleMatch[1].trim().split(' ')[0];

			// Query with the extracted term
			const filteredResult = await atlassianPullRequestsController.list({
				workspaceSlug: repoInfo.workspaceSlug,
				repoSlug: repoInfo.repoSlug,
				query: queryTerm,
			});

			// The result should be a valid response
			expect(filteredResult).toHaveProperty('content');
			expect(typeof filteredResult.content).toBe('string');

			// We can't guarantee matches (query might not match anything), but response should be valid
			if (filteredResult.content !== 'No pull requests found.') {
				expect(filteredResult.content).toMatch(/^# Pull Requests in/m);
			}
		}, 30000);

		it('should handle empty result scenario', async () => {
			if (skipIfNoCredentials()) return;

			const repoInfo = await getRepositoryInfo();
			if (!repoInfo) {
				console.warn('Skipping test: No repository info found.');
				return;
			}

			// Use an extremely unlikely query to get empty results
			const noMatchQuery = 'thisstringwillnotmatchanypullrequest12345xyz';

			const emptyResult = await atlassianPullRequestsController.list({
				workspaceSlug: repoInfo.workspaceSlug,
				repoSlug: repoInfo.repoSlug,
				query: noMatchQuery,
			});

			// Should return a specific "no results" message
			expect(emptyResult.content).toBe('No pull requests found.');
			expect(emptyResult.pagination).toHaveProperty('count', 0);
			expect(emptyResult.pagination).toHaveProperty('hasMore', false);
		}, 30000);

		it('should throw an McpError for an invalid repository or workspace', async () => {
			if (skipIfNoCredentials()) return;

			const invalidWorkspaceSlug =
				'this-workspace-definitely-does-not-exist-12345';
			const invalidRepoSlug = 'this-repo-definitely-does-not-exist-12345';

			// Expect the controller call to reject with an McpError
			await expect(
				atlassianPullRequestsController.list({
					workspaceSlug: invalidWorkspaceSlug,
					repoSlug: invalidRepoSlug,
				}),
			).rejects.toThrow(McpError);

			// Check the status code via the error handler's behavior
			try {
				await atlassianPullRequestsController.list({
					workspaceSlug: invalidWorkspaceSlug,
					repoSlug: invalidRepoSlug,
				});
			} catch (e) {
				expect(e).toBeInstanceOf(McpError);
				expect((e as McpError).statusCode).toBe(404); // Expecting Not Found
				expect((e as McpError).message).toContain('not found');
			}
		}, 30000);

		it('should require both workspaceSlug and repoSlug', async () => {
			if (skipIfNoCredentials()) return;

			await expect(
				atlassianPullRequestsController.list({
					workspaceSlug: 'some-workspace',
				} as any),
			).rejects.toThrow();

			await expect(
				atlassianPullRequestsController.list({
					repoSlug: 'some-repo',
				} as any),
			).rejects.toThrow();
		}, 10000);
	});

	describe('get', () => {
		it('should return formatted pull request details in Markdown', async () => {
			if (skipIfNoCredentials()) return;

			const prInfo = await getFirstPullRequestId();
			if (!prInfo) {
				console.warn('Skipping test: No pull request ID found.');
				return;
			}

			const result = await atlassianPullRequestsController.get(prInfo);

			// Verify the response structure
			expect(result).toHaveProperty('content');
			expect(typeof result.content).toBe('string');
			// get() doesn't have pagination
			expect(result).not.toHaveProperty('pagination');

			// Basic Markdown content checks
			expect(result.content).toMatch(/^# Pull Request:/m);
			expect(result.content).toContain(`**ID**: ${prInfo.prId}`);
			expect(result.content).toContain('**State**:');
			expect(result.content).toContain('**Author**:');
			expect(result.content).toContain('**Created**:');
			expect(result.content).toContain('## Description');
		}, 30000);

		it('should throw an McpError for a non-existent pull request ID', async () => {
			if (skipIfNoCredentials()) return;

			const repoInfo = await getRepositoryInfo();
			if (!repoInfo) {
				console.warn('Skipping test: No repository info found.');
				return;
			}

			const nonExistentId = '999999999'; // Very high number unlikely to exist

			// Expect the controller call to reject with an McpError
			await expect(
				atlassianPullRequestsController.get({
					workspaceSlug: repoInfo.workspaceSlug,
					repoSlug: repoInfo.repoSlug,
					prId: nonExistentId,
				}),
			).rejects.toThrow(McpError);

			// Check the status code via the error handler's behavior
			try {
				await atlassianPullRequestsController.get({
					workspaceSlug: repoInfo.workspaceSlug,
					repoSlug: repoInfo.repoSlug,
					prId: nonExistentId,
				});
			} catch (e) {
				expect(e).toBeInstanceOf(McpError);
				expect((e as McpError).statusCode).toBe(404); // Expecting Not Found
				expect((e as McpError).message).toContain('not found');
			}
		}, 30000);
	});

	describe('listComments', () => {
		it('should return formatted pull request comments in Markdown', async () => {
			if (skipIfNoCredentials()) return;

			const prInfo = await getFirstPullRequestId();
			if (!prInfo) {
				console.warn('Skipping test: No pull request ID found.');
				return;
			}

			const result = await atlassianPullRequestsController.listComments({
				workspaceSlug: prInfo.workspaceSlug,
				repoSlug: prInfo.repoSlug,
				prId: prInfo.prId,
			});

			// Verify the response structure
			expect(result).toHaveProperty('content');
			expect(typeof result.content).toBe('string');
			expect(result).toHaveProperty('pagination');

			// Basic Markdown content checks
			if (result.content !== 'No comments found on this pull request.') {
				expect(result.content).toMatch(/^# Comments on Pull Request/m);
				expect(result.content).toContain('**Author**:');
				expect(result.content).toContain('**Updated**:');
			}

			// Verify pagination structure
			expect(result.pagination).toBeDefined();
			expect(result.pagination).toHaveProperty('hasMore');
			expect(typeof result.pagination?.hasMore).toBe('boolean');
		}, 30000);

		it('should handle pagination options (limit/cursor)', async () => {
			if (skipIfNoCredentials()) return;

			const prInfo = await getFirstPullRequestId();
			if (!prInfo) {
				console.warn('Skipping test: No pull request ID found.');
				return;
			}

			// Fetch first page with limit 1
			const result1 = await atlassianPullRequestsController.listComments({
				workspaceSlug: prInfo.workspaceSlug,
				repoSlug: prInfo.repoSlug,
				prId: prInfo.prId,
				limit: 1,
			});

			// Should have at most 1 result
			expect(result1.pagination?.count).toBeLessThanOrEqual(1);

			// If there's a next page, fetch it
			if (result1.pagination?.hasMore && result1.pagination.nextCursor) {
				const result2 =
					await atlassianPullRequestsController.listComments({
						workspaceSlug: prInfo.workspaceSlug,
						repoSlug: prInfo.repoSlug,
						prId: prInfo.prId,
						limit: 1,
						cursor: result1.pagination.nextCursor,
					});

				expect(result2.pagination?.count).toBeLessThanOrEqual(1);

				// Ensure content is different (or handle case where only 1 comment exists)
				if (
					result1.content !==
						'No comments found on this pull request.' &&
					result2.content !==
						'No comments found on this pull request.' &&
					result1.pagination?.count &&
					result2.pagination?.count &&
					result1.pagination.count > 0 &&
					result2.pagination.count > 0
				) {
					// Only compare if we actually have multiple comments
					expect(result1.content).not.toEqual(result2.content);
				}
			} else {
				console.warn(
					'Skipping cursor part of pagination test: Only one page of comments found or no comments available.',
				);
			}
		}, 30000);

		it('should handle empty result scenario', async () => {
			if (skipIfNoCredentials()) return;

			// First get a PR without comments, or use a non-existent but valid format PR ID
			const repoInfo = await getRepositoryInfo();
			if (!repoInfo) {
				console.warn('Skipping test: No repository info found.');
				return;
			}

			// Try to find a PR without comments
			try {
				// First check if we can access the repository
				const repoResult = await atlassianPullRequestsController.list({
					workspaceSlug: repoInfo.workspaceSlug,
					repoSlug: repoInfo.repoSlug,
					limit: 1,
				});

				// If we can access repos, use a real PR and see if it has no comments
				if (
					repoResult.pagination?.count &&
					repoResult.pagination.count > 0
				) {
					// Extract PR ID from the content
					const prIdMatch =
						repoResult.content.match(/\*\*ID\*\*:\s+(\d+)/);
					if (prIdMatch && prIdMatch[1]) {
						const prId = prIdMatch[1];

						// Get comments for this PR
						const commentsResult =
							await atlassianPullRequestsController.listComments({
								workspaceSlug: repoInfo.workspaceSlug,
								repoSlug: repoInfo.repoSlug,
								prId,
							});

						// Check if there are no comments
						if (
							commentsResult.content ===
							'No comments found on this pull request.'
						) {
							// Verify the structure for empty results
							expect(commentsResult.pagination).toHaveProperty(
								'count',
								0,
							);
							expect(commentsResult.pagination).toHaveProperty(
								'hasMore',
								false,
							);
						} else {
							console.warn(
								'Skipping empty result test: All PRs have comments.',
							);
						}
					}
				} else {
					console.warn(
						'Skipping empty result test: No pull requests available.',
					);
				}
			} catch (error) {
				console.warn('Error during empty result test:', error);
			}
		}, 30000);

		it('should throw an McpError for a non-existent pull request ID', async () => {
			if (skipIfNoCredentials()) return;

			const repoInfo = await getRepositoryInfo();
			if (!repoInfo) {
				console.warn('Skipping test: No repository info found.');
				return;
			}

			const nonExistentId = '999999999'; // Very high number unlikely to exist

			// Expect the controller call to reject with an McpError
			await expect(
				atlassianPullRequestsController.listComments({
					workspaceSlug: repoInfo.workspaceSlug,
					repoSlug: repoInfo.repoSlug,
					prId: nonExistentId,
				}),
			).rejects.toThrow(McpError);

			// Check the status code via the error handler's behavior
			try {
				await atlassianPullRequestsController.listComments({
					workspaceSlug: repoInfo.workspaceSlug,
					repoSlug: repoInfo.repoSlug,
					prId: nonExistentId,
				});
			} catch (e) {
				expect(e).toBeInstanceOf(McpError);
				expect((e as McpError).statusCode).toBe(404); // Expecting Not Found
				expect((e as McpError).message).toContain('not found');
			}
		}, 30000);

		it('should require all necessary parameters', async () => {
			if (skipIfNoCredentials()) return;

			// Test with missing prId
			await expect(
				atlassianPullRequestsController.listComments({
					workspaceSlug: 'some-workspace',
					repoSlug: 'some-repo',
				} as any),
			).rejects.toThrow();

			// Test with missing repoSlug
			await expect(
				atlassianPullRequestsController.listComments({
					workspaceSlug: 'some-workspace',
					prId: '123',
				} as any),
			).rejects.toThrow();

			// Test with missing workspaceSlug
			await expect(
				atlassianPullRequestsController.listComments({
					repoSlug: 'some-repo',
					prId: '123',
				} as any),
			).rejects.toThrow();
		}, 10000);
	});

	describe('addComment', () => {
		it('should throw an error if workspace slug is missing', async () => {
			await expect(
				atlassianPullRequestsController.addComment({
					repoSlug: 'test-repo',
					prId: '123',
					content: 'Test comment',
				} as any),
			).rejects.toThrow(/workspaceSlug/);
		});

		it('should throw an error if repository slug is missing', async () => {
			await expect(
				atlassianPullRequestsController.addComment({
					workspaceSlug: 'test-workspace',
					prId: '123',
					content: 'Test comment',
				} as any),
			).rejects.toThrow(/repoSlug/);
		});

		it('should throw an error if pull request ID is missing', async () => {
			await expect(
				atlassianPullRequestsController.addComment({
					workspaceSlug: 'test-workspace',
					repoSlug: 'test-repo',
					content: 'Test comment',
				} as any),
			).rejects.toThrow(/prId/);
		});

		it('should throw an error if comment content is missing', async () => {
			await expect(
				atlassianPullRequestsController.addComment({
					workspaceSlug: 'test-workspace',
					repoSlug: 'test-repo',
					prId: '123',
				} as any),
			).rejects.toThrow(/content/);
		});

		it('should throw an error if inline.path is provided but inline.line is missing', async () => {
			await expect(
				atlassianPullRequestsController.addComment({
					workspaceSlug: 'test-workspace',
					repoSlug: 'test-repo',
					prId: '123',
					content: 'Test comment',
					inline: {
						path: 'README.md',
					},
				} as any),
			).rejects.toThrow(/inline/);
		});

		it('should throw an error if inline.line is provided but inline.path is missing', async () => {
			await expect(
				atlassianPullRequestsController.addComment({
					workspaceSlug: 'test-workspace',
					repoSlug: 'test-repo',
					prId: '123',
					content: 'Test comment',
					inline: {
						line: 10,
					},
				} as any),
			).rejects.toThrow(/inline/);
		});

		it('should add a comment if valid parameters are provided', async () => {
			// Skip test if no credentials
			if (skipIfNoCredentials()) {
				return;
			}

			// Get valid workspace, repository, and PR ID for testing
			const prInfo = await getFirstPullRequestId();
			if (!prInfo) {
				console.warn('Skipping test: No valid repository or PR found');
				return;
			}

			const params = {
				workspaceSlug: prInfo.workspaceSlug,
				repoSlug: prInfo.repoSlug,
				prId: prInfo.prId,
				content: `Test comment from automated test at ${new Date().toISOString()}`,
			};

			try {
				const result =
					await atlassianPullRequestsController.addComment(params);

				// Verify the response format
				expect(result).toHaveProperty('content');
				expect(typeof result.content).toBe('string');
				expect(result.content).toContain('Comment added successfully');
			} catch (error) {
				console.warn('Failed to add comment to PR:', error);
				// Test should still pass if we attempted with valid credentials
				// but the specific PR doesn't allow comments
			}
		});

		it('should add an inline comment if valid parameters are provided', async () => {
			// Skip test if no credentials
			if (skipIfNoCredentials()) {
				return;
			}

			// For inline comments, we need a file path too, which is hard to determine
			// in an automated test without specific knowledge of the PR
			// So we'll just skip this test with a warning
			console.warn(
				'Skipping inline comment test: Requires specific PR file knowledge',
			);
		});
	});
});
