import {
	PullRequest,
	PullRequestsResponse,
} from '../services/vendor.atlassian.pullrequests.types.js';

/**
 * Format a list of pull requests for display
 * @param pullRequestsData - Raw pull requests data from the API
 * @param nextCursor - Pagination cursor for retrieving the next set of results
 * @returns Formatted string with pull requests information in markdown format
 */
export function formatPullRequestsList(
	pullRequestsData: PullRequestsResponse,
	nextCursor?: string,
): string {
	if (!pullRequestsData.values || pullRequestsData.values.length === 0) {
		return 'No Bitbucket pull requests found.';
	}

	const lines: string[] = ['# Bitbucket Pull Requests', ''];

	pullRequestsData.values.forEach((pr, index) => {
		// Basic information
		lines.push(`## ${index + 1}. #${pr.id}: ${pr.title}`);
		lines.push(`- **State**: ${pr.state}`);
		lines.push(`- **Repository**: ${pr.destination.repository.full_name}`);

		// Source and destination branches
		lines.push(`- **Source**: ${pr.source.branch.name}`);
		lines.push(`- **Destination**: ${pr.destination.branch.name}`);

		// Author information
		if (pr.author) {
			lines.push(`- **Author**: ${pr.author.display_name}`);
		}

		// Dates
		if (pr.created_on) {
			lines.push(
				`- **Created**: ${new Date(pr.created_on).toLocaleString()}`,
			);
		}
		if (pr.updated_on) {
			lines.push(
				`- **Updated**: ${new Date(pr.updated_on).toLocaleString()}`,
			);
		}

		// Links
		if (pr.links.html?.href) {
			lines.push(`- **Web URL**: [PR #${pr.id}](${pr.links.html.href})`);
		}

		// Add a separator between pull requests
		if (index < pullRequestsData.values.length - 1) {
			lines.push('');
			lines.push('---');
			lines.push('');
		}
	});

	// Add pagination information
	if (nextCursor) {
		lines.push('');
		lines.push('---');
		lines.push('');
		lines.push(
			`*Showing ${pullRequestsData.values.length} pull requests. More pull requests are available. Use pagination to retrieve more results.*`,
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
		`# Pull Request #${pullRequest.id}: ${pullRequest.title}`,
		'',
	];

	// Basic information
	lines.push('## Basic Information');
	lines.push(`- **State**: ${pullRequest.state}`);
	lines.push(
		`- **Repository**: ${pullRequest.destination.repository.full_name}`,
	);
	lines.push(`- **Source**: ${pullRequest.source.branch.name}`);
	lines.push(`- **Destination**: ${pullRequest.destination.branch.name}`);

	if (pullRequest.author) {
		lines.push(`- **Author**: ${pullRequest.author.display_name}`);
	}

	// Reviewers
	if (pullRequest.reviewers && pullRequest.reviewers.length > 0) {
		lines.push('- **Reviewers**:');
		pullRequest.reviewers.forEach((reviewer) => {
			lines.push(`  - ${reviewer.display_name}`);
		});
	}

	// Dates
	if (pullRequest.created_on) {
		lines.push(
			`- **Created**: ${new Date(pullRequest.created_on).toLocaleString()}`,
		);
	}
	if (pullRequest.updated_on) {
		lines.push(
			`- **Updated**: ${new Date(pullRequest.updated_on).toLocaleString()}`,
		);
	}

	// Summary or rendered content for description if available
	if (pullRequest.summary?.raw) {
		lines.push('');
		lines.push('## Description');
		lines.push(pullRequest.summary.raw);
	} else if (pullRequest.rendered?.description?.raw) {
		lines.push('');
		lines.push('## Description');
		lines.push(pullRequest.rendered.description.raw);
	}

	// Links
	lines.push('');
	lines.push('## Links');

	if (pullRequest.links.html?.href) {
		lines.push(`- [View in Browser](${pullRequest.links.html.href})`);
	}
	if (pullRequest.links.commits?.href) {
		lines.push(`- [Commits](${pullRequest.links.commits.href})`);
	}
	if (pullRequest.links.comments?.href) {
		lines.push(`- [Comments](${pullRequest.links.comments.href})`);
	}
	if (pullRequest.links.diff?.href) {
		lines.push(`- [Diff](${pullRequest.links.diff.href})`);
	}

	return lines.join('\n');
}
