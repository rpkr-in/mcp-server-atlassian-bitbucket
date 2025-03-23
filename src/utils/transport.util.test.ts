import { getAtlassianCredentials, fetchAtlassian } from './transport.util.js';
import { config } from './config.util.js';
import { logger } from './logger.util.js';
import { ProjectsResponse } from '../services/vendor.atlassian.projects.types.js';

// Mock the logger module only
jest.mock('./logger.util.js', () => ({
	logger: {
		debug: jest.fn(),
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
	},
}));

// Mock the fetch function for some tests
global.fetch = jest.fn();

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

			// Verify the structure of the credentials
			expect(credentials).toHaveProperty('siteName');
			expect(credentials).toHaveProperty('userEmail');
			expect(credentials).toHaveProperty('apiToken');

			// Verify the credentials are not empty
			expect(credentials.siteName).toBeTruthy();
			expect(credentials.userEmail).toBeTruthy();
			expect(credentials.apiToken).toBeTruthy();
		});

		it('should return null and log a warning when environment variables are missing', () => {
			// Temporarily override the config.get function
			const originalGet = config.get;
			config.get = jest.fn().mockReturnValue(undefined);

			// Call the function
			const credentials = getAtlassianCredentials();

			// Verify the result is null
			expect(credentials).toBeNull();

			// Verify that a warning was logged
			expect(logger.warn).toHaveBeenCalledWith(
				'Missing Atlassian credentials. Please set ATLASSIAN_SITE_NAME, ATLASSIAN_USER_EMAIL, and ATLASSIAN_API_TOKEN environment variables.',
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

			// Mock the fetch function for this test
			const mockResponse = {
				ok: true,
				status: 200,
				statusText: 'OK',
				json: jest.fn().mockResolvedValue({
					values: [],
					startAt: 0,
					maxResults: 50,
					total: 0,
				}),
				text: jest.fn().mockResolvedValue(''),
				clone: jest.fn().mockReturnValue({
					json: jest.fn().mockResolvedValue({
						values: [],
						startAt: 0,
						maxResults: 50,
						total: 0,
					}),
				}),
				headers: new Headers(),
			};
			(global.fetch as jest.Mock).mockResolvedValue(mockResponse);

			// Make a call to the function
			const result = await fetchAtlassian<ProjectsResponse>(
				credentials,
				'/rest/api/3/project/search',
				{
					method: 'GET',
					headers: {
						'Content-Type': 'application/json',
					},
				},
			);

			// Verify the response structure
			expect(result).toHaveProperty('values');
			expect(Array.isArray(result.values)).toBe(true);
			expect(result).toHaveProperty('startAt');
			expect(result).toHaveProperty('maxResults');
			expect(result).toHaveProperty('total');
		});

		it('should handle API errors correctly', async () => {
			// This test will be skipped if credentials are not available
			const credentials = getAtlassianCredentials();
			if (!credentials) {
				console.warn(
					'Skipping test: No Atlassian credentials available',
				);
				return;
			}

			// Mock the fetch function for this test
			const mockResponse = {
				ok: false,
				status: 404,
				statusText: 'Not Found',
				text: jest.fn().mockResolvedValue('Not Found'),
				headers: new Headers(),
			};
			(global.fetch as jest.Mock).mockResolvedValue(mockResponse);

			// Make a call to the function and expect it to throw
			await expect(
				fetchAtlassian(
					credentials,
					'/rest/api/3/non-existent-endpoint',
				),
			).rejects.toThrow();
		});

		it('should normalize paths that do not start with a slash', async () => {
			// This test will be skipped if credentials are not available
			const credentials = getAtlassianCredentials();
			if (!credentials) {
				console.warn(
					'Skipping test: No Atlassian credentials available',
				);
				return;
			}

			// Mock the fetch function for this test
			const mockResponse = {
				ok: true,
				status: 200,
				statusText: 'OK',
				json: jest.fn().mockResolvedValue({
					values: [],
					startAt: 0,
					maxResults: 50,
					total: 0,
				}),
				text: jest.fn().mockResolvedValue(''),
				clone: jest.fn().mockReturnValue({
					json: jest.fn().mockResolvedValue({
						values: [],
						startAt: 0,
						maxResults: 50,
						total: 0,
					}),
				}),
				headers: new Headers(),
			};
			(global.fetch as jest.Mock).mockResolvedValue(mockResponse);

			// Make a call to the function
			const result = await fetchAtlassian<ProjectsResponse>(
				credentials,
				'rest/api/3/project/search',
				{
					method: 'GET',
				},
			);

			// Verify the response structure
			expect(result).toHaveProperty('values');
			expect(Array.isArray(result.values)).toBe(true);
		});

		it('should support custom request options', async () => {
			// This test will be skipped if credentials are not available
			const credentials = getAtlassianCredentials();
			if (!credentials) {
				console.warn(
					'Skipping test: No Atlassian credentials available',
				);
				return;
			}

			// Mock the fetch function for this test
			const mockResponse = {
				ok: true,
				status: 200,
				statusText: 'OK',
				json: jest.fn().mockResolvedValue({
					values: [1],
					startAt: 0,
					maxResults: 1,
					total: 1,
				}),
				text: jest.fn().mockResolvedValue(''),
				clone: jest.fn().mockReturnValue({
					json: jest.fn().mockResolvedValue({
						values: [1],
						startAt: 0,
						maxResults: 1,
						total: 1,
					}),
				}),
				headers: new Headers(),
			};
			(global.fetch as jest.Mock).mockResolvedValue(mockResponse);

			// Custom request options
			const options = {
				method: 'GET' as const,
				headers: {
					Accept: 'application/json',
					'Content-Type': 'application/json',
				},
			};

			// Make a call to the function
			const result = await fetchAtlassian<ProjectsResponse>(
				credentials,
				'/rest/api/3/project/search?maxResults=1',
				options,
			);

			// Verify the response structure
			expect(result).toHaveProperty('values');
			expect(Array.isArray(result.values)).toBe(true);
			expect(result.values.length).toBe(1); // Verify limit parameter works
		});
	});
});
