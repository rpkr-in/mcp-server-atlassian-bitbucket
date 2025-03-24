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
 * @param options - Options for listing workspaces
 * @param options.q - Query to filter workspaces
 * @param options.sort - Sort parameter
 * @param options.limit - Maximum number of workspaces to return
 * @param options.cursor - Pagination cursor for retrieving the next set of results
 * @returns Promise with formatted workspace list content and pagination information
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
			// Map cursor to page and limit to pagelen for Bitbucket API
			page: options.cursor ? parseInt(options.cursor, 10) : undefined,
			pagelen: options.limit || 50,
		};

		logger.debug(
			`[src/controllers/atlassian.workspaces.controller.ts@list] Using filters:`,
			serviceParams,
		);

		const workspacesData =
			await atlassianWorkspacesService.list(serviceParams);

		logger.debug(
			`[src/controllers/atlassian.workspaces.controller.ts@list] Retrieved ${
				workspacesData.values?.length || 0
			} workspaces`,
		);

		// Extract pagination information
		let nextCursor: string | undefined;
		if (workspacesData.next) {
			// Extract page from next URL if available
			const nextUrl = new URL(workspacesData.next);
			const nextPage = nextUrl.searchParams.get('page');
			if (nextPage) {
				nextCursor = nextPage;
			}
		}

		// Format the workspaces data for display using the formatter
		const formattedWorkspaces = formatWorkspacesList(
			workspacesData,
			nextCursor,
		);

		return {
			content: formattedWorkspaces,
			pagination: {
				nextCursor,
				hasMore: !!nextCursor,
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
		logger.debug(
			`[src/controllers/atlassian.workspaces.controller.ts@get] Retrieved workspace: ${workspaceData.slug}`,
		);

		// Since membership info isn't directly available, we'll use the workspace data only
		logger.debug(
			`[src/controllers/atlassian.workspaces.controller.ts@get] Membership info not available, using workspace data only`,
		);

		// Format the workspace data for display using the formatter
		const formattedWorkspace = formatWorkspaceDetails(
			workspaceData,
			undefined, // Pass undefined instead of membership data
		);

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
			(error instanceof Error &&
				'statusCode' in error &&
				(error as { statusCode: number }).statusCode === 404)
		) {
			logger.warn(
				`[src/controllers/atlassian.workspaces.controller.ts@get] Workspace not found: ${slug}`,
			);

			throw createApiError(
				`Workspace not found: ${slug}. Verify the workspace slug and your access permissions.`,
				404,
				error,
			);
		}

		// 2. Access denied
		if (
			errorMessage.includes('access') ||
			errorMessage.includes('permission') ||
			errorMessage.includes('authorize') ||
			(error instanceof Error &&
				'statusCode' in error &&
				(error as { statusCode: number }).statusCode === 403)
		) {
			logger.warn(
				`[src/controllers/atlassian.workspaces.controller.ts@get] Access denied for workspace: ${slug}`,
			);

			throw createApiError(
				`Access denied for workspace: ${slug}. Verify your credentials and permissions.`,
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

export default { list, get };
