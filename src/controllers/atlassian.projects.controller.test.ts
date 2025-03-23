import atlassianProjectsController from './atlassian.projects.controller.js';
import atlassianProjectsService from '../services/vendor.atlassian.projects.service.js';
import { McpError, ErrorType } from '../utils/error.util.js';

// Mock the projects service
jest.mock('../services/vendor.atlassian.projects.service.js');
const mockedProjectsService = atlassianProjectsService as jest.Mocked<
	typeof atlassianProjectsService
>;

describe('Atlassian Projects Controller', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('list', () => {
		it('should return formatted projects list', async () => {
			// Mock the service response
			mockedProjectsService.list.mockResolvedValue({
				self: 'https://example.atlassian.net/rest/api/3/project/search',
				nextPage:
					'https://example.atlassian.net/rest/api/3/project/search?startAt=50',
				maxResults: 50,
				startAt: 0,
				total: 100,
				isLast: false,
				values: [
					{
						id: '10001',
						key: 'TEST',
						name: 'Test Project',
						self: 'https://example.atlassian.net/rest/api/3/project/10001',
						simplified: false,
						style: 'classic',
						avatarUrls: {
							'48x48': 'https://example.atlassian.net/avatar.png',
							'24x24': 'https://example.atlassian.net/avatar.png',
							'16x16': 'https://example.atlassian.net/avatar.png',
							'32x32': 'https://example.atlassian.net/avatar.png',
						},
					},
				],
			});

			// Call the controller
			const result = await atlassianProjectsController.list();

			// Verify the service was called correctly
			expect(mockedProjectsService.list).toHaveBeenCalledWith({
				query: undefined,
				maxResults: 50,
				startAt: 0,
				expand: ['description', 'lead'],
			});

			// Verify the response structure
			expect(result).toHaveProperty('content');
			expect(result).toHaveProperty('pagination');
			expect(result.pagination).toHaveProperty('nextCursor', '50');
			expect(result.pagination).toHaveProperty('hasMore', true);

			// Verify content contains project information
			expect(result.content).toContain('# Jira Projects');
			expect(result.content).toContain('Test Project');
			expect(result.content).toContain('TEST');
		});

		it('should handle pagination parameters', async () => {
			// Mock the service response
			mockedProjectsService.list.mockResolvedValue({
				self: 'https://example.atlassian.net/rest/api/3/project/search',
				nextPage:
					'https://example.atlassian.net/rest/api/3/project/search?startAt=20',
				maxResults: 10,
				startAt: 10,
				total: 100,
				isLast: false,
				values: [
					{
						id: '10002',
						key: 'PROJ',
						name: 'Another Project',
						self: 'https://example.atlassian.net/rest/api/3/project/10002',
						simplified: true,
						style: 'next-gen',
						avatarUrls: {
							'48x48': 'https://example.atlassian.net/avatar.png',
							'24x24': 'https://example.atlassian.net/avatar.png',
							'16x16': 'https://example.atlassian.net/avatar.png',
							'32x32': 'https://example.atlassian.net/avatar.png',
						},
					},
				],
			});

			// Call the controller with pagination options
			const result = await atlassianProjectsController.list({
				limit: 10,
				cursor: '10',
			});

			// Verify the service was called with correct pagination parameters
			expect(mockedProjectsService.list).toHaveBeenCalledWith({
				query: undefined,
				maxResults: 10,
				startAt: 10,
				expand: ['description', 'lead'],
			});

			// Verify pagination information
			expect(result.pagination).toHaveProperty('nextCursor', '20');
			expect(result.pagination).toHaveProperty('hasMore', true);
		});

		it('should handle filtering parameters', async () => {
			// Mock the service response
			mockedProjectsService.list.mockResolvedValue({
				self: 'https://example.atlassian.net/rest/api/3/project/search',
				maxResults: 50,
				startAt: 0,
				total: 1,
				isLast: true,
				values: [
					{
						id: '10003',
						key: 'SOFT',
						name: 'Software Project',
						self: 'https://example.atlassian.net/rest/api/3/project/10003',
						simplified: false,
						style: 'classic',
						avatarUrls: {
							'48x48': 'https://example.atlassian.net/avatar.png',
							'24x24': 'https://example.atlassian.net/avatar.png',
							'16x16': 'https://example.atlassian.net/avatar.png',
							'32x32': 'https://example.atlassian.net/avatar.png',
						},
					},
				],
			});

			// Call the controller with filter options
			const result = await atlassianProjectsController.list({
				query: 'Software',
			});

			// Verify the service was called with correct filter parameters
			expect(mockedProjectsService.list).toHaveBeenCalledWith({
				query: 'Software',
				maxResults: 50,
				startAt: 0,
				expand: ['description', 'lead'],
			});

			// Verify content contains filtered project
			expect(result.content).toContain('Software Project');
			expect(result.pagination).toHaveProperty('hasMore', false);
		});

		it('should handle empty results', async () => {
			// Mock the service response with no projects
			mockedProjectsService.list.mockResolvedValue({
				self: 'https://example.atlassian.net/rest/api/3/project/search',
				maxResults: 50,
				startAt: 0,
				total: 0,
				isLast: true,
				values: [],
			});

			// Call the controller
			const result = await atlassianProjectsController.list();

			// Verify the content indicates no projects found
			expect(result.content).toContain('No Jira projects found');
			expect(result.pagination).toHaveProperty('hasMore', false);
		});

		it('should handle service errors', async () => {
			// Mock the service to throw an error
			const error = new McpError('Service error', ErrorType.API_ERROR);
			mockedProjectsService.list.mockRejectedValue(error);

			// Expect the controller to pass through the error
			await expect(atlassianProjectsController.list()).rejects.toThrow(
				error,
			);
		});
	});

	describe('get', () => {
		it('should return formatted project details', async () => {
			// Mock the service response
			mockedProjectsService.get.mockResolvedValue({
				id: '10001',
				key: 'TEST',
				name: 'Test Project',
				self: 'https://example.atlassian.net/rest/api/3/project/10001',
				simplified: false,
				style: 'classic',
				avatarUrls: {
					'48x48': 'https://example.atlassian.net/avatar.png',
					'24x24': 'https://example.atlassian.net/avatar.png',
					'16x16': 'https://example.atlassian.net/avatar.png',
					'32x32': 'https://example.atlassian.net/avatar.png',
				},
				description: 'This is a test project',
				lead: {
					id: 'user123',
					displayName: 'Test User',
					active: true,
				},
				components: [
					{
						id: 'comp1',
						name: 'Component 1',
						description: 'First component',
						self: 'https://example.atlassian.net/rest/api/3/component/comp1',
					},
				],
				versions: [
					{
						id: 'ver1',
						name: '1.0',
						description: 'First version',
						archived: false,
						released: true,
						releaseDate: '2023-01-01',
						self: 'https://example.atlassian.net/rest/api/3/version/ver1',
					},
				],
			});

			// Call the controller
			const result = await atlassianProjectsController.get('TEST');

			// Verify the service was called correctly
			expect(mockedProjectsService.get).toHaveBeenCalledWith('TEST', {
				includeComponents: true,
				includeVersions: true,
			});

			// Verify the response structure
			expect(result).toHaveProperty('content');

			// Verify content contains project details
			expect(result.content).toContain('# Project: Test Project');
			expect(result.content).toContain('This is a test project');
			expect(result.content).toContain('Test User');
			expect(result.content).toContain('Component 1');
			expect(result.content).toContain('1.0');
		});

		it('should handle project without components and versions', async () => {
			// Mock the service response with minimal data
			mockedProjectsService.get.mockResolvedValue({
				id: '10002',
				key: 'MINI',
				name: 'Minimal Project',
				self: 'https://example.atlassian.net/rest/api/3/project/10002',
				simplified: true,
				style: 'next-gen',
				avatarUrls: {
					'48x48': 'https://example.atlassian.net/avatar.png',
					'24x24': 'https://example.atlassian.net/avatar.png',
					'16x16': 'https://example.atlassian.net/avatar.png',
					'32x32': 'https://example.atlassian.net/avatar.png',
				},
				components: [],
				versions: [],
			});

			// Call the controller
			const result = await atlassianProjectsController.get('MINI');

			// Verify content handles missing components and versions
			expect(result.content).toContain(
				'No components defined for this project',
			);
			expect(result.content).toContain(
				'No versions defined for this project',
			);
		});

		it('should handle service errors', async () => {
			// Mock the service to throw an error
			const error = new McpError(
				'Project not found',
				ErrorType.API_ERROR,
			);
			mockedProjectsService.get.mockRejectedValue(error);

			// Expect the controller to pass through the error
			await expect(
				atlassianProjectsController.get('INVALID'),
			).rejects.toThrow(error);
		});
	});
});
