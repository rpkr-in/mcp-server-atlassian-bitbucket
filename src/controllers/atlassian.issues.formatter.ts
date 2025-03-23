import {
	Issue,
	IssueComment,
	IssueLink,
	IssuesResponse,
} from '../services/vendor.atlassian.issues.types.js';
import { adfToMarkdown } from '../utils/adf.util.js';

/**
 * Format a list of issues for display
 * @param issuesData - Raw issues data from the API
 * @param nextCursor - Pagination cursor for retrieving the next set of results
 * @returns Formatted string with issues information in markdown format
 */
export function formatIssuesList(
	issuesData: IssuesResponse,
	nextCursor?: string,
): string {
	if (!issuesData.issues || issuesData.issues.length === 0) {
		return 'No Jira issues found.';
	}

	const lines: string[] = ['# Jira Issues', ''];

	issuesData.issues.forEach((issue, index) => {
		// Basic information
		const summary = issue.fields.summary || 'No summary';
		lines.push(`## ${index + 1}. ${summary}`);
		lines.push(`- **ID**: ${issue.id}`);
		lines.push(`- **Key**: ${issue.key}`);

		// Project
		if (issue.fields.project) {
			lines.push(
				`- **Project**: ${issue.fields.project.name} (${issue.fields.project.key})`,
			);
		}

		// Issue type
		if (issue.fields.issuetype) {
			lines.push(`- **Type**: ${issue.fields.issuetype.name}`);
		}

		// Status
		if (issue.fields.status) {
			lines.push(`- **Status**: ${issue.fields.status.name}`);
		}

		// Assignee
		if (issue.fields.assignee) {
			lines.push(`- **Assignee**: ${issue.fields.assignee.displayName}`);
		} else {
			lines.push(`- **Assignee**: Unassigned`);
		}

		// Reporter
		if (issue.fields.reporter) {
			lines.push(`- **Reporter**: ${issue.fields.reporter.displayName}`);
		}

		// Created date
		if (issue.fields.created) {
			lines.push(`- **Created**: ${issue.fields.created}`);
		}

		// URL
		const issueUrl = issue.self.replace('/rest/api/3/issue/', '/browse/');
		lines.push(`- **URL**: [${issue.key}](${issueUrl})`);

		// Add a separator between issues
		if (index < issuesData.issues.length - 1) {
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
			`*Showing ${issuesData.issues.length} of ${issuesData.total} issues. More issues available. Use the following cursor to retrieve the next page:*`,
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
 * Format detailed issue information for display
 * @param issueData - Raw issue data from the API
 * @returns Formatted string with issue details in markdown format
 */
export function formatIssueDetails(issueData: Issue): string {
	const lines: string[] = [`# Jira Issue: ${issueData.fields.summary}`, ''];

	// Basic Information section
	lines.push('## Basic Information');
	lines.push(`- **ID**: ${issueData.id}`);
	lines.push(`- **Key**: ${issueData.key}`);

	// Project
	if (issueData.fields.project) {
		lines.push(
			`- **Project**: ${issueData.fields.project.name} (${issueData.fields.project.key})`,
		);
	}

	// Issue type
	if (issueData.fields.issuetype) {
		lines.push(`- **Type**: ${issueData.fields.issuetype.name}`);
		if (issueData.fields.issuetype.description) {
			lines.push(`  *${issueData.fields.issuetype.description}*`);
		}
	}

	// Status
	if (issueData.fields.status) {
		lines.push(`- **Status**: ${issueData.fields.status.name}`);
	}

	// Priority
	if (issueData.fields.priority) {
		lines.push(`- **Priority**: ${issueData.fields.priority.name}`);
	}

	// Description
	if (issueData.fields.description) {
		lines.push('');
		lines.push('## Description');

		// Handle different description formats
		if (typeof issueData.fields.description === 'string') {
			lines.push(issueData.fields.description);
		} else if (typeof issueData.fields.description === 'object') {
			lines.push(adfToMarkdown(issueData.fields.description));
		} else {
			lines.push('*Description format not supported*');
		}
	}

	// People
	lines.push('');
	lines.push('## People');

	// Assignee
	if (issueData.fields.assignee) {
		lines.push(`- **Assignee**: ${issueData.fields.assignee.displayName}`);
		lines.push(
			`  - **Active**: ${issueData.fields.assignee.active ? 'Yes' : 'No'}`,
		);
	} else {
		lines.push(`- **Assignee**: Unassigned`);
	}

	// Reporter
	if (issueData.fields.reporter) {
		lines.push(`- **Reporter**: ${issueData.fields.reporter.displayName}`);
		lines.push(
			`  - **Active**: ${issueData.fields.reporter.active ? 'Yes' : 'No'}`,
		);
	}

	// Creator (if different from reporter)
	if (
		issueData.fields.creator &&
		(!issueData.fields.reporter ||
			issueData.fields.creator.displayName !==
				issueData.fields.reporter?.displayName)
	) {
		lines.push(`- **Creator**: ${issueData.fields.creator.displayName}`);
		lines.push(
			`  - **Active**: ${issueData.fields.creator.active ? 'Yes' : 'No'}`,
		);
	}

	// Dates
	lines.push('');
	lines.push('## Dates');
	if (issueData.fields.created) {
		lines.push(`- **Created**: ${issueData.fields.created}`);
	}
	if (issueData.fields.updated) {
		lines.push(`- **Updated**: ${issueData.fields.updated}`);
	}

	// Time tracking
	if (
		issueData.fields.timetracking &&
		(issueData.fields.timetracking.originalEstimate ||
			issueData.fields.timetracking.remainingEstimate ||
			issueData.fields.timetracking.timeSpent)
	) {
		lines.push('');
		lines.push('## Time Tracking');
		if (issueData.fields.timetracking.originalEstimate) {
			lines.push(
				`- **Original Estimate**: ${issueData.fields.timetracking.originalEstimate}`,
			);
		}
		if (issueData.fields.timetracking.remainingEstimate) {
			lines.push(
				`- **Remaining Estimate**: ${issueData.fields.timetracking.remainingEstimate}`,
			);
		}
		if (issueData.fields.timetracking.timeSpent) {
			lines.push(
				`- **Time Spent**: ${issueData.fields.timetracking.timeSpent}`,
			);
		}
	}

	// Attachments
	if (issueData.fields.attachment && issueData.fields.attachment.length > 0) {
		lines.push('');
		lines.push('## Attachments');
		issueData.fields.attachment.forEach((attachment, index) => {
			lines.push(`### ${index + 1}. ${attachment.filename}`);
			lines.push(`- **Size**: ${formatFileSize(attachment.size)}`);
			lines.push(`- **Created**: ${attachment.created}`);
			lines.push(`- **Author**: ${attachment.author.displayName}`);
			lines.push(`- **Content Type**: ${attachment.mimeType}`);
			lines.push(`- **URL**: [Download](${attachment.content})`);
		});
	}

	// Comments
	if (issueData.fields.comment) {
		let comments: IssueComment[] = [];

		// Handle different comment structures
		if (Array.isArray(issueData.fields.comment)) {
			comments = issueData.fields.comment;
		} else {
			// Use type assertion to handle potential different structures
			const commentObj = issueData.fields.comment as {
				comments?: IssueComment[];
			};
			if (commentObj.comments && Array.isArray(commentObj.comments)) {
				comments = commentObj.comments;
			}
		}

		if (comments.length > 0) {
			lines.push('');
			lines.push('## Comments');

			comments.forEach((comment, index) => {
				lines.push(
					`### ${index + 1}. Comment by ${comment.author.displayName} (${comment.created})`,
				);

				// Handle different comment body formats
				if (typeof comment.body === 'string') {
					lines.push(comment.body);
				} else if (typeof comment.body === 'object') {
					lines.push(adfToMarkdown(comment.body));
				} else {
					lines.push('*Comment format not supported*');
				}

				if (comment.updated && comment.updated !== comment.created) {
					lines.push(`*Updated: ${comment.updated}*`);
				}
			});
		}
	}

	// Issue links
	if (issueData.fields.issuelinks && issueData.fields.issuelinks.length > 0) {
		lines.push('');
		lines.push('## Linked Issues');

		// Group by link type
		const linksByType: Record<
			string,
			{
				inward: IssueLink[];
				outward: IssueLink[];
				type: {
					id: string;
					name: string;
					inward: string;
					outward: string;
				};
			}
		> = {};

		issueData.fields.issuelinks.forEach((link) => {
			const typeName = link.type.name;
			if (!linksByType[typeName]) {
				linksByType[typeName] = {
					inward: [],
					outward: [],
					type: link.type,
				};
			}

			if (link.inwardIssue) {
				linksByType[typeName].inward.push(link);
			} else if (link.outwardIssue) {
				linksByType[typeName].outward.push(link);
			}
		});

		// Display links by type
		Object.entries(linksByType).forEach(([typeName, links]) => {
			lines.push(`### ${typeName}`);

			if (links.inward.length > 0) {
				lines.push(`#### ${links.inward[0].type.inward}`);
				links.inward.forEach((link) => {
					if (link.inwardIssue) {
						const issue = link.inwardIssue;
						const issueUrl = issue.self.replace(
							'/rest/api/3/issue/',
							'/browse/',
						);
						lines.push(
							`- [${issue.key}](${issueUrl}) (${issue.fields.status.name})`,
						);
					}
				});
			}

			if (links.outward.length > 0) {
				lines.push(`#### ${links.outward[0].type.outward}`);
				links.outward.forEach((link) => {
					if (link.outwardIssue) {
						const issue = link.outwardIssue;
						const issueUrl = issue.self.replace(
							'/rest/api/3/issue/',
							'/browse/',
						);
						lines.push(
							`- [${issue.key}](${issueUrl}) (${issue.fields.status.name})`,
						);
					}
				});
			}
		});
	}

	// Worklog
	if (issueData.fields.worklog && issueData.fields.worklog.length > 0) {
		lines.push('');
		lines.push('## Work Log');
		issueData.fields.worklog.forEach((worklog, index) => {
			lines.push(
				`### ${index + 1}. Work logged by ${worklog.author.displayName}`,
			);
			lines.push(
				`- **Time Spent**: ${worklog.timeSpent} (${worklog.timeSpentSeconds} seconds)`,
			);
			lines.push(`- **Started**: ${worklog.started}`);

			// Handle different comment formats
			if (worklog.comment) {
				lines.push(`- **Comment**:`);
				if (typeof worklog.comment === 'string') {
					lines.push(`  ${worklog.comment}`);
				} else if (
					typeof worklog.comment === 'object' &&
					'value' in worklog.comment
				) {
					lines.push(`  ${worklog.comment.value}`);
				}
			}
		});
	}

	// URL
	const issueUrl = issueData.self.replace('/rest/api/3/issue/', '/browse/');
	lines.push('');
	lines.push('## Links');
	lines.push(`- [Open in Jira](${issueUrl})`);

	// Add project links if project info is available
	if (issueData.fields.project) {
		const projectUrl = issueData.fields.project.self.replace(
			'/rest/api/3/project/',
			'/browse/',
		);
		lines.push(`- [View Project](${projectUrl})`);
	}

	return lines.join('\n');
}

/**
 * Format file size in human-readable format
 * @param bytes - File size in bytes
 * @returns Formatted file size string
 */
function formatFileSize(bytes: number): string {
	if (bytes < 1024) {
		return `${bytes} B`;
	} else if (bytes < 1024 * 1024) {
		return `${(bytes / 1024).toFixed(1)} KB`;
	} else if (bytes < 1024 * 1024 * 1024) {
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	} else {
		return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
	}
}
