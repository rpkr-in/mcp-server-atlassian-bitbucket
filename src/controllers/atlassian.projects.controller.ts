import atlassianProjectsService from '../services/vendor.atlassian.projects.service.js';
import { logger } from '../utils/logger.util.js';
import { McpError, createUnexpectedError } from '../utils/error.util.js';
import {
	ListProjectsOptions,
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
 * @param options.query - Filter by project name or key
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
			// Pagination
			maxResults: options.limit || 50,
			startAt: options.cursor ? parseInt(options.cursor, 10) : 0,
			// Hardcoded values for consistency
			expand: ['description', 'lead'] as string[],
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
		if (projectsData.nextPage && !projectsData.isLast) {
			// Extract startAt from the next URL or use current startAt + maxResults
			const startAtMatch = projectsData.nextPage.match(/startAt=(\d+)/);
			if (startAtMatch && startAtMatch[1]) {
				nextCursor = startAtMatch[1];
				logger.debug(
					`[src/controllers/atlassian.projects.controller.ts@list] Next cursor: ${nextCursor}`,
				);
			} else if (
				projectsData.startAt !== undefined &&
				projectsData.maxResults !== undefined
			) {
				nextCursor = String(
					projectsData.startAt + projectsData.maxResults,
				);
				logger.debug(
					`[src/controllers/atlassian.projects.controller.ts@list] Calculated next cursor: ${nextCursor}`,
				);
			}
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

		// Pass through McpErrors
		if (error instanceof McpError) {
			throw error;
		}

		// Wrap other errors
		throw createUnexpectedError(
			`Error listing Jira projects: ${error instanceof Error ? error.message : String(error)}`,
			error,
		);
	}
}

/**
 * Get details of a specific Jira project
 * @param idOrKey - The ID or key of the project to retrieve
 * @returns Promise with formatted project details content
 * @throws Error if project retrieval fails
 */
async function get(idOrKey: string): Promise<ControllerResponse> {
	logger.debug(
		`[src/controllers/atlassian.projects.controller.ts@get] Getting Jira project with ID/key: ${idOrKey}...`,
	);

	try {
		// Hardcoded parameters for the service call
		const params = {
			// Include additional data
			includeComponents: true,
			includeVersions: true,
		};

		logger.debug(
			`[src/controllers/atlassian.projects.controller.ts@get] Using params:`,
			params,
		);

		const projectData = await atlassianProjectsService.get(idOrKey, params);
		// Log only key information instead of the entire response
		logger.debug(
			`[src/controllers/atlassian.projects.controller.ts@get] Retrieved project: ${projectData.name} (${projectData.key})`,
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

		// Pass through McpErrors
		if (error instanceof McpError) {
			throw error;
		}

		// Wrap other errors
		throw createUnexpectedError(
			`Error getting Jira project: ${error instanceof Error ? error.message : String(error)}`,
			error,
		);
	}
}

export default { list, get };
