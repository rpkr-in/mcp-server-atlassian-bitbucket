import { z } from 'zod';

/**
 * Arguments for listing Jira issues
 * Includes optional filters with defaults applied in the controller
 */
const ListIssuesToolArgs = z.object({
	jql: z
		.string()
		.optional()
		.describe(
			'JQL query string to filter issues. Use this to search for specific issues using Jira Query Language (e.g., "project = PROJ AND status = Open").',
		),
	limit: z
		.number()
		.min(1)
		.max(100)
		.optional()
		.describe(
			'Maximum number of issues to return (1-100). Use this to control the response size. Useful for pagination or when you only need a few results.',
		),
	cursor: z
		.string()
		.optional()
		.describe(
			'Pagination cursor for retrieving the next set of results. Use this to navigate through large result sets. The cursor value can be obtained from the pagination information in a previous response.',
		),
});

type ListIssuesToolArgsType = z.infer<typeof ListIssuesToolArgs>;

/**
 * Arguments for getting a specific Jira issue
 * This matches the controller implementation which takes an ID or key parameter and optional fields
 */
const GetIssueToolArgs = z.object({
	idOrKey: z
		.string()
		.describe(
			'The ID or key of the Jira issue to retrieve (e.g., "10001" or "PROJ-123"). This is required and must be a valid issue ID or key from your Jira instance.',
		),
});

type GetIssueToolArgsType = z.infer<typeof GetIssueToolArgs>;

export {
	ListIssuesToolArgs,
	type ListIssuesToolArgsType,
	GetIssueToolArgs,
	type GetIssueToolArgsType,
};
