import {
	Repository,
	RepositoriesResponse,
} from '../services/vendor.atlassian.repositories.types.js';
import { PullRequestsResponse } from '../services/vendor.atlassian.pullrequests.types.js';
import {
	formatUrl,
	formatHeading,
	formatBulletList,
	formatSeparator,
	formatNumberedList,
	formatDate,
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
	const formattedList = formatNumberedList(repositories, (repo, index) => {
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
				? formatDate(new Date(repo.created_on))
				: 'N/A',
			Updated: repo.updated_on
				? formatDate(new Date(repo.updated_on))
				: 'N/A',
			URL: repo.links?.html?.href
				? formatUrl(repo.links.html.href, repo.full_name)
				: 'N/A',
		};

		// Format as a bullet list
		itemLines.push(formatBulletList(properties, (key) => key));

		// Add separator between repositories except for the last one
		if (index < repositories.length - 1) {
			itemLines.push('');
			itemLines.push(formatSeparator());
		}

		return itemLines.join('\n');
	});

	lines.push(formattedList);

	// Add timestamp for when this information was retrieved
	lines.push('');
	lines.push(
		`*Repository information retrieved at ${formatDate(new Date())}*`,
	);

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
			? formatDate(new Date(repositoryData.created_on))
			: 'N/A',
		'Updated On': repositoryData.updated_on
			? formatDate(new Date(repositoryData.updated_on))
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
			return `**#${pr.id}**: [${pr.title}](${pr.links.html?.href || '#'}) - ${pr.state} by ${pr.author.display_name || 'Unknown'} (${formatDate(new Date(pr.updated_on))})`;
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
		`*Repository information retrieved at ${formatDate(new Date())}*`,
	);
	lines.push(`*To view this repository in Bitbucket, visit: ${repoUrl}*`);

	return lines.join('\n');
}
