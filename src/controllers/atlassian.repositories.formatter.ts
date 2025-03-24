import {
	Repository,
	RepositoriesResponse,
} from '../services/vendor.atlassian.repositories.types.js';

/**
 * Format a list of repositories for display
 * @param repositoriesData - Raw repositories data from the API
 * @param nextCursor - Pagination cursor for retrieving the next set of results
 * @returns Formatted string with repositories information in markdown format
 */
export function formatRepositoriesList(
	repositoriesData: RepositoriesResponse,
	nextCursor?: string,
): string {
	if (!repositoriesData.values || repositoriesData.values.length === 0) {
		return 'No Bitbucket repositories found.';
	}

	const lines: string[] = ['# Bitbucket Repositories', ''];

	repositoriesData.values.forEach((repo, index) => {
		// Basic information
		lines.push(`## ${index + 1}. ${repo.name}`);
		lines.push(`- **UUID**: ${repo.uuid}`);
		lines.push(`- **Full Name**: ${repo.full_name}`);
		lines.push(`- **Type**: ${repo.type || 'Not specified'}`);
		lines.push(`- **Private**: ${repo.is_private ? 'Yes' : 'No'}`);

		// Creation date
		if (repo.created_on) {
			lines.push(
				`- **Created On**: ${new Date(repo.created_on).toLocaleString()}`,
			);
		}

		// Links
		if (repo.links.html?.href) {
			lines.push(
				`- **Web URL**: [${repo.full_name}](${repo.links.html.href})`,
			);
		}

		// Language if available
		if (repo.language) {
			lines.push(`- **Language**: ${repo.language}`);
		}

		// Size if available
		if (repo.size !== undefined) {
			lines.push(`- **Size**: ${formatSize(repo.size)}`);
		}

		// Description if available
		if (repo.description) {
			lines.push(`- **Description**: ${repo.description}`);
		}

		// Add a separator between repositories
		if (index < repositoriesData.values.length - 1) {
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
			`*Showing ${repositoriesData.values.length} repositories. More repositories are available. Use pagination to retrieve more results.*`,
		);
	}

	return lines.join('\n');
}

/**
 * Format detailed repository information for display
 * @param repository - Raw repository data from the API
 * @returns Formatted string with repository details in markdown format
 */
export function formatRepositoryDetails(repository: Repository): string {
	const lines: string[] = [`# Repository: ${repository.name}`, ''];

	// Basic information
	lines.push('## Basic Information');
	lines.push(`- **UUID**: ${repository.uuid}`);
	lines.push(`- **Full Name**: ${repository.full_name}`);
	lines.push(`- **Type**: ${repository.type || 'Not specified'}`);
	lines.push(`- **Private**: ${repository.is_private ? 'Yes' : 'No'}`);
	lines.push(
		`- **Default Branch**: ${repository.mainbranch?.name || 'Not set'}`,
	);

	if (repository.created_on) {
		lines.push(
			`- **Created On**: ${new Date(repository.created_on).toLocaleString()}`,
		);
	}
	if (repository.updated_on) {
		lines.push(
			`- **Updated On**: ${new Date(repository.updated_on).toLocaleString()}`,
		);
	}

	// Size if available
	if (repository.size !== undefined) {
		lines.push(`- **Size**: ${formatSize(repository.size)}`);
	}

	// Language if available
	if (repository.language) {
		lines.push(`- **Language**: ${repository.language}`);
	}

	// Description if available
	if (repository.description) {
		lines.push('');
		lines.push('## Description');
		lines.push(repository.description);
	}

	// Links section
	lines.push('');
	lines.push('## Links');

	if (repository.links.html?.href) {
		lines.push(`- [View in Browser](${repository.links.html.href})`);
	}
	if (repository.links.clone) {
		lines.push('- **Clone URLs**:');
		repository.links.clone.forEach((clone) => {
			lines.push(`  - ${clone.name}: \`${clone.href}\``);
		});
	}
	if (repository.links.commits?.href) {
		lines.push(`- [Commits](${repository.links.commits.href})`);
	}
	if (repository.links.pullrequests?.href) {
		lines.push(`- [Pull Requests](${repository.links.pullrequests.href})`);
	}

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
