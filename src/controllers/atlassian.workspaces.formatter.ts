import {
	WorkspaceDetailed,
	WorkspacePermissionsResponse,
} from '../services/vendor.atlassian.workspaces.types.js';

/**
 * Format a list of workspaces for display
 * @param workspacesData - Raw workspaces data from the API
 * @param nextPage - Pagination page for retrieving the next set of results
 * @returns Formatted string with workspaces information in markdown format
 */
export function formatWorkspacesList(
	workspacesData: WorkspacePermissionsResponse,
	nextPage?: number,
): string {
	if (!workspacesData.values || workspacesData.values.length === 0) {
		return 'No Bitbucket workspaces found.';
	}

	const lines: string[] = ['# Bitbucket Workspaces', ''];

	workspacesData.values.forEach((membership, index) => {
		const workspace = membership.workspace;
		// Basic information
		lines.push(`## ${index + 1}. ${workspace.name}`);
		lines.push(`- **UUID**: ${workspace.uuid}`);
		lines.push(`- **Slug**: ${workspace.slug}`);
		lines.push(`- **Permission**: ${membership.permission}`);

		// Additional info about user
		if (membership.last_accessed) {
			lines.push(
				`- **Last Accessed**: ${new Date(membership.last_accessed).toLocaleString()}`,
			);
		}
		if (membership.added_on) {
			lines.push(
				`- **Added On**: ${new Date(membership.added_on).toLocaleString()}`,
			);
		}

		// Links
		if (workspace.links.html?.href) {
			lines.push(
				`- **Web URL**: [${workspace.slug}](${workspace.links.html.href})`,
			);
		}

		// User info
		if (membership.user) {
			lines.push(
				`- **User**: ${membership.user.display_name} (${membership.user.nickname})`,
			);
		}

		// Add a separator between workspaces
		if (index < workspacesData.values.length - 1) {
			lines.push('');
			lines.push('---');
			lines.push('');
		}
	});

	// Add pagination information if available
	if (
		nextPage &&
		workspacesData.page <
			Math.ceil(workspacesData.size / workspacesData.pagelen)
	) {
		lines.push('');
		lines.push('---');
		lines.push('');
		lines.push('## Pagination');
		lines.push(
			`*Showing ${workspacesData.values.length} of ${workspacesData.size} workspaces. More workspaces available. Use the following page number to retrieve the next page:*`,
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
		`*Workspace information retrieved at ${new Date().toLocaleString()}*`,
	);

	return lines.join('\n');
}

/**
 * Format detailed workspace information for display
 * @param workspaceData - Raw workspace data from the API
 * @returns Formatted string with workspace details in markdown format
 */
export function formatWorkspaceDetails(
	workspaceData: WorkspaceDetailed,
): string {
	const lines: string[] = [`# Workspace: ${workspaceData.name}`, ''];

	// Add a brief summary line
	const privacyStatus = workspaceData.is_private ? 'private' : 'public';
	const summary = `> A ${privacyStatus} Bitbucket workspace with slug \`${workspaceData.slug}\`.`;
	lines.push(summary);
	lines.push('');

	// Basic information
	lines.push('## Basic Information');
	lines.push(`- **UUID**: ${workspaceData.uuid}`);
	lines.push(`- **Slug**: ${workspaceData.slug}`);
	lines.push(
		`- **Privacy**: ${workspaceData.is_private ? 'Private' : 'Public'}`,
	);

	if (workspaceData.forking_mode) {
		lines.push(
			`- **Forking Mode**: ${formatForkingMode(workspaceData.forking_mode)}`,
		);
	}

	if (workspaceData.created_on) {
		lines.push(
			`- **Created On**: ${new Date(workspaceData.created_on).toLocaleString()}`,
		);
	}

	if (workspaceData.updated_on) {
		lines.push(
			`- **Updated On**: ${new Date(workspaceData.updated_on).toLocaleString()}`,
		);
	}

	// Links section
	lines.push('');
	lines.push('## Links');

	if (workspaceData.links.html?.href) {
		lines.push(
			`- **Web UI**: [Open in Bitbucket](${workspaceData.links.html.href})`,
		);
	}

	if (workspaceData.links.repositories?.href) {
		lines.push(
			`- **Repositories**: [View Repositories](${workspaceData.links.repositories.href})`,
		);
	}

	if (workspaceData.links.projects?.href) {
		lines.push(
			`- **Projects**: [View Projects](${workspaceData.links.projects.href})`,
		);
	}

	if (workspaceData.links.members?.href) {
		lines.push(
			`- **Members**: [View Members](${workspaceData.links.members.href})`,
		);
	}

	// Add timestamp for when this information was retrieved
	lines.push('');
	lines.push(
		`*Workspace information retrieved at ${new Date().toLocaleString()}*`,
	);

	if (workspaceData.links.html?.href) {
		lines.push(
			`*To view this workspace in Bitbucket, visit: ${workspaceData.links.html.href}*`,
		);
	}

	return lines.join('\n');
}

/**
 * Format forking mode to a more readable format
 * @param forkingMode - The forking mode from the API
 * @returns Human-readable forking mode description
 */
function formatForkingMode(forkingMode: string): string {
	switch (forkingMode) {
		case 'allow_forks':
			return 'All forks allowed';
		case 'no_public_forks':
			return 'No public forks';
		case 'no_forks':
			return 'No forks allowed';
		default:
			return forkingMode;
	}
}
