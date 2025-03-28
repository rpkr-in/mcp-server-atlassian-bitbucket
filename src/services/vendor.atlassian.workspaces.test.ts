import atlassianWorkspacesService from './vendor.atlassian.workspaces.service.js';
import { getAtlassianCredentials } from '../utils/transport.util.js';
import { config } from '../utils/config.util.js';
import { McpError } from '../utils/error.util.js';

describe('Vendor Atlassian Workspaces Service', () => {
	// Load configuration and check for credentials before all tests
	beforeAll(() => {
		config.load(); // Ensure config is loaded
		const credentials = getAtlassianCredentials();
		if (!credentials) {
			console.warn(
				'Skipping Atlassian Workspaces Service tests: No credentials available',
			);
		}
	});

	// Helper function to skip tests when credentials are missing
	const skipIfNoCredentials = () => !getAtlassianCredentials();

	describe('list', () => {
		it('should return a list of workspaces (permissions)', async () => {
			if (skipIfNoCredentials()) return;

			const result = await atlassianWorkspacesService.list();

			// Verify the response structure based on WorkspacePermissionsResponse
			expect(result).toHaveProperty('values');
			expect(Array.isArray(result.values)).toBe(true);
			expect(result).toHaveProperty('pagelen'); // Bitbucket uses pagelen
			expect(result).toHaveProperty('page');
			expect(result).toHaveProperty('size');

			if (result.values.length > 0) {
				const membership = result.values[0];
				expect(membership).toHaveProperty(
					'type',
					'workspace_membership',
				);
				expect(membership).toHaveProperty('permission');
				expect(membership).toHaveProperty('user');
				expect(membership).toHaveProperty('workspace');
				expect(membership.workspace).toHaveProperty('slug');
				expect(membership.workspace).toHaveProperty('uuid');
			}
		}, 30000); // Increased timeout

		it('should support pagination with pagelen', async () => {
			if (skipIfNoCredentials()) return;

			const result = await atlassianWorkspacesService.list({
				pagelen: 1,
			});

			expect(result).toHaveProperty('pagelen');
			// Allow pagelen to be greater than requested if API enforces minimum
			expect(result.pagelen).toBeGreaterThanOrEqual(1);
			expect(result.values.length).toBeLessThanOrEqual(result.pagelen); // Items should not exceed pagelen

			if (result.size > result.pagelen) {
				// If there are more items than the page size, expect pagination links
				expect(result).toHaveProperty('next');
			}
		}, 30000);

		it('should handle query filtering if supported by the API', async () => {
			if (skipIfNoCredentials()) return;

			// First get all workspaces to find a potential query term
			const allWorkspaces = await atlassianWorkspacesService.list();

			// Skip if no workspaces available
			if (allWorkspaces.values.length === 0) {
				console.warn(
					'Skipping query filtering test: No workspaces available',
				);
				return;
			}

			// Try to search using a workspace name - note that this might not work if
			// the API doesn't fully support 'q' parameter for this endpoint
			// This test basically checks that the request doesn't fail
			const firstWorkspace = allWorkspaces.values[0].workspace;
			try {
				const result = await atlassianWorkspacesService.list({
					q: `workspace.name="${firstWorkspace.name}"`,
				});

				// We're mostly testing that this request completes without error
				expect(result).toHaveProperty('values');

				// The result might be empty if filtering isn't supported,
				// so we don't assert on the number of results returned
			} catch (error) {
				// If filtering isn't supported, the API might return an error
				// This is acceptable, so we just log it
				console.warn(
					'Query filtering test encountered an error:',
					error instanceof Error ? error.message : String(error),
				);
			}
		}, 30000);
	});

	describe('get', () => {
		// Helper to get a valid slug for testing 'get'
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
					"Could not fetch workspace list for 'get' test setup:",
					error,
				);
				return null;
			}
		}

		it('should return details for a valid workspace slug', async () => {
			const workspaceSlug = await getFirstWorkspaceSlug();
			if (!workspaceSlug) {
				console.warn('Skipping get test: No workspace slug found.');
				return;
			}

			const result = await atlassianWorkspacesService.get(workspaceSlug);

			// Verify the response structure based on WorkspaceDetailed
			expect(result).toHaveProperty('uuid');
			expect(result).toHaveProperty('slug', workspaceSlug);
			expect(result).toHaveProperty('name');
			expect(result).toHaveProperty('type', 'workspace');
			expect(result).toHaveProperty('links');
			expect(result.links).toHaveProperty('html');
		}, 30000);

		it('should throw an McpError for an invalid workspace slug', async () => {
			if (skipIfNoCredentials()) return;

			const invalidSlug = 'this-slug-definitely-does-not-exist-12345';

			// Expect the service call to reject with an McpError (likely 404)
			await expect(
				atlassianWorkspacesService.get(invalidSlug),
			).rejects.toThrow(McpError);

			// Optionally check the status code if needed
			try {
				await atlassianWorkspacesService.get(invalidSlug);
			} catch (e) {
				expect(e).toBeInstanceOf(McpError);
				expect((e as McpError).statusCode).toBe(404); // Expecting Not Found
			}
		}, 30000);
	});
});
