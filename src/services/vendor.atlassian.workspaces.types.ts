/**
 * Types for Atlassian Bitbucket Workspaces API
 */

/**
 * Workspace type (basic object)
 */
export type WorkspaceType = 'workspace';

/**
 * Workspace user object
 */
export interface WorkspaceUser {
	type: 'user';
	uuid: string;
	nickname: string;
	display_name: string;
}

/**
 * Workspace permission type
 */
export type WorkspacePermission = 'owner' | 'collaborator' | 'member';

/**
 * Workspace membership object
 */
export interface WorkspaceMembership {
	type: 'workspace_membership';
	permission: WorkspacePermission;
	last_accessed?: string;
	added_on?: string;
	user: WorkspaceUser;
	workspace: Workspace;
}

/**
 * Workspace links object
 */
export interface WorkspaceLinks {
	avatar?: { href: string; name?: string };
	html?: { href: string; name?: string };
	members?: { href: string; name?: string };
	owners?: { href: string; name?: string };
	projects?: { href: string; name?: string };
	repositories?: { href: string; name?: string };
	snippets?: { href: string; name?: string };
	self?: { href: string; name?: string };
}

/**
 * Workspace forking mode
 */
export type WorkspaceForkingMode =
	| 'allow_forks'
	| 'no_public_forks'
	| 'no_forks';

/**
 * Workspace object returned from the API
 */
export interface Workspace {
	type: WorkspaceType;
	uuid: string;
	name: string;
	slug: string;
	is_private?: boolean;
	is_privacy_enforced?: boolean;
	forking_mode?: WorkspaceForkingMode;
	created_on?: string;
	updated_on?: string;
	links: WorkspaceLinks;
}

/**
 * Extended workspace object with optional fields
 * @remarks Currently identical to Workspace, but allows for future extension
 */
export type WorkspaceDetailed = Workspace;

/**
 * Parameters for listing workspaces
 */
export interface ListWorkspacesParams {
	sort?: string;
	q?: string;
	page?: number;
	pagelen?: number;
}

/**
 * Parameters for getting a workspace by ID
 * @remarks This is intentionally left as a Record<string, never> for future extensibility
 */
export type GetWorkspaceByIdParams = Record<string, never>;

/**
 * API response for listing workspaces
 */
export interface WorkspacesResponse {
	pagelen: number;
	page: number;
	size: number;
	values: WorkspaceMembership[];
}

/**
 * API response for user permissions on workspaces
 */
export interface WorkspacePermissionsResponse {
	pagelen: number;
	page: number;
	size: number;
	values: WorkspaceMembership[];
}
