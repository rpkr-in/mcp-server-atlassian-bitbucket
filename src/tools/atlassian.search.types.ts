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
 * Bitbucket search tool arguments base schema
 * This defines the shape without the conditional validation
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
				'Workspace slug to search in. If not provided, the system will use your default workspace (either configured via BITBUCKET_DEFAULT_WORKSPACE or the first workspace in your account). Example: "myteam"',
			),

		/**
		 * Optional: Repository slug to limit search scope. Required for `pullrequests` and `commits` scopes. Example: "project-api"
		 */
		repoSlug: z
			.string()
			.optional()
			.describe(
				'Optional: Repository slug to limit search scope. Required for `pullrequests` and `commits` scopes. Example: "project-api"',
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
		 * Search scope: "repositories", "pullrequests", "commits", "code", or "all". Default: "all"
		 */
		scope: z
			.enum(['repositories', 'pullrequests', 'commits', 'code', 'all'])
			.optional()
			.default('all')
			.describe(
				'Search scope: "repositories", "pullrequests", "commits", "code", or "all". Default: "all"',
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
 * Bitbucket search tool arguments
 * Specifies what to search for and how to filter results
 * and implements conditional validation
 */
export const SearchToolArgs = SearchToolArgsBase.superRefine((data, ctx) => {
	// Make repoSlug required when scope is 'pullrequests' or 'commits'
	if (
		(data.scope === 'pullrequests' || data.scope === 'commits') &&
		!data.repoSlug
	) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: `repoSlug is required when scope is "${data.scope}"`,
			path: ['repoSlug'], // Specify the path of the error
		});
	}
});

export type SearchToolArgsType = z.infer<typeof SearchToolArgs>;
