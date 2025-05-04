import {
	CodeSearchResult,
	CommitsResponse,
	CommitResult,
} from '../services/vendor.atlassian.search.service.js';
import {
	formatDate,
	formatHeading,
	formatUrl,
	formatSeparator,
} from '../utils/formatter.util.js';
import path from 'path';
import { ResponsePagination } from '../types/common.types.js';

/**
 * Try to guess the language from the file path
 */
function getLanguageHint(filePath: string): string {
	const ext = path.extname(filePath).toLowerCase();
	const langMap: Record<string, string> = {
		'.js': 'javascript',
		'.jsx': 'jsx',
		'.ts': 'typescript',
		'.tsx': 'tsx',
		'.py': 'python',
		'.java': 'java',
		'.rb': 'ruby',
		'.php': 'php',
		'.cs': 'csharp',
		'.go': 'go',
		'.rs': 'rust',
		'.c': 'c',
		'.cpp': 'cpp',
		'.h': 'c',
		'.hpp': 'cpp',
		'.tf': 'terraform',
		'.hcl': 'hcl',
		'.sh': 'bash',
		'.zsh': 'zsh',
		'.json': 'json',
		'.yaml': 'yaml',
		'.yml': 'yaml',
		'.xml': 'xml',
		'.md': 'markdown',
		'.sql': 'sql',
		'.dockerfile': 'dockerfile',
		dockerfile: 'dockerfile',
		'.gitignore': 'gitignore',
	};
	return langMap[ext] || '';
}

/**
 * Format a single code search result into markdown
 *
 * @param result The code search result to format
 * @returns Formatted markdown string
 */
function formatCodeSearchResult(result: CodeSearchResult): string {
	// Format the file path - No highlighting needed here
	const filePath = result.file.path || 'Unknown File'; // <-- Use direct path

	// Fix the link text
	const fileLink = result.file.links?.self?.href
		? formatUrl(result.file.links.self.href, filePath) // Use filePath for link text
		: filePath;

	// Build markdown output
	let markdown = `### ${fileLink}\n\n`; // Use fixed fileLink

	// Add match summary
	markdown += `${result.content_match_count} ${
		result.content_match_count === 1 ? 'match' : 'matches'
	} found\n\n`;

	// Get language hint for code block
	const langHint = getLanguageHint(filePath);
	markdown += '```' + langHint + '\n'; // Add language hint

	// Process each content match
	result.content_matches.forEach((contentMatch) => {
		// Process each line in the content match
		contentMatch.lines.forEach((line) => {
			// Add line number
			markdown += `${line.line}: `;

			// Process segments (some may be highlighted matches)
			if (line.segments.length) {
				line.segments.forEach((segment) => {
					// Use standard bold markdown for highlighting
					markdown += segment.match
						? `**${segment.text}**` // <-- Changed highlighting
						: segment.text;
				});
			}

			markdown += '\n';
		});

		// Add space between match groups only if there are multiple lines shown
		if (contentMatch.lines.length > 1) {
			markdown += '\n';
		}
	});

	markdown += '```\n\n';

	return markdown;
}

/**
 * Format code search results into markdown
 *
 * @param response The code search response from the API
 * @param pagination Optional pagination info for footer hints
 * @returns Markdown formatted string of code search results
 */
export function formatCodeSearchResults(
	searchResponse: {
		values?: CodeSearchResult[];
		size: number;
	},
	pagination?: ResponsePagination,
): string {
	const results = searchResponse.values || [];

	if (!results || results.length === 0) {
		return '**No code matches found.**\n\n';
	}

	// Start with a summary
	let markdown = `## Code Search Results\n\nFound ${searchResponse.size} matches for the code search query.\n\n`;

	// Format each result
	results.forEach((result: CodeSearchResult) => {
		markdown += formatCodeSearchResult(result);
	});

	// --- Footer ---
	const footerLines: string[] = [];
	footerLines.push('---');

	const displayedCount = pagination?.count ?? results.length;
	// Bitbucket code search uses page-based pagination
	if (pagination?.hasMore) {
		footerLines.push(
			`*Showing ${displayedCount} results. More results are available.*`,
		);
		const nextPage = (pagination?.page ?? 1) + 1;
		footerLines.push(`*Use --page ${nextPage} to view more.*`);
	} else {
		footerLines.push(`*Showing ${displayedCount} results.*`);
	}

	footerLines.push(
		`*Information retrieved at: ${new Date().toLocaleString()}*`,
	);

	markdown += '\n' + footerLines.join('\n');

	return markdown;
}

/**
 * Format a single commit result into markdown
 *
 * @param commit The commit result to format
 * @returns Formatted markdown string
 */
function formatCommitResult(commit: CommitResult): string {
	let markdown = '';

	// Format commit hash and message as heading
	const shortHash = commit.hash.substring(0, 7);
	markdown += `### [${shortHash}: ${commit.message.split('\n')[0]}](${commit.links.html.href})\n\n`;

	// Add commit details
	markdown += `**Author**: ${commit.author.user?.display_name || commit.author.raw}\n`;
	markdown += `**Date**: ${formatDate(commit.date)}\n`;

	// Add repository info if available
	if (commit.repository) {
		markdown += `**Repository**: [${commit.repository.name}](${commit.repository.links.html.href})\n`;
	}

	// Add full hash
	markdown += `**Full Hash**: \`${commit.hash}\`\n\n`;

	// Add commit message if it has more than one line
	const messageLines = commit.message.split('\n');
	if (messageLines.length > 1) {
		markdown += '**Full Message**:\n```\n';
		markdown += commit.message;
		markdown += '\n```\n\n';
	}

	return markdown;
}

/**
 * Format commits search results into markdown
 *
 * @param response The commits response from the API
 * @param repoSlug The repository slug (if applicable)
 * @param workspaceSlug The workspace slug (if applicable)
 * @param pagination Optional pagination info for footer hints
 * @returns Markdown formatted string of commits search results
 */
export function formatCommitsResults(
	response: CommitsResponse,
	repoSlug?: string,
	workspaceSlug?: string,
	pagination?: ResponsePagination,
): string {
	if (!response.values || response.values.length === 0) {
		return '**No commits found matching your query.**\n\n';
	}

	const commitCount = response.size || response.values.length;
	let header = 'Commit Search Results';
	if (workspaceSlug && repoSlug) {
		header = `Commit Search Results in ${workspaceSlug}/${repoSlug}`;
	} else if (workspaceSlug) {
		header = `Commit Search Results in Workspace ${workspaceSlug}`;
	}

	let markdown = formatHeading(header, 1) + '\n\n';
	markdown += `Found ${commitCount} ${commitCount === 1 ? 'commit' : 'commits'} matching your query.\n\n`;

	response.values.forEach((commit, index) => {
		markdown += formatCommitResult(commit);
		// Add a single separator unless it's the last item
		if (index < response.values.length - 1) {
			markdown += '\n' + formatSeparator() + '\n\n'; // Ensure single separator and spacing
		}
	});

	// Add footer with pagination info if provided
	if (pagination) {
		markdown += '\n---\n';

		const displayedCount = pagination.count ?? response.values.length;
		if (pagination.hasMore) {
			markdown += `*Showing ${displayedCount} results. More results are available.*\n`;
			if (pagination.page !== undefined) {
				const nextPage = pagination.page + 1;
				markdown += `*Use --page ${nextPage} to view more.*\n`;
			} else if (pagination.nextCursor) {
				markdown += `*Use --cursor ${pagination.nextCursor} to view more.*\n`;
			}
		} else {
			markdown += `*Showing ${displayedCount} results.*\n`;
		}

		markdown += `*Information retrieved at: ${new Date().toLocaleString()}*\n`;
	}

	return markdown;
}
