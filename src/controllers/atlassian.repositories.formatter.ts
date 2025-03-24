import {
	RepositoryDetailed,
	RepositoriesResponse,
	RepositoryForkPolicy,
} from '../services/vendor.atlassian.repositories.types.js';

/**
 * Format a list of repositories for display
 * @param repositoriesData - Raw repositories data from the API
 * @param workspaceSlug - The workspace slug
 * @param nextPage - Pagination page for retrieving the next set of results
 * @returns Formatted string with repositories information in markdown format
 */
export function formatRepositoriesList(
	repositoriesData: RepositoriesResponse,
	workspaceSlug: string,
	nextPage?: number,
): string {
	if (!repositoriesData.values || repositoriesData.values.length === 0) {
		return `No Bitbucket repositories found for workspace "${workspaceSlug}".`;
	}

	const lines: string[] = [
		`# Bitbucket Repositories in "${workspaceSlug}"`,
		'',
	];

	repositoriesData.values.forEach((repo, index) => {
		// Basic information
		lines.push(`## ${index + 1}. ${repo.name}`);
		lines.push(`- **UUID**: ${repo.uuid}`);
		lines.push(`- **Full Name**: ${repo.full_name}`);
		lines.push(`- **Private**: ${repo.is_private ? 'Yes' : 'No'}`);
		lines.push(`- **SCM**: ${repo.scm.toUpperCase()}`);

		// Optional information
		if (repo.description) {
			lines.push(`- **Description**: ${repo.description}`);
		}
		if (repo.language) {
			lines.push(`- **Language**: ${repo.language}`);
		}
		if (repo.fork_policy) {
			lines.push(
				`- **Fork Policy**: ${formatForkPolicy(repo.fork_policy)}`,
			);
		}
		if (repo.has_issues !== undefined) {
			lines.push(`- **Has Issues**: ${repo.has_issues ? 'Yes' : 'No'}`);
		}
		if (repo.has_wiki !== undefined) {
			lines.push(`- **Has Wiki**: ${repo.has_wiki ? 'Yes' : 'No'}`);
		}
		if (repo.size !== undefined) {
			lines.push(`- **Size**: ${formatSize(repo.size)}`);
		}

		// Dates
		if (repo.created_on) {
			lines.push(
				`- **Created**: ${new Date(repo.created_on).toLocaleString()}`,
			);
		}
		if (repo.updated_on) {
			lines.push(
				`- **Updated**: ${new Date(repo.updated_on).toLocaleString()}`,
			);
		}

		// Owner information
		if (repo.owner) {
			const ownerType = repo.owner.type === 'team' ? 'Team' : 'User';
			const ownerName =
				repo.owner.display_name || repo.owner.username || 'Unknown';
			lines.push(`- **Owner**: ${ownerName} (${ownerType})`);
		}

		// Main branch
		if (repo.mainbranch) {
			lines.push(`- **Main Branch**: ${repo.mainbranch.name}`);
		}

		// Project
		if (repo.project) {
			lines.push(
				`- **Project**: ${repo.project.name} (${repo.project.key})`,
			);
		}

		// URLs
		if (repo.links.html?.href) {
			lines.push(
				`- **Web URL**: [${repo.name}](${repo.links.html.href})`,
			);
		}

		// Clone URLs
		if (repo.links.clone && repo.links.clone.length > 0) {
			lines.push(`- **Clone URLs**:`);
			repo.links.clone.forEach((clone) => {
				const protocol = clone.name || 'unknown';
				lines.push(`  - ${protocol}: \`${clone.href}\``);
			});
		}

		// Add a separator between repositories
		if (index < repositoriesData.values.length - 1) {
			lines.push('');
			lines.push('---');
			lines.push('');
		}
	});

	// Add pagination information if available
	if (nextPage) {
		lines.push('');
		lines.push('---');
		lines.push('');
		lines.push('## Pagination');
		lines.push(
			`*Showing ${repositoriesData.values.length} of ${repositoriesData.size} repositories. More repositories available. Use the following page number to retrieve the next page:*`,
		);
		lines.push('');
		lines.push(`\`${nextPage}\``);
		lines.push('');
		lines.push(
			`*For CLI: Use \`--page "${nextPage}"\` to get the next page*`,
		);
		lines.push('');
		lines.push(
			'*For MCP tools: Set the `page` parameter to retrieve the next page*',
		);
	}

	// Add timestamp for when this information was retrieved
	lines.push('');
	lines.push(
		`*Repository information retrieved at ${new Date().toLocaleString()}*`,
	);

	return lines.join('\n');
}

/**
 * Format detailed repository information for display
 * @param repositoryData - Raw repository data from the API
 * @returns Formatted string with repository information in markdown format
 */
export function formatRepositoryDetails(
	repositoryData: RepositoryDetailed,
): string {
	const lines: string[] = [`# Repository: ${repositoryData.name}`, ''];

	// Add a description blurb
	const privacyText = repositoryData.is_private ? 'private' : 'public';
	const scmText = repositoryData.scm.toUpperCase();
	if (repositoryData.description) {
		lines.push(`> ${repositoryData.description}`, '');
	}
	lines.push(
		`> A ${privacyText} ${scmText} repository in the \`${repositoryData.full_name.split('/')[0]}\` workspace.`,
		'',
	);

	// Basic Information section
	lines.push('## Basic Information');
	lines.push(`- **UUID**: ${repositoryData.uuid}`);
	lines.push(`- **Full Name**: ${repositoryData.full_name}`);
	lines.push(`- **Name**: ${repositoryData.name}`);
	lines.push(`- **Private**: ${repositoryData.is_private ? 'Yes' : 'No'}`);
	lines.push(`- **SCM**: ${repositoryData.scm.toUpperCase()}`);

	// Dates and size
	if (repositoryData.created_on) {
		lines.push(
			`- **Created**: ${new Date(repositoryData.created_on).toLocaleString()}`,
		);
	}
	if (repositoryData.updated_on) {
		lines.push(
			`- **Updated**: ${new Date(repositoryData.updated_on).toLocaleString()}`,
		);
	}
	if (repositoryData.size !== undefined) {
		lines.push(`- **Size**: ${formatSize(repositoryData.size)}`);
	}

	// Features section
	lines.push('');
	lines.push('## Features');
	if (repositoryData.language) {
		lines.push(`- **Language**: ${repositoryData.language}`);
	}
	if (repositoryData.fork_policy) {
		lines.push(
			`- **Fork Policy**: ${formatForkPolicy(repositoryData.fork_policy)}`,
		);
	}
	lines.push(
		`- **Issues Enabled**: ${repositoryData.has_issues ? 'Yes' : 'No'}`,
	);
	lines.push(`- **Wiki Enabled**: ${repositoryData.has_wiki ? 'Yes' : 'No'}`);

	// Branch and Project information
	if (repositoryData.mainbranch) {
		lines.push('');
		lines.push('## Branch Information');
		lines.push(`- **Main Branch**: ${repositoryData.mainbranch.name}`);
	}

	if (repositoryData.project) {
		lines.push('');
		lines.push('## Project Information');
		lines.push(`- **Project Name**: ${repositoryData.project.name}`);
		lines.push(`- **Project Key**: ${repositoryData.project.key}`);
		lines.push(`- **Project UUID**: ${repositoryData.project.uuid}`);
		if (repositoryData.project.links?.html?.href) {
			lines.push(
				`- **Project URL**: [${repositoryData.project.name}](${repositoryData.project.links.html.href})`,
			);
		}
	}

	// Links section
	lines.push('');
	lines.push('## Links');
	if (repositoryData.links.html?.href) {
		lines.push(
			`- **Web UI**: [Open in Bitbucket](${repositoryData.links.html.href})`,
		);
	}
	if (repositoryData.links.pullrequests?.href) {
		lines.push(
			`- **Pull Requests**: [View Pull Requests](${repositoryData.links.pullrequests.href})`,
		);
	}
	if (repositoryData.links.commits?.href) {
		lines.push(
			`- **Commits**: [View Commits](${repositoryData.links.commits.href})`,
		);
	}
	if (repositoryData.links.issues?.href) {
		lines.push(
			`- **Issues**: [View Issues](${repositoryData.links.issues.href})`,
		);
	}

	// Clone URLs section
	if (repositoryData.links.clone && repositoryData.links.clone.length > 0) {
		lines.push('');
		lines.push('## Clone URLs');
		repositoryData.links.clone.forEach((clone) => {
			const protocol = clone.name || 'unknown';
			lines.push(`- **${protocol}**: \`${clone.href}\``);
		});
	}

	// Add timestamp for when this information was retrieved
	lines.push('');
	lines.push(
		`*Repository information retrieved at ${new Date().toLocaleString()}*`,
	);
	if (repositoryData.links.html?.href) {
		lines.push(
			`*To view this repository in Bitbucket, visit: ${repositoryData.links.html.href}*`,
		);
	}

	return lines.join('\n');
}

/**
 * Format fork policy into a human-readable string
 * @param forkPolicy - The fork policy identifier
 * @returns A human-readable fork policy description
 */
function formatForkPolicy(forkPolicy: RepositoryForkPolicy): string {
	const policyMap: Record<RepositoryForkPolicy, string> = {
		allow_forks: 'All forks allowed',
		no_public_forks: 'No public forks allowed',
		no_forks: 'No forks allowed',
	};
	return policyMap[forkPolicy] || forkPolicy;
}

/**
 * Format repository size into a human-readable value
 * @param sizeInBytes - The size in bytes
 * @returns A human-readable size format
 */
function formatSize(sizeInBytes: number): string {
	if (sizeInBytes < 1024) {
		return `${sizeInBytes} bytes`;
	} else if (sizeInBytes < 1024 * 1024) {
		return `${(sizeInBytes / 1024).toFixed(2)} KB`;
	} else if (sizeInBytes < 1024 * 1024 * 1024) {
		return `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`;
	} else {
		return `${(sizeInBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
	}
}
