import { PullRequest } from '../services/vendor.atlassian.pullrequests.types.js';
import {
	formatUrl,
	formatPagination,
	formatHeading,
	formatBulletList,
	formatSeparator,
	formatNumberedList,
} from '../utils/formatter.util.js';

/**
 * Format a list of pull requests for display
 * @param pullRequestsData - Raw pull requests data from the API
 * @param pagination - Pagination information including count and next cursor
 * @returns Formatted string with pull requests information in markdown format
 */
export function formatPullRequestsList(
	pullRequestsData: { values?: PullRequest[] },
	pagination?: { nextCursor?: string; hasMore: boolean; count?: number },
): string {
	const pullRequests = pullRequestsData.values || [];

	if (pullRequests.length === 0) {
		return 'No pull requests found.';
	}

	const lines: string[] = [formatHeading('Bitbucket Pull Requests', 1), ''];

	// Use the numbered list formatter for consistent formatting
	const formattedList = formatNumberedList(pullRequests, (pr) => {
		const itemLines: string[] = [];

		// Basic information
		itemLines.push(formatHeading(`#${pr.id}: ${pr.title}`, 2));

		// Create an object with all the properties to display
		const properties: Record<string, unknown> = {
			ID: pr.id,
			Title: pr.title,
			State: pr.state,
			'Created On': pr.created_on,
			'Updated On': pr.updated_on,
			Author: pr.author?.display_name || pr.author?.nickname,
			Source: `${pr.source.branch.name} (${pr.source.repository.name})`,
			Destination: `${pr.destination.branch.name} (${pr.destination.repository.name})`,
			URL: {
				url: pr.links.html?.href || '',
				title: `PR #${pr.id}`,
			},
		};

		// Format as a bullet list with proper formatting for each value type
		itemLines.push(formatBulletList(properties, (key) => key));

		return itemLines.join('\n');
	});

	lines.push(formattedList);

	// Add pagination information if available
	if (pagination) {
		lines.push('');
		lines.push(formatSeparator());
		lines.push('');
		lines.push(
			formatPagination(
				pagination.count || pullRequests.length,
				pagination.hasMore,
				pagination.nextCursor,
			),
		);
	}

	return lines.join('\n');
}

/**
 * Format detailed pull request information for display
 * @param pullRequest - Raw pull request data from the API
 * @returns Formatted string with pull request details in markdown format
 */
export function formatPullRequestDetails(pullRequest: PullRequest): string {
	const lines: string[] = [
		formatHeading(
			`Pull Request #${pullRequest.id}: ${pullRequest.title}`,
			1,
		),
		'',
		formatHeading('Basic Information', 2),
	];

	// Format basic information as a bullet list
	const basicProperties: Record<string, unknown> = {
		State: pullRequest.state,
		Repository: pullRequest.destination.repository.full_name,
		Source: pullRequest.source.branch.name,
		Destination: pullRequest.destination.branch.name,
		Author: pullRequest.author?.display_name,
		Created: pullRequest.created_on,
		Updated: pullRequest.updated_on,
	};

	lines.push(formatBulletList(basicProperties, (key) => key));

	// Reviewers
	if (pullRequest.reviewers && pullRequest.reviewers.length > 0) {
		lines.push('');
		lines.push(formatHeading('Reviewers', 2));
		const reviewerLines: string[] = [];
		pullRequest.reviewers.forEach((reviewer) => {
			reviewerLines.push(`- ${reviewer.display_name}`);
		});
		lines.push(reviewerLines.join('\n'));
	}

	// Summary or rendered content for description if available
	if (pullRequest.summary?.raw) {
		lines.push('');
		lines.push(formatHeading('Description', 2));
		lines.push(pullRequest.summary.raw);
	} else if (pullRequest.rendered?.description?.raw) {
		lines.push('');
		lines.push(formatHeading('Description', 2));
		lines.push(pullRequest.rendered.description.raw);
	}

	// Links
	lines.push('');
	lines.push(formatHeading('Links', 2));

	const links: string[] = [];

	if (pullRequest.links.html?.href) {
		links.push(
			`- ${formatUrl(pullRequest.links.html.href, 'View in Browser')}`,
		);
	}
	if (pullRequest.links.commits?.href) {
		links.push(`- ${formatUrl(pullRequest.links.commits.href, 'Commits')}`);
	}
	if (pullRequest.links.comments?.href) {
		links.push(
			`- ${formatUrl(pullRequest.links.comments.href, 'Comments')}`,
		);
	}
	if (pullRequest.links.diff?.href) {
		links.push(`- ${formatUrl(pullRequest.links.diff.href, 'Diff')}`);
	}

	lines.push(links.join('\n'));

	return lines.join('\n');
}
