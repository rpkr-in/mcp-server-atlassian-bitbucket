import atlassianProjectsService from './vendor.atlassian.projects.service.js';
import { getAtlassianCredentials } from '../utils/transport.util.js';
import { config } from '../utils/config.util.js';

describe('Vendor Atlassian Projects Service', () => {
	// Load configuration and skip all tests if Atlassian credentials are not available
	beforeAll(() => {
		// Load configuration from all sources
		config.load();

		const credentials = getAtlassianCredentials();
		if (!credentials) {
			console.warn(
				'Skipping Atlassian Projects tests: No credentials available',
			);
		}
	});

	describe('listProjects', () => {
		it('should return a list of projects', async () => {
			// Check if credentials are available
			const credentials = getAtlassianCredentials();
			if (!credentials) {
				return; // Skip this test if no credentials
			}

			// Call the function with the real API
			const result = await atlassianProjectsService.list();

			// Verify the response structure
			expect(result).toHaveProperty('values');
			expect(Array.isArray(result.values)).toBe(true);
			expect(result).toHaveProperty('startAt');
			expect(result).toHaveProperty('maxResults');
			expect(result).toHaveProperty('total');

			// If projects are returned, verify their structure
			if (result.values.length > 0) {
				const project = result.values[0];
				expect(project).toHaveProperty('id');
				expect(project).toHaveProperty('key');
				expect(project).toHaveProperty('name');
				expect(project).toHaveProperty('self');
				expect(project).toHaveProperty('avatarUrls');
			}
		}, 15000); // Increase timeout for API call

		it('should support pagination', async () => {
			// Check if credentials are available
			const credentials = getAtlassianCredentials();
			if (!credentials) {
				return; // Skip this test if no credentials
			}

			// Call the function with the real API and limit results
			const result = await atlassianProjectsService.list({
				maxResults: 2,
			});

			// Verify the pagination parameters
			expect(result).toHaveProperty('maxResults', 2);
			expect(result.values.length).toBeLessThanOrEqual(2);

			// If there are more than 2 total projects, verify nextPage
			if (result.total > 2) {
				expect(result).toHaveProperty('nextPage');
				expect(result.isLast).toBe(false);
			}
		}, 15000); // Increase timeout for API call

		it('should support filtering by query', async () => {
			// Check if credentials are available
			const credentials = getAtlassianCredentials();
			if (!credentials) {
				return; // Skip this test if no credentials
			}

			// First get all projects to find a valid name to search for
			const allProjects = await atlassianProjectsService.list();

			// Skip if no projects are available
			if (allProjects.values.length === 0) {
				console.warn('Skipping test: No projects available');
				return;
			}

			// Use the first project's name as a query
			const projectName = allProjects.values[0].name;

			// Call the function with the real API and filter by query
			const result = await atlassianProjectsService.list({
				query: projectName,
			});

			// Verify the response contains projects matching the query
			expect(result.values.length).toBeGreaterThan(0);

			// At least one project should match the name (might be partial match)
			const matchingProject = result.values.find(
				(p) =>
					p.name.includes(projectName) ||
					projectName.includes(p.name),
			);
			expect(matchingProject).toBeDefined();
		}, 15000); // Increase timeout for API call
	});

	describe('getProjectById', () => {
		it('should return details for a valid project ID', async () => {
			// Check if credentials are available
			const credentials = getAtlassianCredentials();
			if (!credentials) {
				return; // Skip this test if no credentials
			}

			// First, get a list of projects to find a valid ID
			const projects = await atlassianProjectsService.list({
				maxResults: 1,
			});

			// Skip if no projects are available
			if (projects.values.length === 0) {
				console.warn('Skipping test: No projects available');
				return;
			}

			const projectId = projects.values[0].id;

			// Call the function with the real API
			const result = await atlassianProjectsService.get(projectId);

			// Verify the response contains expected fields
			expect(result).toHaveProperty('id', projectId);
			expect(result).toHaveProperty('key');
			expect(result).toHaveProperty('name');
			expect(result).toHaveProperty('self');
			expect(result).toHaveProperty('avatarUrls');
		}, 15000); // Increase timeout for API call

		it('should return details for a valid project key', async () => {
			// Check if credentials are available
			const credentials = getAtlassianCredentials();
			if (!credentials) {
				return; // Skip this test if no credentials
			}

			// First, get a list of projects to find a valid key
			const projects = await atlassianProjectsService.list({
				maxResults: 1,
			});

			// Skip if no projects are available
			if (projects.values.length === 0) {
				console.warn('Skipping test: No projects available');
				return;
			}

			const projectKey = projects.values[0].key;

			// Call the function with the real API
			const result = await atlassianProjectsService.get(projectKey);

			// Verify the response contains expected fields
			expect(result).toHaveProperty('key', projectKey);
			expect(result).toHaveProperty('id');
			expect(result).toHaveProperty('name');
			expect(result).toHaveProperty('self');
			expect(result).toHaveProperty('avatarUrls');
		}, 15000); // Increase timeout for API call

		it('should include additional fields when requested', async () => {
			// Check if credentials are available
			const credentials = getAtlassianCredentials();
			if (!credentials) {
				return; // Skip this test if no credentials
			}

			// First, get a list of projects to find a valid ID
			const projects = await atlassianProjectsService.list({
				maxResults: 1,
			});

			// Skip if no projects are available
			if (projects.values.length === 0) {
				console.warn('Skipping test: No projects available');
				return;
			}

			const projectId = projects.values[0].id;

			// Call the function with the real API and request additional fields
			const result = await atlassianProjectsService.get(projectId, {
				includeComponents: true,
				includeVersions: true,
			});

			// Verify the response contains expected fields
			expect(result).toHaveProperty('id', projectId);

			// Check for components if they were requested
			expect(result).toHaveProperty('components');
			expect(Array.isArray(result.components)).toBe(true);

			// Check for versions if they were requested
			expect(result).toHaveProperty('versions');
			expect(Array.isArray(result.versions)).toBe(true);
		}, 15000); // Increase timeout for API call

		it('should handle invalid project IDs', async () => {
			// Check if credentials are available
			const credentials = getAtlassianCredentials();
			if (!credentials) {
				return; // Skip this test if no credentials
			}

			// Use an invalid project ID
			const invalidId = 'invalid-project-id';

			// Call the function with the real API and expect it to throw
			await expect(
				atlassianProjectsService.get(invalidId),
			).rejects.toThrow();
		}, 15000); // Increase timeout for API call
	});
});
