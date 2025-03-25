import atlassianWorkspacesService from '../services/vendor.atlassian.workspaces.service.js';
import { logger } from '../utils/logger.util.js';
import { handleControllerError } from '../utils/errorHandler.util.js';
import {
	extractPaginationInfo,
	PaginationType,
} from '../utils/pagination.util.js';
import {
	ListWorkspacesOptions,
	GetWorkspaceOptions,
	ControllerResponse,
	WorkspaceIdentifier,
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
	const source = `[src/controllers/atlassian.workspaces.controller.ts@list]`;
	logger.debug(`${source} Listing Bitbucket workspaces...`, options);

	try {
		// Convert to service params
		const serviceParams: ListWorkspacesParams = {
			q: options.q,
			sort: options.sort,
			// Map cursor to page and limit to pagelen for Bitbucket API
			page: options.cursor ? parseInt(options.cursor, 10) : undefined,
			pagelen: options.limit || 50,
		};

		logger.debug(`${source} Using filters:`, serviceParams);

		const workspacesData =
			await atlassianWorkspacesService.list(serviceParams);

		logger.debug(
			`${source} Retrieved ${
				workspacesData.values?.length || 0
			} workspaces`,
		);

		// Extract pagination information using the utility
		const pagination = extractPaginationInfo(
			workspacesData,
			PaginationType.PAGE,
			source,
		);

		// Format the workspaces data for display using the formatter
		const formattedWorkspaces = formatWorkspacesList(
			workspacesData,
			pagination.nextCursor,
		);

		return {
			content: formattedWorkspaces,
			pagination,
		};
	} catch (error) {
		// Use the standardized error handler
		handleControllerError(error, {
			entityType: 'Workspaces',
			operation: 'listing',
			source: 'src/controllers/atlassian.workspaces.controller.ts@list',
			additionalInfo: { options },
		});
	}
}

/**
 * Get details of a specific Bitbucket workspace
 * @param identifier - Object containing the workspace slug
 * @param identifier.workspace - The slug of the workspace to retrieve
 * @param options - Options for retrieving the workspace (not currently used)
 * @returns Promise with formatted workspace details content
 * @throws Error if workspace retrieval fails
 */
async function get(
	identifier: WorkspaceIdentifier,
	options: GetWorkspaceOptions = {},
): Promise<ControllerResponse> {
	const { workspace } = identifier;

	logger.debug(
		`[src/controllers/atlassian.workspaces.controller.ts@get] Getting Bitbucket workspace with slug: ${workspace}...`,
	);

	try {
		const workspaceData = await atlassianWorkspacesService.get(workspace);
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
		// Use the standardized error handler
		handleControllerError(error, {
			entityType: 'Workspace',
			entityId: identifier,
			operation: 'retrieving',
			source: 'src/controllers/atlassian.workspaces.controller.ts@get',
			additionalInfo: { options },
		});
	}
}

export default { list, get };
