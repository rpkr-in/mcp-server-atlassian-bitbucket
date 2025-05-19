import { z } from 'zod';

/**
 * Parameters for retrieving diffstat between two refs (branches, tags, or commit hashes)
 */
export const GetDiffstatParamsSchema = z.object({
	workspace: z.string().min(1, 'Workspace is required'),
	repo_slug: z.string().min(1, 'Repository slug is required'),
	/** e.g., "main..feature" or "hashA..hashB" */
	spec: z.string().min(1, 'Diff spec is required'),
	pagelen: z.number().int().positive().optional(),
	cursor: z.number().int().positive().optional(), // Bitbucket page-based cursor
	topic: z.boolean().optional(),
});

export type GetDiffstatParams = z.infer<typeof GetDiffstatParamsSchema>;

export const GetRawDiffParamsSchema = z.object({
	workspace: z.string().min(1),
	repo_slug: z.string().min(1),
	spec: z.string().min(1),
});

export type GetRawDiffParams = z.infer<typeof GetRawDiffParamsSchema>;

/**
 * Schema for a single file change entry in diffstat
 */
export const DiffstatFileChangeSchema = z.object({
	status: z.string(),
	old: z
		.object({
			path: z.string(),
			type: z.string().optional(),
		})
		.nullable()
		.optional(),
	new: z
		.object({
			path: z.string(),
			type: z.string().optional(),
		})
		.nullable()
		.optional(),
	lines_added: z.number().optional(),
	lines_removed: z.number().optional(),
});

/**
 * Schema for diffstat API response (paginated)
 */
export const DiffstatResponseSchema = z.object({
	pagelen: z.number().optional(),
	values: z.array(DiffstatFileChangeSchema),
	page: z.number().optional(),
	size: z.number().optional(),
	next: z.string().optional(),
	previous: z.string().optional(),
});

export type DiffstatResponse = z.infer<typeof DiffstatResponseSchema>;
