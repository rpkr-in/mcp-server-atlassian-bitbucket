import { z } from 'zod';

/**
 * Pagination arguments
 * Used for pagination of search results
 */
const PaginationArgs = z.object({
	/**
	 * Maximum number of items to return (1-100).
	 * Use this to control the response size.
	 * Useful for pagination or when you only need a few results.
	 */
	limit: z
		.number()
		.min(1)
		.max(100)
		.optional()
		.describe(
			'Maximum number of items to return (1-100). Use this to control the response size. Useful for pagination or when you only need a few results.',
		),

	/**
	 * Pagination cursor for retrieving the next set of results.
	 * For repositories and pull requests, this is a cursor string.
	 * For code search, this is a page number.
	 * Use this to navigate through large result sets.
	 */
	cursor: z
		.string()
		.optional()
		.describe(
			'Pagination cursor for retrieving the next set of results. For repositories and pull requests, this is a cursor string. For code search, this is a page number. Use this to navigate through large result sets.',
		),
});

/**
 * Bitbucket search tool arguments schema base
 */
export const SearchToolArgsBase = z
	.object({
		/**
		 * Workspace slug to search in. Example: "myteam"
		 */
		workspaceSlug: z
			.string()
			.optional()
			.describe(
				'Workspace slug to search in. If not provided, the system will use your default workspace. Example: "myteam"',
			),

		/**
		 * Optional: Repository slug to limit search scope. Required for `pullrequests` scope. Example: "project-api"
		 */
		repoSlug: z
			.string()
			.optional()
			.describe(
				'Optional: Repository slug to limit search scope. Required for `pullrequests` scope. Example: "project-api"',
			),

		/**
		 * Search query text. Required. Will match against content based on the selected search scope.
		 */
		query: z
			.string()
			.min(1)
			.describe(
				'Search query text. Required. Will match against content based on the selected search scope.',
			),

		/**
		 * Search scope: "code", "content", "repositories", "pullrequests". Default: "code"
		 */
		scope: z
			.enum(['code', 'content', 'repositories', 'pullrequests'])
			.optional()
			.default('code')
			.describe(
				'Search scope: "code", "content", "repositories", "pullrequests". Default: "code"',
			),

		/**
		 * Content type for content search (e.g., "wiki", "issue")
		 */
		contentType: z
			.string()
			.optional()
			.describe(
				'Content type for content search (e.g., "wiki", "issue")',
			),

		/**
		 * Filter code search by language.
		 */
		language: z
			.string()
			.optional()
			.describe('Filter code search by language.'),

		/**
		 * Filter code search by file extension.
		 */
		extension: z
			.string()
			.optional()
			.describe('Filter code search by file extension.'),
	})
	.merge(PaginationArgs);

/**
 * Bitbucket search tool arguments schema with validation
 */
export const SearchToolArgs = SearchToolArgsBase.superRefine((data, ctx) => {
	// Make repoSlug required when scope is 'pullrequests'
	if (data.scope === 'pullrequests' && !data.repoSlug) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: 'repoSlug is required when scope is "pullrequests"',
			path: ['repoSlug'],
		});
	}
});

// Export both the schema and its shape for use with the MCP server
export const SearchToolArgsSchema = SearchToolArgsBase;

export type SearchToolArgsType = z.infer<typeof SearchToolArgs>;
