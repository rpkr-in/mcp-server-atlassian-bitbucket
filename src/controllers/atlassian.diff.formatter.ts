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
		lines.push(
			'*No changes detected in the diffstat response. This might occur when:*',
		);
		lines.push('- The commits or branches are identical');
		lines.push(
			'- The changes are purely structural (e.g., merge commits without content changes)',
		);
		lines.push(
			'- The parameters need to be specified in a different order',
		);
		lines.push('');
		lines.push('**Try the following:**');
		lines.push(
			'1. For branch comparisons: Reverse the source and destination branch parameters',
		);
		lines.push(
			'2. For commit comparisons: Ensure newer commit is `sinceCommit` and older commit is `untilCommit`',
		);
		lines.push(
			'3. Check that both references exist and you have access to them',
		);
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

	// If there's a raw diff but empty diffstat, we should still show the raw diff
	// This can happen with structural changes like merges
	if (
		rawDiff &&
		rawDiff.trim() !== '' &&
		(diffstat.values || []).length === 0
	) {
		const lines = diffstatMd.split('\n');

		// Replace the "No changes detected" message with a more accurate one
		const messageStartIndex = lines.findIndex((line) =>
			line.includes('*No changes detected'),
		);
		if (messageStartIndex >= 0) {
			lines.splice(
				messageStartIndex,
				6,
				'*No file changes in diffstat but raw diff content was found. This often happens with:*',
				'- Merge commits or trivial merges',
				'- Rename-only changes without content modifications',
				'- Changes to file metadata or permissions without content changes',
				'',
				'If the diff content below is not what you expected, try reversing the parameter order:',
				'- For branch comparisons: swap source and destination branch values',
				'- For commit comparisons: swap sinceCommit and untilCommit values',
			);
		}

		// Insert section heading for the raw diff before the footer
		const separatorIndex = lines.findIndex((line) => line.includes('---'));
		if (separatorIndex >= 0) {
			lines.splice(
				separatorIndex,
				0,
				'',
				formatHeading('Raw Diff Content', 2),
				'',
			);
			lines.splice(separatorIndex + 3, 0, formatDiff(rawDiff));
		}

		return lines.join('\n');
	}

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
