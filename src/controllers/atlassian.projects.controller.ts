import atlassianProjectsService from '../services/vendor.atlassian.projects.service.js';
import { logger } from '../utils/logger.util.js';
import { McpError, createApiError } from '../utils/error.util.js';
import {
	ListProjectsOptions,
	GetProjectOptions,
	ControllerResponse,
} from './atlassian.projects.type.js';
import {
	formatProjectsList,
	formatProjectDetails,
} from './atlassian.projects.formatter.js';

/**
 * Controller for managing Jira projects.
 * Provides functionality for listing projects and retrieving project details.
 */

/**
 * List Jira projects with optional filtering
 * @param options - Optional filter options for the projects list
 * @param options.query - Text query to filter projects by name or key
 * @param options.limit - Maximum number of projects to return
 * @param options.cursor - Pagination cursor for retrieving the next set of results
 * @returns Promise with formatted project list content and pagination information
 */
async function list(
	options: ListProjectsOptions = {},
): Promise<ControllerResponse> {
	logger.debug(
		`[src/controllers/atlassian.projects.controller.ts@list] Listing Jira projects...`,
		options,
	);

	try {
		// Set default filters and hardcoded values
		const filters = {
			// Optional filters with defaults
			query: options.query,
			// Hardcoded choices
			expand: ['description', 'lead'], // Always include expanded fields
			// Pagination
			maxResults: options.limit || 50,
			startAt: options.cursor ? parseInt(options.cursor, 10) : 0,
		};

		logger.debug(
			`[src/controllers/atlassian.projects.controller.ts@list] Using filters:`,
			filters,
		);

		const projectsData = await atlassianProjectsService.list(filters);
		// Log only the count of projects returned instead of the entire response
		logger.debug(
			`[src/controllers/atlassian.projects.controller.ts@list] Retrieved ${projectsData.values?.length || 0} projects`,
		);

		// Extract pagination information
		let nextCursor: string | undefined;
		if (
			projectsData.startAt !== undefined &&
			projectsData.maxResults !== undefined &&
			projectsData.total !== undefined &&
			projectsData.startAt + projectsData.maxResults < projectsData.total
		) {
			nextCursor = String(projectsData.startAt + projectsData.maxResults);
			logger.debug(
				`[src/controllers/atlassian.projects.controller.ts@list] Next cursor: ${nextCursor}`,
			);
		} else if (projectsData.nextPage) {
			nextCursor = projectsData.nextPage;
			logger.debug(
				`[src/controllers/atlassian.projects.controller.ts@list] Next page: ${nextCursor}`,
			);
		}

		// Format the projects data for display using the formatter
		const formattedProjects = formatProjectsList(projectsData, nextCursor);

		return {
			content: formattedProjects,
			pagination: {
				nextCursor,
				hasMore: !!nextCursor,
			},
		};
	} catch (error) {
		logger.error(
			`[src/controllers/atlassian.projects.controller.ts@list] Error listing projects`,
			error,
		);

		// Get the error message
		const errorMessage =
			error instanceof Error ? error.message : String(error);

		// Pass through McpErrors
		if (error instanceof McpError) {
			throw error;
		}

		// Handle specific error patterns

		// 1. Invalid cursor format
		if (
			errorMessage.includes('startAt') &&
			(errorMessage.includes('invalid') ||
				errorMessage.includes('not valid'))
		) {
			logger.warn(
				`[src/controllers/atlassian.projects.controller.ts@list] Invalid cursor detected`,
			);

			throw createApiError(
				`${errorMessage}. Use the exact cursor string returned from previous results.`,
				400,
				error,
			);
		}

		// Default: preserve original message with status code if available
		throw createApiError(
			errorMessage,
			error instanceof Error && 'statusCode' in error
				? (error as { statusCode: number }).statusCode
				: undefined,
			error,
		);
	}
}

/**
 * Get details of a specific Jira project
 * @param idOrKey - The ID or key of the project to retrieve
 * @param options - Options for retrieving the project
 * @returns Promise with formatted project details content
 * @throws Error if project retrieval fails
 */
async function get(
	idOrKey: string,
	options: GetProjectOptions = {
		includeComponents: true,
		includeVersions: true,
	},
): Promise<ControllerResponse> {
	logger.debug(
		`[src/controllers/atlassian.projects.controller.ts@get] Getting Jira project with ID/key: ${idOrKey}...`,
	);

	try {
		logger.debug(
			`[src/controllers/atlassian.projects.controller.ts@get] Using options:`,
			options,
		);

		const projectData = await atlassianProjectsService.get(
			idOrKey,
			options,
		);
		// Log only key information instead of the entire response
		logger.debug(
			`[src/controllers/atlassian.projects.controller.ts@get] Retrieved project: ${projectData.name} (${projectData.id})`,
		);

		// Format the project data for display using the formatter
		const formattedProject = formatProjectDetails(projectData);

		return {
			content: formattedProject,
		};
	} catch (error) {
		logger.error(
			`[src/controllers/atlassian.projects.controller.ts@get] Error getting project`,
			error,
		);

		// Get the error message
		const errorMessage =
			error instanceof Error ? error.message : String(error);

		// Pass through McpErrors
		if (error instanceof McpError) {
			throw error;
		}

		// Handle specific error patterns

		// 1. Project not found
		if (
			errorMessage.includes('not found') ||
			(error instanceof Error &&
				'statusCode' in error &&
				(error as { statusCode: number }).statusCode === 404)
		) {
			logger.warn(
				`[src/controllers/atlassian.projects.controller.ts@get] Project not found: ${idOrKey}`,
			);

			throw createApiError(
				`Project not found: ${idOrKey}. Verify the project ID or key is correct and that you have access to this project.`,
				404,
				error,
			);
		}

		// Default: preserve original message with status code if available
		throw createApiError(
			errorMessage,
			error instanceof Error && 'statusCode' in error
				? (error as { statusCode: number }).statusCode
				: undefined,
			error,
		);
	}
}

export default { list, get };
