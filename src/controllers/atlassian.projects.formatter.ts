import {
	ProjectDetailed,
	ProjectsResponse,
} from '../services/vendor.atlassian.projects.types.js';

/**
 * Format a list of projects for display
 * @param projectsData - Raw projects data from the API
 * @param nextCursor - Pagination cursor for retrieving the next set of results
 * @returns Formatted string with projects information in markdown format
 */
export function formatProjectsList(
	projectsData: ProjectsResponse,
	nextCursor?: string,
): string {
	if (!projectsData.values || projectsData.values.length === 0) {
		return 'No Jira projects found.';
	}

	const lines: string[] = ['# Jira Projects', ''];

	projectsData.values.forEach((project, index) => {
		// Basic information
		lines.push(`## ${index + 1}. ${project.name}`);
		lines.push(`- **ID**: ${project.id}`);
		lines.push(`- **Key**: ${project.key}`);
		lines.push(`- **Style**: ${project.style || 'Not specified'}`);
		lines.push(`- **Simplified**: ${project.simplified ? 'Yes' : 'No'}`);

		// URL
		const projectUrl = project.self.replace(
			'/rest/api/3/project/',
			'/browse/',
		);
		lines.push(`- **URL**: [${project.key}](${projectUrl})`);

		// Avatar
		if (project.avatarUrls && project.avatarUrls['48x48']) {
			lines.push(
				`- **Avatar**: ![${project.name} Avatar](${project.avatarUrls['48x48']})`,
			);
		}

		// Add a separator between projects
		if (index < projectsData.values.length - 1) {
			lines.push('');
			lines.push('---');
			lines.push('');
		}
	});

	// Add pagination information if available
	if (nextCursor) {
		lines.push('');
		lines.push('---');
		lines.push('');
		lines.push('## Pagination');
		lines.push(
			`*Showing ${projectsData.values.length} of ${projectsData.total} projects. More projects available. Use the following cursor to retrieve the next page:*`,
		);
		lines.push('');
		lines.push(`\`${nextCursor}\``);
		lines.push('');
		lines.push(
			`*For CLI: Use \`--cursor "${nextCursor}"\` to get the next page*`,
		);
		lines.push(
			'*For MCP tools: Set the `cursor` parameter to retrieve the next page*',
		);
	}

	return lines.join('\n');
}

/**
 * Format detailed project information for display
 * @param projectData - Raw project data from the API
 * @returns Formatted string with project details in markdown format
 */
export function formatProjectDetails(projectData: ProjectDetailed): string {
	const lines: string[] = [`# Project: ${projectData.name}`, ''];

	// Basic information
	lines.push('## Basic Information');
	lines.push(`- **ID**: ${projectData.id}`);
	lines.push(`- **Key**: ${projectData.key}`);
	lines.push(`- **Style**: ${projectData.style || 'Not specified'}`);
	lines.push(`- **Simplified**: ${projectData.simplified ? 'Yes' : 'No'}`);

	// Description
	if (projectData.description) {
		lines.push('');
		lines.push('## Description');
		lines.push(projectData.description);
	}

	// Lead information
	if (projectData.lead) {
		lines.push('');
		lines.push('## Project Lead');
		lines.push(`- **Name**: ${projectData.lead.displayName}`);
		lines.push(`- **Active**: ${projectData.lead.active ? 'Yes' : 'No'}`);
	}

	// Components
	if (projectData.components && projectData.components.length > 0) {
		lines.push('');
		lines.push('## Components');
		projectData.components.forEach((component, index) => {
			lines.push(`### ${index + 1}. ${component.name}`);
			if (component.description) {
				lines.push(component.description);
			}
			if (component.lead) {
				lines.push(`- **Lead**: ${component.lead.displayName}`);
			}
		});
	} else {
		lines.push('');
		lines.push('## Components');
		lines.push('No components defined for this project.');
	}

	// Versions
	if (projectData.versions && projectData.versions.length > 0) {
		lines.push('');
		lines.push('## Versions');
		projectData.versions.forEach((version, index) => {
			lines.push(`### ${index + 1}. ${version.name}`);
			if (version.description) {
				lines.push(version.description);
			}
			lines.push(`- **Released**: ${version.released ? 'Yes' : 'No'}`);
			lines.push(`- **Archived**: ${version.archived ? 'Yes' : 'No'}`);
			if (version.releaseDate) {
				lines.push(`- **Release Date**: ${version.releaseDate}`);
			}
			if (version.startDate) {
				lines.push(`- **Start Date**: ${version.startDate}`);
			}
		});
	} else {
		lines.push('');
		lines.push('## Versions');
		lines.push('No versions defined for this project.');
	}

	// URL
	const projectUrl = projectData.self.replace(
		'/rest/api/3/project/',
		'/browse/',
	);
	lines.push('');
	lines.push('## Links');
	lines.push(`- [Open in Jira](${projectUrl})`);
	lines.push(`- [View Issues](${projectUrl}/issues)`);
	lines.push(`- [View Board](${projectUrl}/board)`);

	return lines.join('\n');
}
