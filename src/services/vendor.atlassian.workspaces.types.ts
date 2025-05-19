import { z } from 'zod';

/**
 * Types for Atlassian Bitbucket Workspaces API
 */

/**
 * Workspace type (basic object)
 */
export const WorkspaceTypeSchema = z.literal('workspace');
export type WorkspaceType = z.infer<typeof WorkspaceTypeSchema>;

/**
 * Workspace user object
 */
export const WorkspaceUserSchema = z.object({
	type: z.literal('user'),
	uuid: z.string(),
	nickname: z.string(),
	display_name: z.string(),
});

/**
 * Workspace permission type
 */
export const WorkspacePermissionSchema = z.enum([
	'owner',
	'collaborator',
	'member',
]);

/**
 * Workspace links object
 */
const LinkSchema = z.object({
	href: z.string(),
	name: z.string().optional(),
});

export const WorkspaceLinksSchema = z.object({
	avatar: LinkSchema.optional(),
	html: LinkSchema.optional(),
	members: LinkSchema.optional(),
	owners: LinkSchema.optional(),
	projects: LinkSchema.optional(),
	repositories: LinkSchema.optional(),
	snippets: LinkSchema.optional(),
	self: LinkSchema.optional(),
});
export type WorkspaceLinks = z.infer<typeof WorkspaceLinksSchema>;

/**
 * Workspace forking mode
 */
export const WorkspaceForkingModeSchema = z.enum([
	'allow_forks',
	'no_public_forks',
	'no_forks',
]);
export type WorkspaceForkingMode = z.infer<typeof WorkspaceForkingModeSchema>;

/**
 * Workspace object returned from the API
 */
export const WorkspaceSchema: z.ZodType<{
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
}> = z.object({
	type: WorkspaceTypeSchema,
	uuid: z.string(),
	name: z.string(),
	slug: z.string(),
	is_private: z.boolean().optional(),
	is_privacy_enforced: z.boolean().optional(),
	forking_mode: WorkspaceForkingModeSchema.optional(),
	created_on: z.string().optional(),
	updated_on: z.string().optional(),
	links: WorkspaceLinksSchema,
});

/**
 * Workspace membership object
 */
export const WorkspaceMembershipSchema = z.object({
	type: z.literal('workspace_membership'),
	permission: WorkspacePermissionSchema,
	last_accessed: z.string().optional(),
	added_on: z.string().optional(),
	user: WorkspaceUserSchema,
	workspace: WorkspaceSchema,
});
export type WorkspaceMembership = z.infer<typeof WorkspaceMembershipSchema>;

/**
 * Extended workspace object with optional fields
 * @remarks Currently identical to Workspace, but allows for future extension
 */
export const WorkspaceDetailedSchema = WorkspaceSchema;
export type WorkspaceDetailed = z.infer<typeof WorkspaceDetailedSchema>;

/**
 * Parameters for listing workspaces
 */
export const ListWorkspacesParamsSchema = z.object({
	q: z.string().optional(),
	page: z.number().optional(),
	pagelen: z.number().optional(),
});
export type ListWorkspacesParams = z.infer<typeof ListWorkspacesParamsSchema>;

/**
 * API response for user permissions on workspaces
 */
export const WorkspacePermissionsResponseSchema = z.object({
	pagelen: z.number(),
	page: z.number(),
	size: z.number(),
	next: z.string().optional(),
	previous: z.string().optional(),
	values: z.array(WorkspaceMembershipSchema),
});
export type WorkspacePermissionsResponse = z.infer<
	typeof WorkspacePermissionsResponseSchema
>;
