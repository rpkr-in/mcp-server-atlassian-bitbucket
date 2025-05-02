/**
 * Standardized formatting utilities for consistent output across all CLI and Tool interfaces.
 * These functions should be used by all formatters to ensure consistent formatting.
 */

import { Logger } from './logger.util.js'; // Ensure logger is imported

const formatterLogger = Logger.forContext('utils/formatter.util.ts'); // Define logger instance

/**
 * Format a date in a standardized way: YYYY-MM-DD HH:MM:SS UTC
 * @param dateString - ISO date string or Date object
 * @returns Formatted date string
 */
export function formatDate(dateString?: string | Date): string {
	if (!dateString) {
		return 'Not available';
	}

	try {
		const date =
			typeof dateString === 'string' ? new Date(dateString) : dateString;

		// Format: YYYY-MM-DD HH:MM:SS UTC
		return date
			.toISOString()
			.replace('T', ' ')
			.replace(/\.\d+Z$/, ' UTC');
	} catch {
		return 'Invalid date';
	}
}

/**
 * Format a URL as a markdown link
 * @param url - URL to format
 * @param title - Link title
 * @returns Formatted markdown link
 */
export function formatUrl(url?: string, title?: string): string {
	if (!url) {
		return 'Not available';
	}

	const linkTitle = title || url;
	return `[${linkTitle}](${url})`;
}

/**
 * Format pagination information in a standardized way
 * @param count - Number of items in the current result set
 * @param hasMore - Whether there are more results available
 * @param nextCursor - Cursor for the next page of results
 * @param total - Total number of items (optional)
 * @returns Formatted pagination information
 */
export function formatPagination(
	count: number,
	hasMore: boolean,
	nextCursor?: string,
	total?: number, // Add optional total parameter
): string {
	const methodLogger = formatterLogger.forMethod('formatPagination');
	const parts: string[] = [];

	// Showing count and potentially total
	if (total !== undefined && total > 0) {
		parts.push(`*Showing ${count} of ${total} total items.*`);
	} else if (count > 0) {
		parts.push(`*Showing ${count} item${count !== 1 ? 's' : ''}.*`);
	} else if (total === 0) {
		parts.push('*Showing 0 of 0 total items.*'); // Handle zero total case
	} else {
		// If count is 0 and total is undefined, perhaps don't show count message
		// parts.push('*Showing 0 items.*');
	}

	// More results availability
	if (hasMore) {
		parts.push('More results are available.');
	}

	// Prompt for next cursor
	if (hasMore && nextCursor) {
		parts.push(`\nTo see more results, use --cursor "${nextCursor}"`);
	}

	const result = parts.join(' ').trim(); // Join with space, trim ends
	methodLogger.debug(`Formatted pagination: ${result}`);
	return result;
}

/**
 * Format a heading with consistent style
 * @param text - Heading text
 * @param level - Heading level (1-6)
 * @returns Formatted heading
 */
export function formatHeading(text: string, level: number = 1): string {
	const validLevel = Math.min(Math.max(level, 1), 6);
	const prefix = '#'.repeat(validLevel);
	return `${prefix} ${text}`;
}

/**
 * Format a list of key-value pairs as a bullet list
 * @param items - Object with key-value pairs
 * @param keyFormatter - Optional function to format keys
 * @returns Formatted bullet list
 */
export function formatBulletList(
	items: Record<string, unknown>,
	keyFormatter?: (key: string) => string,
): string {
	const lines: string[] = [];

	for (const [key, value] of Object.entries(items)) {
		if (value === undefined || value === null) {
			continue;
		}

		const formattedKey = keyFormatter ? keyFormatter(key) : key;
		const formattedValue = formatValue(value);
		lines.push(`- **${formattedKey}**: ${formattedValue}`);
	}

	return lines.join('\n');
}

/**
 * Format a value based on its type
 * @param value - Value to format
 * @returns Formatted value
 */
function formatValue(value: unknown): string {
	if (value === undefined || value === null) {
		return 'Not available';
	}

	if (value instanceof Date) {
		return formatDate(value);
	}

	// Handle URL objects with url and title properties
	if (typeof value === 'object' && value !== null && 'url' in value) {
		const urlObj = value as { url: string; title?: string };
		if (typeof urlObj.url === 'string') {
			return formatUrl(urlObj.url, urlObj.title);
		}
	}

	if (typeof value === 'string') {
		// Check if it's a URL
		if (value.startsWith('http://') || value.startsWith('https://')) {
			return formatUrl(value);
		}

		// Check if it might be a date
		if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
			return formatDate(value);
		}

		return value;
	}

	if (typeof value === 'boolean') {
		return value ? 'Yes' : 'No';
	}

	return String(value);
}

/**
 * Format a separator line
 * @returns Separator line
 */
export function formatSeparator(): string {
	return '---';
}

/**
 * Format a numbered list of items
 * @param items - Array of items to format
 * @param formatter - Function to format each item
 * @returns Formatted numbered list
 */
export function formatNumberedList<T>(
	items: T[],
	formatter: (item: T, index: number) => string,
): string {
	if (items.length === 0) {
		return 'No items.';
	}

	return items.map((item, index) => formatter(item, index)).join('\n\n');
}

/**
 * Format a raw diff output for display
 *
 * Parses and formats a raw unified diff string into a Markdown
 * formatted display with proper code block syntax highlighting.
 *
 * @param {string} rawDiff - The raw diff content from the API
 * @param {number} maxFiles - Maximum number of files to display in detail (optional, default: 5)
 * @param {number} maxLinesPerFile - Maximum number of lines to display per file (optional, default: 100)
 * @returns {string} Markdown formatted diff content
 */
export function formatDiff(
	rawDiff: string,
	maxFiles: number = 5,
	maxLinesPerFile: number = 100,
): string {
	if (!rawDiff || rawDiff.trim() === '') {
		return '*No changes found in this pull request.*';
	}

	const lines = rawDiff.split('\n');
	const formattedLines: string[] = [];
	let currentFile = '';
	let fileCount = 0;
	let inFile = false;
	let truncated = false;
	let lineCount = 0;

	for (const line of lines) {
		// New file is marked by a line starting with "diff --git"
		if (line.startsWith('diff --git')) {
			if (inFile) {
				// Close previous file code block
				formattedLines.push('```');
				formattedLines.push('');
			}

			// Only process up to maxFiles
			fileCount++;
			if (fileCount > maxFiles) {
				truncated = true;
				break;
			}

			// Extract filename
			const filePath = line.match(/diff --git a\/(.*) b\/(.*)/);
			currentFile = filePath ? filePath[1] : 'unknown file';
			formattedLines.push(`### ${currentFile}`);
			formattedLines.push('');
			formattedLines.push('```diff');
			inFile = true;
			lineCount = 0;
		} else if (inFile) {
			lineCount++;

			// Truncate files that are too long
			if (lineCount > maxLinesPerFile) {
				formattedLines.push(
					'// ... more lines omitted for brevity ...',
				);
				formattedLines.push('```');
				formattedLines.push('');
				inFile = false;
				continue;
			}

			// Format diff lines with appropriate highlighting
			if (line.startsWith('+')) {
				formattedLines.push(line);
			} else if (line.startsWith('-')) {
				formattedLines.push(line);
			} else if (line.startsWith('@@')) {
				// Change section header
				formattedLines.push(line);
			} else {
				// Context line
				formattedLines.push(line);
			}
		}
	}

	// Close the last code block if necessary
	if (inFile) {
		formattedLines.push('```');
	}

	// Add truncation notice if we limited the output
	if (truncated) {
		formattedLines.push('');
		formattedLines.push(
			`*Output truncated. Only showing the first ${maxFiles} files.*`,
		);
	}

	return formattedLines.join('\n');
}
