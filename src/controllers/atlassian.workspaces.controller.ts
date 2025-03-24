import atlassianWorkspacesService from '../services/vendor.atlassian.workspaces.service.js';
import { logger } from '../utils/logger.util.js';
import { McpError, createApiError } from '../utils/error.util.js';
import {
	ListWorkspacesOptions,
	GetWorkspaceOptions,
	ControllerResponse,
} from './atlassian.workspaces.type.js';
import {
	formatWorkspacesList,
	formatWorkspaceDetails,
} from './atlassian.workspaces.formatter.js';
import { ListWorkspacesParams } from '../services/vendor.atlassian.workspaces.types.js';

/**
 * Controller for managing Bitbucket workspaces.
 * Provides functionality for listing workspaces and retrieving workspace details.
 */

/**
 * List Bitbucket workspaces with optional filtering
 * @param {ListWorkspacesOptions} options - Options for listing workspaces
 * @param {string} [options.q] - Query to filter workspaces
 * @param {string} [options.sort] - Sort parameter
 * @param {number} [options.page] - Page number for pagination
 * @param {number} [options.pagelen] - Number of items per page
 * @returns {Promise<FormatWorkspacesResponse>} - Formatted list of workspaces
 */
async function list(
	options: ListWorkspacesOptions = {},
): Promise<ControllerResponse> {
	logger.debug(
		`[src/controllers/atlassian.workspaces.controller.ts@list] Listing Bitbucket workspaces...`,
		options,
	);

	try {
		// Convert to service params
		const serviceParams: ListWorkspacesParams = {
			q: options.q,
			sort: options.sort,
			page: options.page,
			pagelen: options.pagelen,
		};

		logger.debug(
			`[src/controllers/atlassian.workspaces.controller.ts@list] Using filters:`,
			serviceParams,
		);

		const workspacesData =
			await atlassianWorkspacesService.list(serviceParams);
		// Log only the count of workspaces returned instead of the entire response
		logger.debug(
			`[src/controllers/atlassian.workspaces.controller.ts@list] Retrieved ${workspacesData.values?.length || 0} workspaces`,
		);

		// Calculate the next page number if needed
		let nextPage: number | undefined;
		if (
			workspacesData.page !== undefined &&
			workspacesData.pagelen !== undefined &&
			workspacesData.size !== undefined &&
			workspacesData.page * workspacesData.pagelen < workspacesData.size
		) {
			nextPage = workspacesData.page + 1;
			logger.debug(
				`[src/controllers/atlassian.workspaces.controller.ts@list] Next page: ${nextPage}`,
			);
		}

		// Format the workspaces data for display using the formatter
		const formattedWorkspaces = formatWorkspacesList(
			workspacesData,
			nextPage,
		);

		return {
			content: formattedWorkspaces,
			pagination: {
				nextCursor:
					nextPage !== undefined ? String(nextPage) : undefined,
				hasMore: nextPage !== undefined,
			},
		};
	} catch (error) {
		logger.error(
			`[src/controllers/atlassian.workspaces.controller.ts@list] Error listing workspaces`,
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

		// 1. No workspaces or access denied
		if (
			errorMessage.includes('access') ||
			errorMessage.includes('permission') ||
			errorMessage.includes('authorize')
		) {
			logger.warn(
				`[src/controllers/atlassian.workspaces.controller.ts@list] Access denied or no workspaces`,
			);

			throw createApiError(
				`Unable to access Bitbucket workspaces. Verify your credentials and permissions.`,
				403,
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
 * Get details of a specific Bitbucket workspace
 * @param slug - The slug of the workspace to retrieve
 * @param _options - Options for retrieving the workspace (not currently used)
 * @returns Promise with formatted workspace details content
 * @throws Error if workspace retrieval fails
 */
async function get(
	slug: string,
	_options: GetWorkspaceOptions = {},
): Promise<ControllerResponse> {
	logger.debug(
		`[src/controllers/atlassian.workspaces.controller.ts@get] Getting Bitbucket workspace with slug: ${slug}...`,
	);

	try {
		const workspaceData = await atlassianWorkspacesService.get(slug);
		// Log only key information instead of the entire response
		logger.debug(
			`[src/controllers/atlassian.workspaces.controller.ts@get] Retrieved workspace: ${workspaceData.name} (${workspaceData.slug})`,
		);

		// Format the workspace data for display using the formatter
		const formattedWorkspace = formatWorkspaceDetails(workspaceData);

		return {
			content: formattedWorkspace,
		};
	} catch (error) {
		logger.error(
			`[src/controllers/atlassian.workspaces.controller.ts@get] Error getting workspace`,
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

		// 1. Workspace not found
		if (
			errorMessage.includes('not found') ||
			errorMessage.includes('No workspace with identifier') ||
			(error instanceof Error &&
				'statusCode' in error &&
				(error as { statusCode: number }).statusCode === 404)
		) {
			logger.warn(
				`[src/controllers/atlassian.workspaces.controller.ts@get] Workspace not found: ${slug}`,
			);

			throw createApiError(
				`Workspace not found: ${slug}. Verify the workspace slug is correct and that you have access to this workspace.`,
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
