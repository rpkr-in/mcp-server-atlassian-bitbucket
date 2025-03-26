import {
	PullRequest,
	PullRequestsResponse,
} from '../services/vendor.atlassian.pullrequests.types.js';
import {
	formatUrl,
	formatHeading,
	formatBulletList,
	formatSeparator,
	formatNumberedList,
	formatDate,
} from '../utils/formatter.util.js';

/**
 * Format a list of pull requests for display
 * @param pullRequestsData - Raw pull requests data from the API
 * @returns Formatted string with pull requests information in markdown format
 */
export function formatPullRequestsList(
	pullRequestsData: PullRequestsResponse,
): string {
	const pullRequests = pullRequestsData.values || [];

	if (pullRequests.length === 0) {
		return 'No pull requests found matching your criteria.';
	}

	const lines: string[] = [formatHeading('Bitbucket Pull Requests', 1), ''];

	// Format each pull request with its details
	const formattedList = formatNumberedList(pullRequests, (pr, index) => {
		const itemLines: string[] = [];
		itemLines.push(formatHeading(`#${pr.id}: ${pr.title}`, 2));

		// Prepare the description (truncated if too long)
		let description =
			pr.summary?.raw || pr.summary?.markup || 'No description provided';
		if (description.length > 150) {
			description = description.substring(0, 150) + '...';
		}

		// Basic information
		const properties: Record<string, unknown> = {
			ID: pr.id,
			State: pr.state,
			Author: pr.author?.display_name || pr.author?.nickname || 'Unknown',
			Created: formatDate(new Date(pr.created_on)),
			Updated: formatDate(new Date(pr.updated_on)),
			'Source Branch': pr.source?.branch?.name || 'Unknown',
			'Destination Branch': pr.destination?.branch?.name || 'Unknown',
			Description: description,
			URL: pr.links?.html?.href
				? formatUrl(pr.links.html.href, `PR #${pr.id}`)
				: 'N/A',
		};

		// Format as a bullet list
		itemLines.push(formatBulletList(properties, (key) => key));

		// Add separator between pull requests except for the last one
		if (index < pullRequests.length - 1) {
			itemLines.push('');
			itemLines.push(formatSeparator());
		}

		return itemLines.join('\n');
	});

	lines.push(formattedList);

	// Add timestamp for when this information was retrieved
	lines.push('');
	lines.push(
		`*Pull request information retrieved at ${formatDate(new Date())}*`,
	);

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
