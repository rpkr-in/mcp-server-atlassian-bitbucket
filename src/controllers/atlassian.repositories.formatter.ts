import {
	Repository,
	RepositoriesResponse,
	PaginatedCommits,
	Commit,
} from '../services/vendor.atlassian.repositories.types.js';
import { PullRequestsResponse } from '../services/vendor.atlassian.pullrequests.types.js';
import {
	formatUrl,
	formatHeading,
	formatBulletList,
	formatSeparator,
	formatNumberedList,
} from '../utils/formatter.util.js';
import { ResponsePagination } from '../types/common.types.js';

/**
 * Format a list of repositories for display
 * @param repositoriesData - Raw repositories data from the API
 * @param pagination - Pagination info for footer hints
 * @returns Formatted string with repositories information in markdown format
 */
export function formatRepositoriesList(
	repositoriesData: RepositoriesResponse,
	pagination?: ResponsePagination,
): string {
	const repositories = repositoriesData.values || [];

	if (repositories.length === 0) {
		return 'No repositories found matching your criteria.';
	}

	const lines: string[] = [formatHeading('Bitbucket Repositories', 1), ''];

	// Format each repository with its details
	const formattedList = formatNumberedList(repositories, (repo, _index) => {
		const itemLines: string[] = [];
		itemLines.push(formatHeading(repo.name, 2));

		// Basic information
		const properties: Record<string, unknown> = {
			Name: repo.name,
			'Full Name': repo.full_name,
			Owner:
				repo.owner?.display_name || repo.owner?.username || 'Unknown',
			Description: repo.description || 'No description provided',
			'Project Key': repo.project?.key || 'N/A',
			Private: repo.is_private ? 'Yes' : 'No',
			Created: repo.created_on
				? new Date(repo.created_on).toLocaleString()
				: 'N/A',
			Updated: repo.updated_on
				? new Date(repo.updated_on).toLocaleString()
				: 'N/A',
			URL: repo.links?.html?.href
				? formatUrl(repo.links.html.href, repo.full_name)
				: 'N/A',
		};

		// Format as a bullet list
		itemLines.push(formatBulletList(properties, (key) => key));

		return itemLines.join('\n');
	});

	lines.push(formattedList);

	// --- Footer ---
	const footerLines: string[] = [];
	footerLines.push('--');

	const displayedCount = pagination?.count ?? repositories.length;
	// Bitbucket uses page-based pagination here
	if (pagination?.hasMore) {
		footerLines.push(
			`*Showing ${displayedCount} repositories. More results are available.*`,
		);
		const nextPage = (pagination.page ?? 1) + 1;
		footerLines.push(`*Use --page ${nextPage} to view more.*`);
	} else {
		footerLines.push(`*Showing ${displayedCount} repositories.*`);
	}

	footerLines.push(
		`*Information retrieved at: ${new Date().toLocaleString()}*`,
	);

	lines.push(...footerLines);

	return lines.join('\n');
}

/**
 * Format detailed repository information for display
 * @param repositoryData - Raw repository data from the API
 * @param pullRequestsData - Optional pull requests data for this repository
 * @returns Formatted string with repository details in markdown format
 */
export function formatRepositoryDetails(
	repositoryData: Repository,
	pullRequestsData?: PullRequestsResponse | null,
): string {
	// Create URL
	const repoUrl = repositoryData.links?.html?.href || '';

	const lines: string[] = [
		formatHeading(`Repository: ${repositoryData.name}`, 1),
		'',
		`> A ${repositoryData.is_private ? 'private' : 'public'} repository in the \`${repositoryData.full_name}\` workspace.`,
		'',
		formatHeading('Basic Information', 2),
	];

	// Format basic information as a bullet list
	const basicProperties: Record<string, unknown> = {
		Name: repositoryData.name,
		'Full Name': repositoryData.full_name,
		UUID: repositoryData.uuid,
		Description: repositoryData.description || 'No description provided',
		Language: repositoryData.language || 'Not specified',
		Private: repositoryData.is_private ? 'Yes' : 'No',
		Size: repositoryData.size
			? `${(repositoryData.size / 1024).toFixed(2)} KB`
			: 'Unknown',
		'Created On': repositoryData.created_on
			? new Date(repositoryData.created_on).toLocaleString()
			: 'N/A',
		'Updated On': repositoryData.updated_on
			? new Date(repositoryData.updated_on).toLocaleString()
			: 'N/A',
	};

	lines.push(formatBulletList(basicProperties, (key) => key));

	// Owner information
	if (repositoryData.owner) {
		lines.push('');
		lines.push(formatHeading('Owner', 2));

		const ownerProperties: Record<string, unknown> = {
			Name:
				repositoryData.owner.display_name ||
				repositoryData.owner.username ||
				'Unknown',
			Type: repositoryData.owner.type || 'Not specified',
		};

		lines.push(formatBulletList(ownerProperties, (key) => key));
	}

	// Links section
	lines.push('');
	lines.push(formatHeading('Links', 2));

	if (repoUrl) {
		lines.push(`- ${formatUrl(repoUrl, 'Open in Bitbucket')}`);
	}

	// Add recent pull requests section if available
	if (
		pullRequestsData &&
		pullRequestsData.values &&
		pullRequestsData.values.length > 0
	) {
		lines.push('');
		lines.push(formatHeading('Recent Pull Requests', 2));

		const prList = pullRequestsData.values.slice(0, 25); // Ensure max 25
		const formattedPrList = formatNumberedList(prList, (pr) => {
			return `**#${pr.id}**: [${pr.title}](${pr.links.html?.href || '#'}) - ${pr.state} by ${pr.author.display_name || 'Unknown'} (${new Date(pr.updated_on).toLocaleString()})`;
		});

		lines.push(formattedPrList);
		lines.push('');
		lines.push(`*Showing ${prList.length} recent pull requests.*`);

		if (repoUrl) {
			lines.push(
				`*View all pull requests in Bitbucket: [${repositoryData.full_name}/pull-requests](${repoUrl}/pull-requests)*`,
			);
		}
	}

	// Add timestamp for when this information was retrieved
	lines.push('');
	lines.push(formatSeparator());
	lines.push(
		`*Repository information retrieved at ${new Date().toLocaleString()}*`,
	);
	lines.push(`*To view this repository in Bitbucket, visit: ${repoUrl}*`);

	return lines.join('\n');
}

/**
 * Format commit history for display.
 * @param commitsData - Raw paginated commits data from the API.
 * @param pagination - Pagination info for footer hints
 * @param options - Filtering options used to retrieve the history.
 * @returns Formatted string with commit history in markdown format.
 */
export function formatCommitHistory(
	commitsData: PaginatedCommits,
	pagination?: ResponsePagination,
	options: { revision?: string; path?: string } = {},
): string {
	const commits = commitsData.values || [];

	if (commits.length === 0) {
		return 'No commits found matching your criteria.';
	}

	const headerParts = ['Commit History'];
	if (options.revision) {
		headerParts.push(`for revision \`${options.revision}\``);
	}
	if (options.path) {
		headerParts.push(`on path \`${options.path}\``);
	}

	const lines: string[] = [formatHeading(headerParts.join(' '), 1), ''];

	const formattedList = formatNumberedList(commits, (commit: Commit) => {
		const commitLines: string[] = [];
		const author =
			commit.author?.user?.display_name ||
			commit.author?.raw ||
			'Unknown';
		const commitUrl = commit.links?.html?.href;
		const shortHash = commit.hash.substring(0, 7);

		// Header: Hash (linked) - Date
		commitLines.push(
			`**${commitUrl ? formatUrl(commitUrl, shortHash) : shortHash}** - ${new Date(commit.date).toLocaleString()}`,
		);

		// Author
		commitLines.push(` Author: ${author}`);

		// Message (indented blockquote)
		const message = commit.message.trim().replace(/n/g, 'n > ');
		commitLines.push(' >');
		commitLines.push(` > ${message}`);

		return commitLines.join('\n');
	});

	lines.push(formattedList);

	// --- Footer ---
	const footerLines: string[] = [];
	footerLines.push('--');

	const displayedCount = pagination?.count ?? commits.length;
	// Bitbucket uses page-based pagination here
	if (pagination?.hasMore) {
		footerLines.push(
			`*Showing ${displayedCount} commits. More results are available.*`,
		);
		const nextPage = (pagination?.page ?? 1) + 1;
		footerLines.push(`*Use --page ${nextPage} to view more.*`);
	} else {
		footerLines.push(`*Showing ${displayedCount} commits.*`);
	}

	footerLines.push(
		`*Information retrieved at: ${new Date().toLocaleString()}*`,
	);

	lines.push(...footerLines);

	return lines.join('\n');
}
