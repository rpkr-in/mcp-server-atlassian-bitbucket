import {
	PullRequest,
	PullRequestsResponse,
	PullRequestCommentsResponse,
	DiffstatResponse,
} from '../services/vendor.atlassian.pullrequests.types.js';
import {
	formatHeading,
	formatBulletList,
	formatUrl,
	formatSeparator,
	formatNumberedList,
	formatDate,
	formatDiff,
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
		let description = 'No description provided';
		if (pr.summary?.raw && pr.summary.raw.trim() !== '') {
			description = pr.summary.raw;
		} else if (
			pr.summary?.markup &&
			pr.summary.markup.trim() !== '' &&
			pr.summary.markup !== 'markdown'
		) {
			description = pr.summary.markup;
		}

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
 * @param diffstat - Optional diffstat data from the API
 * @param rawDiff - Optional raw diff content from the API
 * @returns Formatted string with pull request details in markdown format
 */
export function formatPullRequestDetails(
	pullRequest: PullRequest,
	diffstat?: DiffstatResponse | null,
	rawDiff?: string | null,
): string {
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
		Created: new Date(pullRequest.created_on),
		Updated: new Date(pullRequest.updated_on),
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

	// File Changes Summary from Diffstat
	if (diffstat && diffstat.values && diffstat.values.length > 0) {
		lines.push('');
		lines.push(formatHeading('File Changes', 2));

		// Calculate summary statistics
		const totalFiles = diffstat.values.length;
		let totalAdditions = 0;
		let totalDeletions = 0;

		diffstat.values.forEach((file) => {
			if (file.lines_added) totalAdditions += file.lines_added;
			if (file.lines_removed) totalDeletions += file.lines_removed;
		});

		// Add summary line
		lines.push(
			`${totalFiles} file${totalFiles !== 1 ? 's' : ''} changed with ${totalAdditions} insertion${totalAdditions !== 1 ? 's' : ''} and ${totalDeletions} deletion${totalDeletions !== 1 ? 's' : ''}`,
		);

		// Add file list (limited to 10 files for brevity)
		const maxFilesToShow = 10;
		if (totalFiles > 0) {
			lines.push('');
			diffstat.values.slice(0, maxFilesToShow).forEach((file) => {
				const changes = [];
				if (file.lines_added) changes.push(`+${file.lines_added}`);
				if (file.lines_removed) changes.push(`-${file.lines_removed}`);
				const changeStr =
					changes.length > 0 ? ` (${changes.join(', ')})` : '';
				lines.push(
					`- \`${file.old?.path || file.new?.path}\`${changeStr}`,
				);
			});

			if (totalFiles > maxFilesToShow) {
				lines.push(
					`- ... and ${totalFiles - maxFilesToShow} more files`,
				);
			}
		}
	}

	// Detailed Diff Content
	if (rawDiff) {
		lines.push('');
		lines.push(formatHeading('Code Changes (Full Diff)', 2));
		lines.push(formatDiff(rawDiff));
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

/**
 * Format pull request comments for display
 * @param commentsData - Raw pull request comments data from the API
 * @returns Formatted string with pull request comments in markdown format
 */
export function formatPullRequestComments(
	commentsData: PullRequestCommentsResponse,
): string {
	const lines: string[] = [];

	// Main heading
	const prId = commentsData.pullrequest?.id || '';
	lines.push(formatHeading(`Comments on Pull Request #${prId}`, 1));
	lines.push('');

	if (!commentsData.values || commentsData.values.length === 0) {
		lines.push('*No comments found on this pull request.*');
		return lines.join('\n');
	}

	// Group comments by parent (to handle threads)
	const topLevelComments: PullRequestCommentsResponse['values'] = [];
	const childComments: {
		[parentId: number]: PullRequestCommentsResponse['values'];
	} = {};

	// First pass: organize comments by parent
	commentsData.values.forEach((comment) => {
		if (comment.parent) {
			// This is a reply to another comment
			const parentId = comment.parent.id;
			if (!childComments[parentId]) {
				childComments[parentId] = [];
			}
			childComments[parentId].push(comment);
		} else {
			// This is a top-level comment
			topLevelComments.push(comment);
		}
	});

	// Format each top-level comment and its replies
	topLevelComments.forEach((comment) => {
		formatComment(comment, lines);

		// Add replies if any exist
		const replies = childComments[comment.id] || [];
		if (replies.length > 0) {
			lines.push('');
			lines.push('**Replies:**');

			replies.forEach((reply) => {
				lines.push('');
				lines.push(
					`> **${reply.user.display_name || 'Unknown User'}** (${formatDate(new Date(reply.created_on))})`,
				);
				lines.push(`> ${reply.content.raw.replace(/\n/g, '\n> ')}`);
			});
		}

		lines.push('');
		lines.push(formatSeparator());
	});

	// Add timestamp for when this information was retrieved
	lines.push('');
	lines.push(`*Comment information retrieved at ${formatDate(new Date())}*`);

	return lines.join('\n');
}

/**
 * Helper function to format a single comment
 * @param comment - The comment to format
 * @param lines - Array of string lines to append to
 */
function formatComment(
	comment: PullRequestCommentsResponse['values'][0],
	lines: string[],
): void {
	lines.push(
		formatHeading(
			`Comment by ${comment.user.display_name || 'Unknown User'}`,
			3,
		),
	);
	lines.push(`*Posted on ${formatDate(new Date(comment.created_on))}*`);

	if (comment.updated_on && comment.updated_on !== comment.created_on) {
		lines.push(`*Updated on ${formatDate(new Date(comment.updated_on))}*`);
	}

	// If it's an inline comment, show file and line information
	if (comment.inline) {
		const fileInfo = `File: \`${comment.inline.path}\``;
		let lineInfo = '';

		if (
			comment.inline.from !== undefined &&
			comment.inline.to !== undefined
		) {
			lineInfo = `(changed from line ${comment.inline.from} to line ${comment.inline.to})`;
		} else if (comment.inline.to !== undefined) {
			lineInfo = `(line ${comment.inline.to})`;
		}

		lines.push(`**${fileInfo}** ${lineInfo}`);
	}

	lines.push('');
	lines.push(comment.content.raw || 'No content');

	// Add link to view in browser if available
	if (comment.links?.html?.href) {
		lines.push('');
		lines.push(`[View comment in browser](${comment.links.html.href})`);
	}
}
