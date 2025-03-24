import {
	WorkspaceDetailed,
	WorkspacePermissionsResponse,
	WorkspaceMembership,
} from '../services/vendor.atlassian.workspaces.types.js';

/**
 * Format a list of workspaces for display
 * @param workspacesData - Raw workspaces data from the API
 * @param nextCursor - Pagination cursor for retrieving the next set of results
 * @returns Formatted string with workspaces information in markdown format
 */
export function formatWorkspacesList(
	workspacesData: WorkspacePermissionsResponse,
	nextCursor?: string,
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
			lines.push(`- **User**: ${membership.user.display_name}`);
		}

		// Add a separator between workspaces
		if (index < workspacesData.values.length - 1) {
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
			`*Showing ${workspacesData.values.length} workspaces. More workspaces are available. Use pagination to retrieve more results.*`,
		);
	}

	return lines.join('\n');
}

/**
 * Format detailed workspace information for display
 * @param workspace - Raw workspace data from the API
 * @param membership - Optional membership information for the workspace
 * @returns Formatted string with workspace details in markdown format
 */
export function formatWorkspaceDetails(
	workspace: WorkspaceDetailed,
	membership?: WorkspaceMembership,
): string {
	const lines: string[] = [
		`# Workspace: ${workspace.name}`,
		'',
		'## Basic Information',
		`- **UUID**: ${workspace.uuid}`,
		`- **Slug**: ${workspace.slug}`,
		`- **Type**: ${workspace.type || 'Not specified'}`,
		`- **Created On**: ${
			workspace.created_on
				? new Date(workspace.created_on).toLocaleString()
				: 'Not available'
		}`,
	];

	// Add membership information if available
	if (membership) {
		lines.push('');
		lines.push('## Your Membership');
		lines.push(`- **Permission**: ${membership.permission}`);

		if (membership.last_accessed) {
			lines.push(
				`- **Last Accessed**: ${new Date(
					membership.last_accessed,
				).toLocaleString()}`,
			);
		}
		if (membership.added_on) {
			lines.push(
				`- **Added On**: ${new Date(
					membership.added_on,
				).toLocaleString()}`,
			);
		}
	}

	// Add links
	lines.push('');
	lines.push('## Links');

	if (workspace.links.html?.href) {
		lines.push(`- [View in Browser](${workspace.links.html.href})`);
	}
	if (workspace.links.repositories?.href) {
		lines.push(`- [Repositories](${workspace.links.repositories.href})`);
	}
	if (workspace.links.projects?.href) {
		lines.push(`- [Projects](${workspace.links.projects.href})`);
	}
	if (workspace.links.snippets?.href) {
		lines.push(`- [Snippets](${workspace.links.snippets.href})`);
	}

	return lines.join('\n');
}
