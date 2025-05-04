import {
	WorkspaceDetailed,
	WorkspacePermissionsResponse,
	WorkspaceMembership,
} from '../services/vendor.atlassian.workspaces.types.js';
import {
	formatUrl,
	formatHeading,
	formatBulletList,
	formatSeparator,
	formatNumberedList,
	formatDate,
} from '../utils/formatter.util.js';

/**
 * Format a list of workspaces for display
 * @param workspacesData - Raw workspaces data from the API
 * @returns Formatted string with workspaces information in markdown format
 */
export function formatWorkspacesList(
	workspacesData: WorkspacePermissionsResponse,
): string {
	const workspaces = workspacesData.values || [];

	if (workspaces.length === 0) {
		return 'No workspaces found matching your criteria.';
	}

	const lines: string[] = [formatHeading('Bitbucket Workspaces', 1), ''];

	// Format each workspace with its details
	const formattedList = formatNumberedList(
		workspaces,
		(membership, index) => {
			const workspace = membership.workspace;
			const itemLines: string[] = [];
			itemLines.push(formatHeading(workspace.name, 2));

			// Basic information
			const properties: Record<string, unknown> = {
				UUID: workspace.uuid,
				Slug: workspace.slug,
				'Permission Level': membership.permission || 'Unknown',
				'Last Accessed': membership.last_accessed
					? formatDate(new Date(membership.last_accessed))
					: 'N/A',
				'Added On': membership.added_on
					? formatDate(new Date(membership.added_on))
					: 'N/A',
				'Web URL': workspace.links?.html?.href
					? formatUrl(workspace.links.html.href, workspace.slug)
					: formatUrl(
							`https://bitbucket.org/${workspace.slug}/`,
							workspace.slug,
						),
				User:
					membership.user?.display_name ||
					membership.user?.nickname ||
					'Unknown',
			};

			// Format as a bullet list
			itemLines.push(formatBulletList(properties, (key) => key));

			// Add separator between workspaces except for the last one
			if (index < workspaces.length - 1) {
				itemLines.push('');
				itemLines.push(formatSeparator());
			}

			return itemLines.join('\n');
		},
	);

	lines.push(formattedList);

	// Add standard footer with timestamp
	lines.push('\n\n' + formatSeparator());
	lines.push(`*Information retrieved at: ${formatDate(new Date())}*`);

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
		'Created On': workspace.created_on
			? formatDate(workspace.created_on)
			: 'N/A',
	};

	lines.push(formatBulletList(basicProperties, (key) => key));

	// Add membership information if available
	if (membership) {
		lines.push('');
		lines.push(formatHeading('Your Membership', 2));

		const membershipProperties: Record<string, unknown> = {
			Permission: membership.permission,
			'Last Accessed': membership.last_accessed
				? formatDate(membership.last_accessed)
				: 'N/A',
			'Added On': membership.added_on
				? formatDate(membership.added_on)
				: 'N/A',
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

	// Add standard footer with timestamp
	lines.push('\n\n' + formatSeparator());
	lines.push(`*Information retrieved at: ${formatDate(new Date())}*`);

	return lines.join('\n');
}
