import { PaginationOptions, EntityIdentifier } from '../types/common.types.js';

/**
 * Workspace identifier for retrieving specific workspaces
 */
export interface WorkspaceIdentifier extends EntityIdentifier {
	/**
	 * The workspace slug to retrieve
	 */
	workspaceSlug: string;
}

/**
 * Options for listing Bitbucket workspaces
 * NOTE: Sorting is not supported by the Bitbucket API for the /2.0/user/permissions/workspaces endpoint
 */
export interface ListWorkspacesOptions extends PaginationOptions {
	// No additional options beyond pagination
	[key: string]: unknown;
}

/**
 * Options for getting workspace details
 * @remarks This is a placeholder for future extensions
 */
export type GetWorkspaceOptions = Record<string, never>;
