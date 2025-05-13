import { DiffstatResponse } from '../services/vendor.atlassian.repositories.diff.types.js';
import {
	formatHeading,
	formatSeparator,
	formatDate,
	formatDiff,
} from '../utils/formatter.util.js';

/**
 * Format diffstat results into Markdown
 *
 * @param diffstat - Diffstat response containing file changes
 * @param baseBranchOrCommit - Name of the base branch or commit (source of the diff)
 * @param targetBranchOrCommit - Name of the target branch or commit (destination of the diff)
 * @returns Formatted Markdown string
 */
export function formatDiffstat(
	diffstat: DiffstatResponse,
	baseBranchOrCommit: string,
	targetBranchOrCommit: string,
): string {
	const lines: string[] = [];
	const files = diffstat.values || [];

	// Title section
	lines.push(
		formatHeading(
			`Diff: ${baseBranchOrCommit} → ${targetBranchOrCommit}`,
			1,
		),
	);
	lines.push('');

	if (files.length === 0) {
		lines.push('*No differences found.*');
		lines.push('');
		lines.push(formatSeparator());
		lines.push(`*Information retrieved at: ${formatDate(new Date())}*`);
		return lines.join('\n');
	}

	// Summary statistics
	let totalAdditions = 0;
	let totalDeletions = 0;
	let conflictedFiles = 0;

	// Collect statistics
	files.forEach((file) => {
		if (file.lines_added) totalAdditions += file.lines_added;
		if (file.lines_removed) totalDeletions += file.lines_removed;
		if (file.status === 'merge conflict') conflictedFiles++;
	});

	lines.push(formatHeading('Summary', 2));
	lines.push(
		`${files.length} file${files.length !== 1 ? 's' : ''} changed with ${totalAdditions} insertion${totalAdditions !== 1 ? 's' : ''} and ${totalDeletions} deletion${totalDeletions !== 1 ? 's' : ''}.`,
	);

	if (conflictedFiles > 0) {
		lines.push('');
		lines.push(
			`⚠️ **Merge conflicts detected in ${conflictedFiles} file${conflictedFiles !== 1 ? 's' : ''}.**`,
		);
	}

	lines.push('');

	// File changes section (limit to a reasonable number, like 20)
	const maxFilesToShow = 20;
	const hasMoreFiles = files.length > maxFilesToShow;
	const filesToDisplay = files.slice(0, maxFilesToShow);

	// File list with changes
	lines.push(formatHeading('Files Changed', 2));
	lines.push('');

	filesToDisplay.forEach((file) => {
		const changes = [];
		if (file.lines_added) changes.push(`+${file.lines_added}`);
		if (file.lines_removed) changes.push(`-${file.lines_removed}`);
		const changeStr = changes.length > 0 ? ` (${changes.join(', ')})` : '';

		// Handle potentially null old/new paths
		const filePath = file.new?.path || file.old?.path || '(unnamed file)';

		// Show path, changes, and status if it's a conflict
		let line = `- \`${filePath}\`${changeStr}`;
		if (file.status === 'merge conflict') {
			line += ' **CONFLICT**';
		}
		lines.push(line);
	});

	if (hasMoreFiles) {
		lines.push('');
		lines.push(`... and ${files.length - maxFilesToShow} more files`);
	}

	// Standard footer
	lines.push('');
	lines.push(formatSeparator());
	lines.push(`*Information retrieved at: ${formatDate(new Date())}*`);

	return lines.join('\n');
}

/**
 * Format complete diff results, including diffstat summary and raw diff
 *
 * @param diffstat - Diffstat response containing file changes
 * @param rawDiff - Raw unified diff text
 * @param baseBranchOrCommit - Name of the base branch or commit
 * @param targetBranchOrCommit - Name of the target branch or commit
 * @returns Formatted Markdown string
 */
export function formatFullDiff(
	diffstat: DiffstatResponse,
	rawDiff: string,
	baseBranchOrCommit: string,
	targetBranchOrCommit: string,
): string {
	const diffstatMd = formatDiffstat(
		diffstat,
		baseBranchOrCommit,
		targetBranchOrCommit,
	);

	if (!rawDiff || rawDiff.trim() === '') {
		return diffstatMd;
	}

	const lines = diffstatMd.split('\n');

	// Insert section heading for the raw diff
	// Insert before the standard footer (which is the last 2 lines)
	lines.splice(lines.length - 3, 0, '', formatHeading('Code Changes', 2), '');
	lines.splice(lines.length - 3, 0, formatDiff(rawDiff));

	return lines.join('\n');
}
