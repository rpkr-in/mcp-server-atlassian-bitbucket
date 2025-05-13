import {
	Repository,
	RepositoriesResponse,
	PaginatedCommits,
	Commit,
	BranchesResponse,
} from '../services/vendor.atlassian.repositories.types.js';
import { PullRequestsResponse } from '../services/vendor.atlassian.pullrequests.types.js';
import {
	formatUrl,
	formatHeading,
	formatBulletList,
	formatSeparator,
	formatNumberedList,
	formatDate,
	formatTable,
	formatLink,
} from '../utils/formatter.util.js';

/**
 * Format a list of repositories for display
 * @param repositoriesData - Raw repositories data from the API
 * @returns Formatted string with repositories information in markdown format
 */
export function formatRepositoriesList(
	repositoriesData: RepositoriesResponse,
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
			Created: repo.created_on ? formatDate(repo.created_on) : 'N/A',
			Updated: repo.updated_on ? formatDate(repo.updated_on) : 'N/A',
			URL: repo.links?.html?.href
				? formatUrl(repo.links.html.href, repo.full_name)
				: 'N/A',
		};

		// Format as a bullet list
		itemLines.push(formatBulletList(properties, (key) => key));

		return itemLines.join('\n');
	});

	lines.push(formattedList);

	// Add standard footer with timestamp
	lines.push('\n\n' + formatSeparator());
	lines.push(`*Information retrieved at: ${formatDate(new Date())}*`);

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
		'Main Branch': repositoryData.mainbranch?.name || 'N/A',
		Private: repositoryData.is_private ? 'Yes' : 'No',
		Size: repositoryData.size
			? `${(repositoryData.size / 1024).toFixed(2)} KB`
			: 'Unknown',
		'Created On': repositoryData.created_on
			? formatDate(repositoryData.created_on)
			: 'N/A',
		'Updated On': repositoryData.updated_on
			? formatDate(repositoryData.updated_on)
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
			return `**#${pr.id}**: [${pr.title}](${pr.links.html?.href || '#'}) - ${pr.state} by ${pr.author.display_name || 'Unknown'} (${formatDate(pr.updated_on)})`;
		});

		lines.push(formattedPrList);

		if (repoUrl) {
			lines.push(
				`*View all pull requests in Bitbucket: [${repositoryData.full_name}/pull-requests](${repoUrl}/pull-requests)*`,
			);
		}
	}

	// Add standard footer with timestamp
	lines.push('\n\n' + formatSeparator());
	lines.push(`*Information retrieved at: ${formatDate(new Date())}*`);

	// Optionally keep the direct link
	if (repoUrl) {
		lines.push(`*View this repository in Bitbucket: ${repoUrl}*`);
	}

	return lines.join('\n');
}

/**
 * Format commit history for display.
 * @param commitsData - Raw paginated commits data from the API.
 * @param options - Filtering options used to retrieve the history.
 * @returns Formatted string with commit history in markdown format.
 */
export function formatCommitHistory(
	commitsData: PaginatedCommits,
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
			`**${commitUrl ? formatUrl(commitUrl, shortHash) : shortHash}** - ${formatDate(commit.date)}`,
		);

		// Author
		commitLines.push(` Author: ${author}`);

		// Message (indented blockquote)
		const message = commit.message.trim().replace(/\n/g, '\n > ');
		commitLines.push(' >');
		commitLines.push(` > ${message}`);

		return commitLines.join('\n');
	});

	lines.push(formattedList);

	// Add standard footer with timestamp
	lines.push('\n\n' + formatSeparator());
	lines.push(`*Information retrieved at: ${formatDate(new Date())}*`);

	return lines.join('\n');
}

/**
 * Formats a list of branches from a repository into a markdown string.
 *
 * @param branchesData The branch data response from the API
 * @param context Additional context information (workspace and repo slugs)
 * @returns Formatted markdown string representing the branches
 */
export function formatBranchesList(
	branchesData: BranchesResponse,
	context: { workspaceSlug: string; repoSlug: string },
): string {
	const { workspaceSlug, repoSlug } = context;

	// Handle empty results
	if (!branchesData.values || branchesData.values.length === 0) {
		return 'No branches found in this repository.';
	}

	const sections = [];

	// Add header with repository info
	sections.push(`# Branches in ${workspaceSlug}/${repoSlug}`);

	// Create a table for the branches
	const tableHeaders = ['Branch Name', 'Latest Commit', 'Merge Strategy'];
	const rows = branchesData.values.map((branch) => {
		const commitHash = branch.target?.hash
			? branch.target.hash.substring(0, 7)
			: 'N/A';

		// Type guard to check if links.html has href property
		const hasLink =
			branch.links?.html &&
			typeof branch.links.html === 'object' &&
			branch.links.html !== null &&
			'href' in branch.links.html &&
			typeof branch.links.html.href === 'string';

		return [
			// Branch name with link if available
			hasLink
				? formatLink(
						branch.name,
						(branch.links?.html as { href: string }).href,
					)
				: branch.name,
			// Commit hash truncated
			commitHash,
			// Default merge strategy
			branch.default_merge_strategy || 'Standard',
		];
	});

	// Add the table to the sections
	sections.push(formatTable(tableHeaders, rows));

	// Add count information
	sections.push(
		`Found ${branchesData.values.length} branch${branchesData.values.length !== 1 ? 'es' : ''}.`,
	);

	// Join all sections with double newlines
	return sections.join('\n\n');
}
