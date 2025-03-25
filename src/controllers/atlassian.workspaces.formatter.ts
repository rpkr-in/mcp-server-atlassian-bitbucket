import {
	WorkspaceDetailed,
	WorkspacePermissionsResponse,
	WorkspaceMembership,
} from '../services/vendor.atlassian.workspaces.types.js';
import {
	formatUrl,
	formatPagination,
	formatHeading,
	formatBulletList,
	formatSeparator,
	formatNumberedList,
} from '../utils/formatter.util.js';

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

	const lines: string[] = [formatHeading('Bitbucket Workspaces', 1), ''];

	// Use the numbered list formatter for consistent formatting
	const formattedList = formatNumberedList(
		workspacesData.values,
		(membership) => {
			const workspace = membership.workspace;
			const itemLines: string[] = [];

			// Basic information
			itemLines.push(formatHeading(workspace.name, 2));

			// Create an object with all the properties to display
			const properties: Record<string, unknown> = {
				UUID: workspace.uuid,
				Slug: workspace.slug,
				Permission: membership.permission,
				'Last Accessed': membership.last_accessed,
				'Added On': membership.added_on,
				'Web URL': workspace.links.html?.href
					? {
							url: workspace.links.html.href,
							title: workspace.slug,
						}
					: undefined,
				User: membership.user?.display_name,
			};

			// Format as a bullet list with proper formatting for each value type
			itemLines.push(formatBulletList(properties, (key) => key));

			return itemLines.join('\n');
		},
	);

	lines.push(formattedList);

	// Add pagination information
	if (nextCursor) {
		lines.push('');
		lines.push(formatSeparator());
		lines.push('');
		lines.push(
			formatPagination(workspacesData.values.length, true, nextCursor),
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
		formatHeading(`Workspace: ${workspace.name}`, 1),
		'',
		formatHeading('Basic Information', 2),
	];

	// Format basic information as a bullet list
	const basicProperties: Record<string, unknown> = {
		UUID: workspace.uuid,
		Slug: workspace.slug,
		Type: workspace.type || 'Not specified',
		'Created On': workspace.created_on,
	};

	lines.push(formatBulletList(basicProperties, (key) => key));

	// Add membership information if available
	if (membership) {
		lines.push('');
		lines.push(formatHeading('Your Membership', 2));

		const membershipProperties: Record<string, unknown> = {
			Permission: membership.permission,
			'Last Accessed': membership.last_accessed,
			'Added On': membership.added_on,
		};

		lines.push(formatBulletList(membershipProperties, (key) => key));
	}

	// Add links
	lines.push('');
	lines.push(formatHeading('Links', 2));

	const links: string[] = [];

	if (workspace.links.html?.href) {
		links.push(
			`- ${formatUrl(workspace.links.html.href, 'View in Browser')}`,
		);
	}
	if (workspace.links.repositories?.href) {
		links.push(
			`- ${formatUrl(workspace.links.repositories.href, 'Repositories')}`,
		);
	}
	if (workspace.links.projects?.href) {
		links.push(`- ${formatUrl(workspace.links.projects.href, 'Projects')}`);
	}
	if (workspace.links.snippets?.href) {
		links.push(`- ${formatUrl(workspace.links.snippets.href, 'Snippets')}`);
	}

	lines.push(links.join('\n'));

	return lines.join('\n');
}
