import {
	PullRequest,
	PullRequestDetailed,
	PullRequestsResponse,
	PullRequestState,
	PullRequestUser,
} from '../services/vendor.atlassian.pullrequests.types.js';

/**
 * Format a date string for display
 * @param dateString ISO date string
 * @returns Formatted date string
 */
function formatDate(dateString: string): string {
	const date = new Date(dateString);
	return date.toISOString().split('T')[0];
}

/**
 * Format state for display
 * @param state Pull request state
 * @returns Formatted state string with emoji
 */
function formatState(state: PullRequestState): string {
	switch (state) {
		case 'OPEN':
			return '🟢 Open';
		case 'MERGED':
			return '🟣 Merged';
		case 'DECLINED':
			return '🔴 Declined';
		case 'SUPERSEDED':
			return '⚪ Superseded';
		default:
			return state;
	}
}

/**
 * Format user info for display
 * @param user User object
 * @returns Formatted user string
 */
function formatUser(user?: PullRequestUser): string {
	if (!user) return 'Unknown user';
	return (
		user.display_name || user.nickname || user.account_id || 'Unknown user'
	);
}

/**
 * Format a single pull request for display in the list format
 * @param pr Pull request object
 * @returns Formatted pull request string
 */
function formatPullRequestListItem(pr: PullRequest): string {
	const title = pr.title;
	const state = formatState(pr.state);
	const id = pr.id;
	const author = formatUser(pr.author);
	const created = formatDate(pr.created_on);
	const updated = formatDate(pr.updated_on);
	const sourceRepo = pr.source.repository?.name || 'unknown';
	const sourceBranch = pr.source.branch.name;
	const destRepo = pr.destination.repository?.name || 'unknown';
	const destBranch = pr.destination.branch.name;

	return `**#${id}: ${title}**
- **Status**: ${state}
- **Author**: ${author}
- **Created**: ${created}${created !== updated ? ` (Updated: ${updated})` : ''}
- **Branch**: \`${sourceRepo}/${sourceBranch}\` → \`${destRepo}/${destBranch}\`
- **URL**: ${pr.links.html?.href || '#'}
`;
}

/**
 * Format a list of pull requests into a markdown string
 * @param response API response containing pull requests
 * @param nextPage Next page number for pagination
 * @returns Formatted markdown string
 */
export function formatPullRequestsList(
	response: PullRequestsResponse,
	nextPage?: number,
): string {
	const { values: pullRequests, size } = response;

	if (!pullRequests || pullRequests.length === 0) {
		return `### No pull requests found

No pull requests match the criteria.`;
	}

	const totalCount = size || pullRequests.length;
	const items = pullRequests.map(formatPullRequestListItem).join('\n\n');
	const pagination = nextPage
		? `\n\n_Showing ${pullRequests.length} of ${totalCount} pull requests. Use pagination to see more._`
		: '';

	return `### Pull Requests (${totalCount})

${items}${pagination}`;
}

/**
 * Format detailed pull request information
 * @param pr Pull request details
 * @returns Formatted markdown string
 */
export function formatPullRequestDetails(pr: PullRequestDetailed): string {
	const title = pr.title;
	const state = formatState(pr.state);
	const id = pr.id;
	const author = formatUser(pr.author);
	const created = formatDate(pr.created_on);
	const updated = formatDate(pr.updated_on);
	const sourceRepo = pr.source.repository?.name || 'unknown';
	const sourceBranch = pr.source.branch.name;
	const destRepo = pr.destination.repository?.name || 'unknown';
	const destBranch = pr.destination.branch.name;

	// Reviewers section
	const reviewers =
		pr.reviewers && pr.reviewers.length > 0
			? `### Reviewers
${pr.reviewers.map((r) => `- ${formatUser(r)}`).join('\n')}`
			: '';

	// Description section
	const description = pr.rendered?.description?.html
		? `### Description
${pr.rendered.description.html}`
		: pr.summary?.raw
			? `### Description
${pr.summary.raw}`
			: '';

	// Stats section
	const stats = `### Stats
- **Comments**: ${pr.comment_count || 0}
- **Tasks**: ${pr.task_count || 0}
- **Close source branch**: ${pr.close_source_branch ? 'Yes' : 'No'}`;

	// Links section
	const links = pr.links || {};
	const linksList = [
		links.html?.href ? `- [View on Bitbucket](${links.html.href})` : '',
		links.diff?.href ? `- [View diff](${links.diff.href})` : '',
		links.commits?.href ? `- [View commits](${links.commits.href})` : '',
		links.comments?.href ? `- [View comments](${links.comments.href})` : '',
	]
		.filter(Boolean)
		.join('\n');

	const linksSection = linksList
		? `### Links
${linksList}`
		: '';

	return `# Pull Request #${id}: ${title}

- **Status**: ${state}
- **Author**: ${author}
- **Created**: ${created}${created !== updated ? ` (Updated: ${updated})` : ''}
- **Branch**: \`${sourceRepo}/${sourceBranch}\` → \`${destRepo}/${destBranch}\`

${description}

${reviewers}

${stats}

${linksSection}`;
}
