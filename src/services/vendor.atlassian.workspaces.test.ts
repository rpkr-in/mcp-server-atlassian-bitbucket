import atlassianWorkspacesService from './vendor.atlassian.workspaces.service.js';
import { getAtlassianCredentials } from '../utils/transport.util.js';
import { config } from '../utils/config.util.js';

describe('Vendor Atlassian Workspaces Service', () => {
	// Load configuration and skip all tests if Atlassian credentials are not available
	beforeAll(() => {
		// Load configuration from all sources
		config.load();

		const credentials = getAtlassianCredentials();
		if (!credentials) {
			console.warn(
				'Skipping Atlassian Workspaces tests: No credentials available',
			);
		}
	});

	describe('listWorkspaces', () => {
		it('should return a list of workspaces', async () => {
			// Check if credentials are available
			const credentials = getAtlassianCredentials();
			if (!credentials) {
				return; // Skip this test if no credentials
			}

			// Call the function with the real API
			const result = await atlassianWorkspacesService.list();

			// Verify the response structure
			expect(result).toHaveProperty('values');
			expect(Array.isArray(result.values)).toBe(true);
			expect(result).toHaveProperty('pagelen');
			expect(result).toHaveProperty('page');
			expect(result).toHaveProperty('size');

			// If workspaces are returned, verify their structure
			if (result.values.length > 0) {
				const workspaceMembership = result.values[0];
				expect(workspaceMembership).toHaveProperty(
					'type',
					'workspace_membership',
				);
				expect(workspaceMembership).toHaveProperty('permission');
				expect(workspaceMembership).toHaveProperty('user');
				expect(workspaceMembership).toHaveProperty('workspace');

				// Verify workspace structure
				const workspace = workspaceMembership.workspace;
				expect(workspace).toHaveProperty('type', 'workspace');
				expect(workspace).toHaveProperty('uuid');
				expect(workspace).toHaveProperty('name');
				expect(workspace).toHaveProperty('slug');
				expect(workspace).toHaveProperty('links');
			}
		}, 15000); // Increase timeout for API call

		it('should support pagination', async () => {
			// Check if credentials are available
			const credentials = getAtlassianCredentials();
			if (!credentials) {
				return; // Skip this test if no credentials
			}

			// Call the function with the real API and limit results
			const result = await atlassianWorkspacesService.list({
				pagelen: 2,
			});

			// Verify the pagination parameters
			expect(result).toHaveProperty('pagelen', 2);
			expect(result.values.length).toBeLessThanOrEqual(2);
		}, 15000); // Increase timeout for API call

		// The test for filtering by role has been removed as the role parameter is no longer supported
	});

	describe('getWorkspaceBySlug', () => {
		it('should return details for a valid workspace slug', async () => {
			// Check if credentials are available
			const credentials = getAtlassianCredentials();
			if (!credentials) {
				return; // Skip this test if no credentials
			}

			// First, get a list of workspaces to find a valid slug
			const workspaces = await atlassianWorkspacesService.list();

			// Skip if no workspaces are available
			if (workspaces.values.length === 0) {
				console.warn('Skipping test: No workspaces available');
				return;
			}

			const workspaceSlug = workspaces.values[0].workspace.slug;

			// Call the function with the real API
			const result = await atlassianWorkspacesService.get(workspaceSlug);

			// Verify the response contains expected fields
			expect(result).toHaveProperty('slug', workspaceSlug);
			expect(result).toHaveProperty('type', 'workspace');
			expect(result).toHaveProperty('uuid');
			expect(result).toHaveProperty('name');
			expect(result).toHaveProperty('links');
		}, 15000); // Increase timeout for API call

		it('should handle invalid workspace slugs', async () => {
			// Check if credentials are available
			const credentials = getAtlassianCredentials();
			if (!credentials) {
				return; // Skip this test if no credentials
			}

			// Use an invalid workspace slug
			const invalidSlug = 'invalid-workspace-slug-that-does-not-exist';

			// Call the function with the real API and expect it to throw
			await expect(
				atlassianWorkspacesService.get(invalidSlug),
			).rejects.toThrow();
		}, 15000); // Increase timeout for API call
	});

	/**
	 * Test the service's ability to handle pagination, sorting, and filtering
	 */
	describe('filtering and pagination', () => {
		// Skip these tests in continuous integration environments as they require API access
		const itOrSkip = process.env.CI ? it.skip : it;

		itOrSkip('should support pagination', async () => {
			// Call the function with the real API and limit results
			const result = await atlassianWorkspacesService.list({
				pagelen: 5,
			});

			// Verify the response has the correct number of items
			expect(result.values.length).toBeLessThanOrEqual(5);
			expect(result.pagelen).toBe(5);
		});

		itOrSkip(
			'should handle sorting parameters even if API does not support them',
			async () => {
				// The sort parameter is passed through to the API which may or may not support it
				// This test verifies that the service doesn't throw an error for sorting
				// The API might reject it, but our service layer should pass it through
				const result = await atlassianWorkspacesService.list({
					sort: '-name',
					pagelen: 10,
				});

				// Verify we get a response even if sort might be ignored
				expect(result).toBeDefined();
				expect(result.values).toBeDefined();
			},
		);

		itOrSkip('should support filtering by query', async () => {
			// This assumes you have at least one workspace with a name
			// First, get a list of all workspaces
			const allWorkspaces = await atlassianWorkspacesService.list({
				pagelen: 10,
			});

			// Only proceed if there are workspaces available
			if (allWorkspaces.values.length > 0) {
				// Get the name of the first workspace
				const firstWorkspaceName =
					allWorkspaces.values[0].workspace.name;

				// Make sure we have a name to search for
				if (firstWorkspaceName) {
					// Search for workspaces with this name using the correct query syntax
					const result = await atlassianWorkspacesService.list({
						q: `workspace.name="${firstWorkspaceName}"`,
					});

					// Verify we got at least one result
					expect(result.values.length).toBeGreaterThan(0);

					// Verify the first workspace in the results has the expected name
					expect(
						result.values.some(
							(workspace) =>
								workspace.workspace.name === firstWorkspaceName,
						),
					).toBe(true);
				}
			}
		});
	});
});
