import { Repository } from '../services/vendor.atlassian.repositories.types.js';
import {
	formatUrl,
	formatPagination,
	formatHeading,
	formatBulletList,
	formatSeparator,
	formatNumberedList,
} from '../utils/formatters/common.formatter.js';

/**
 * Format a list of repositories for display
 * @param repositories - Array of repositories from the API response
 * @param nextCursor - Pagination cursor for retrieving the next set of results
 * @returns Formatted string with repositories information in markdown format
 */
export function formatRepositoriesList(
	repositories: Repository[],
	nextCursor?: string,
): string {
	if (!repositories || repositories.length === 0) {
		return 'No Bitbucket repositories found.';
	}

	const lines: string[] = [formatHeading('Bitbucket Repositories', 1), ''];

	// Use the numbered list formatter for consistent formatting
	const formattedList = formatNumberedList(repositories, (repo) => {
		const itemLines: string[] = [];

		// Basic information
		itemLines.push(formatHeading(repo.name, 2));

		// Create an object with all the properties to display
		const properties: Record<string, unknown> = {
			UUID: repo.uuid,
			'Full Name': repo.full_name,
			Type: repo.type || 'Not specified',
			Private: repo.is_private ? 'Yes' : 'No',
			'Created On': repo.created_on,
			'Updated On': repo.updated_on,
			Language: repo.language,
			Size: repo.size !== undefined ? formatSize(repo.size) : undefined,
			'Web URL': repo.links.html?.href
				? {
						url: repo.links.html.href,
						title: repo.full_name,
					}
				: undefined,
			Description: repo.description,
		};

		// Format as a bullet list with proper formatting for each value type
		itemLines.push(formatBulletList(properties, (key) => key));

		return itemLines.join('\n');
	});

	lines.push(formattedList);

	// Add pagination information
	if (nextCursor) {
		lines.push('');
		lines.push(formatSeparator());
		lines.push('');
		lines.push(formatPagination(repositories.length, true, nextCursor));
	}

	return lines.join('\n');
}

/**
 * Format detailed repository information for display
 * @param repository - Raw repository data from the API
 * @returns Formatted string with repository details in markdown format
 */
export function formatRepositoryDetails(repository: Repository): string {
	const lines: string[] = [
		formatHeading(`Repository: ${repository.name}`, 1),
		'',
		formatHeading('Basic Information', 2),
	];

	// Format basic information as a bullet list
	const basicProperties: Record<string, unknown> = {
		UUID: repository.uuid,
		'Full Name': repository.full_name,
		Type: repository.type || 'Not specified',
		Private: repository.is_private ? 'Yes' : 'No',
		'Default Branch': repository.mainbranch?.name || 'Not set',
		'Created On': repository.created_on,
		'Updated On': repository.updated_on,
		Size:
			repository.size !== undefined
				? formatSize(repository.size)
				: undefined,
		Language: repository.language,
	};

	lines.push(formatBulletList(basicProperties, (key) => key));

	// Description if available
	if (repository.description) {
		lines.push('');
		lines.push(formatHeading('Description', 2));
		lines.push(repository.description);
	}

	// Links section
	lines.push('');
	lines.push(formatHeading('Links', 2));

	const links: string[] = [];

	if (repository.links.html?.href) {
		links.push(
			`- ${formatUrl(repository.links.html.href, 'View in Browser')}`,
		);
	}

	if (repository.links.clone) {
		links.push('- **Clone URLs**:');
		repository.links.clone.forEach((clone) => {
			links.push(`  - ${clone.name}: \`${clone.href}\``);
		});
	}

	if (repository.links.commits?.href) {
		links.push(`- ${formatUrl(repository.links.commits.href, 'Commits')}`);
	}

	if (repository.links.pullrequests?.href) {
		links.push(
			`- ${formatUrl(repository.links.pullrequests.href, 'Pull Requests')}`,
		);
	}

	lines.push(links.join('\n'));

	return lines.join('\n');
}

/**
 * Format a file size in bytes to a human-readable string
 * @param bytes - Size in bytes
 * @returns Formatted size string (e.g., "1.5 MB")
 */
function formatSize(bytes: number): string {
	if (bytes === 0) return '0 Bytes';

	const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
	const i = Math.floor(Math.log(bytes) / Math.log(1024));

	return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(2))} ${sizes[i]}`;
}
