import { PaginationOptions, EntityIdentifier } from '../types/common.types.js';

/**
 * Workspace identifier for retrieving specific workspaces
 */
export interface WorkspaceIdentifier extends EntityIdentifier {
	/**
	 * The workspace slug to retrieve
	 */
	entityId: string;
}

/**
 * Options for listing Bitbucket workspaces
 */
export interface ListWorkspacesOptions extends PaginationOptions {
	/**
	 * Optional query to filter workspaces by name
	 */
	query?: string;

	/**
	 * Optional sort parameter
	 */
	sort?: string;
}

/**
 * Options for getting workspace details
 * @remarks This is a placeholder for future extensions
 */
export type GetWorkspaceOptions = Record<string, never>;
