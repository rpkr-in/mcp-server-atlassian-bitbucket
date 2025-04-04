import {
	CodeSearchResponse,
	CodeSearchResult,
	CommitsResponse,
	CommitResult,
} from '../services/vendor.atlassian.search.service.js';
import { formatDate } from '../utils/formatter.util.js';

/**
 * Format a single code search result into markdown
 *
 * @param result The code search result to format
 * @returns Formatted markdown string
 */
function formatCodeSearchResult(result: CodeSearchResult): string {
	// Format the file path with matches highlighted
	const pathFormatted = result.path_matches
		.map((part) => (part.match ? `**${part.text}**` : part.text))
		.join('');

	// Build markdown output
	let markdown = `### [${pathFormatted}](${result.file.links.self.href})\n\n`;

	// Add match summary
	markdown += `${result.content_match_count} ${
		result.content_match_count === 1 ? 'match' : 'matches'
	} found\n\n`;

	// Add code blocks with matched content
	markdown += '```\n';

	// Process each content match
	result.content_matches.forEach((contentMatch) => {
		// Process each line in the content match
		contentMatch.lines.forEach((line) => {
			// Add line number
			markdown += `${line.line}: `;

			// Process segments (some may be highlighted matches)
			if (line.segments.length) {
				line.segments.forEach((segment) => {
					// In a code block we can't use bold, so use a different
					// representation for matches (e.g., adding >>> <<< around matches)
					markdown += segment.match
						? `>>>${segment.text}<<<`
						: segment.text;
				});
			}

			markdown += '\n';
		});

		markdown += '\n';
	});

	markdown += '```\n\n';

	return markdown;
}

/**
 * Format code search results into markdown
 *
 * @param response The code search response from the API
 * @returns Markdown formatted string of code search results
 */
export function formatCodeSearchResults(response: CodeSearchResponse): string {
	if (!response.values || response.values.length === 0) {
		return '**No code matches found.**\n\n';
	}

	// Start with a summary
	let markdown = `## Code Search Results\n\nFound ${response.size} matches for the code search query.\n\n`;

	// Format each result
	response.values.forEach((result) => {
		markdown += formatCodeSearchResult(result);
	});

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
 * @param repoSlug The repository slug
 * @param workspaceSlug The workspace slug
 * @returns Markdown formatted string of commits search results
 */
export function formatCommitsResults(
	response: CommitsResponse,
	repoSlug: string,
	workspaceSlug: string,
): string {
	if (!response.values || response.values.length === 0) {
		return '**No commits found matching your query.**\n\n';
	}

	// Count the number of commits
	const commitCount = response.values.length;

	// Start with a header and summary
	let markdown = `# Commits in ${workspaceSlug}/${repoSlug}\n\n`;
	markdown += `## Search Results\n\nFound ${commitCount} commits matching your query.\n\n`;

	// Format each result
	response.values.forEach((commit) => {
		markdown += formatCommitResult(commit);
		markdown += '---\n\n';
	});

	return markdown;
}

export default {
	formatCodeSearchResults,
	formatCommitsResults,
};
