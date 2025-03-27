import { getAtlassianCredentials, fetchAtlassian } from './transport.util.js';
import { config } from './config.util.js';
import { logger } from './logger.util.js';

// Define a basic response interface for testing
interface TestResponse {
	values: any[];
	startAt?: number;
	maxResults?: number;
	total?: number;
}

// Mock the logger module only to prevent console output during tests
jest.mock('./logger.util.js', () => ({
	logger: {
		debug: jest.fn(),
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
	},
}));

// NOTE: We are no longer mocking fetch, using real API calls instead

describe('Transport Utility', () => {
	// Load configuration before all tests
	beforeAll(() => {
		// Load configuration from all sources
		config.load();
	});

	describe('getAtlassianCredentials', () => {
		it('should return credentials when environment variables are set', () => {
			// This test will be skipped if credentials are not available
			const credentials = getAtlassianCredentials();
			if (!credentials) {
				console.warn(
					'Skipping test: No Atlassian credentials available',
				);
				return;
			}

			// Check if the credentials are for standard Atlassian or Bitbucket-specific
			if (credentials.useBitbucketAuth) {
				// Verify the Bitbucket-specific credentials
				expect(credentials).toHaveProperty('bitbucketUsername');
				expect(credentials).toHaveProperty('bitbucketAppPassword');
				expect(credentials).toHaveProperty('useBitbucketAuth');

				// Verify the credentials are not empty
				expect(credentials.bitbucketUsername).toBeTruthy();
				expect(credentials.bitbucketAppPassword).toBeTruthy();
				expect(credentials.useBitbucketAuth).toBe(true);
			} else {
				// Verify the standard Atlassian credentials
				expect(credentials).toHaveProperty('siteName');
				expect(credentials).toHaveProperty('userEmail');
				expect(credentials).toHaveProperty('apiToken');

				// Verify the credentials are not empty
				expect(credentials.siteName).toBeTruthy();
				expect(credentials.userEmail).toBeTruthy();
				expect(credentials.apiToken).toBeTruthy();
			}
		});

		it('should return null and log a warning when environment variables are missing', () => {
			// Temporarily override the config.get function
			const originalGet = config.get;
			config.get = jest.fn().mockReturnValue(undefined);

			// Call the function
			const credentials = getAtlassianCredentials();

			// Verify the result is null
			expect(credentials).toBeNull();

			// Verify that a warning was logged with the updated message
			expect(logger.warn).toHaveBeenCalledWith(
				'Missing Atlassian credentials. Please set either ATLASSIAN_SITE_NAME, ATLASSIAN_USER_EMAIL, and ATLASSIAN_API_TOKEN environment variables, or ATLASSIAN_BITBUCKET_USERNAME and ATLASSIAN_BITBUCKET_APP_PASSWORD for Bitbucket-specific auth.',
			);

			// Restore the original function
			config.get = originalGet;
		});
	});

	describe('fetchAtlassian', () => {
		it('should successfully fetch data from the Atlassian API', async () => {
			// This test will be skipped if credentials are not available
			const credentials = getAtlassianCredentials();
			if (!credentials) {
				console.warn(
					'Skipping test: No Atlassian credentials available',
				);
				return;
			}

			// Make a call to a real API endpoint
			// For Bitbucket, we'll use the workspaces endpoint
			const result = await fetchAtlassian<TestResponse>(
				credentials,
				'/2.0/workspaces',
				{
					method: 'GET',
					headers: {
						'Content-Type': 'application/json',
					},
				},
			);

			// Verify the response structure from real API
			expect(result).toHaveProperty('values');
			expect(Array.isArray(result.values)).toBe(true);
			// Different property names than mocked data to match actual API response
			if (result.values.length > 0) {
				// Verify an actual workspace result
				const workspace = result.values[0];
				expect(workspace).toHaveProperty('uuid');
				expect(workspace).toHaveProperty('name');
				expect(workspace).toHaveProperty('slug');
			}
		}, 15000); // Increased timeout for real API call

		it('should handle API errors correctly', async () => {
			// This test will be skipped if credentials are not available
			const credentials = getAtlassianCredentials();
			if (!credentials) {
				console.warn(
					'Skipping test: No Atlassian credentials available',
				);
				return;
			}

			// Call a non-existent endpoint and expect it to throw
			await expect(
				fetchAtlassian(credentials, '/2.0/non-existent-endpoint'),
			).rejects.toThrow();
		}, 15000); // Increased timeout for real API call

		it('should normalize paths that do not start with a slash', async () => {
			// This test will be skipped if credentials are not available
			const credentials = getAtlassianCredentials();
			if (!credentials) {
				console.warn(
					'Skipping test: No Atlassian credentials available',
				);
				return;
			}

			// Call the function with a path that doesn't start with a slash
			const result = await fetchAtlassian<TestResponse>(
				credentials,
				'2.0/workspaces',
				{
					method: 'GET',
				},
			);

			// Verify the response structure from real API
			expect(result).toHaveProperty('values');
			expect(Array.isArray(result.values)).toBe(true);
		}, 15000); // Increased timeout for real API call

		it('should support custom request options', async () => {
			// This test will be skipped if credentials are not available
			const credentials = getAtlassianCredentials();
			if (!credentials) {
				console.warn(
					'Skipping test: No Atlassian credentials available',
				);
				return;
			}

			// Custom request options with pagination
			const options = {
				method: 'GET' as const,
				headers: {
					Accept: 'application/json',
					'Content-Type': 'application/json',
				},
			};

			// Call a real endpoint with pagination parameter
			const result = await fetchAtlassian<TestResponse>(
				credentials,
				'/2.0/workspaces?pagelen=1',
				options,
			);

			// Verify the response structure from real API
			expect(result).toHaveProperty('values');
			expect(Array.isArray(result.values)).toBe(true);
			expect(result.values.length).toBeLessThanOrEqual(1); // Should respect pagelen=1
		}, 15000); // Increased timeout for real API call
	});
});
