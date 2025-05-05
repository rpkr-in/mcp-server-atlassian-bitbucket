import { Logger } from './logger.util.js';

const utilLogger = Logger.forContext('utils/diff.util.ts');

/**
 * Extracts a code snippet from raw unified diff content around a specific line number.
 *
 * @param diffContent - The raw unified diff content (string).
 * @param targetLineNumber - The line number (in the "new" file) to center the snippet around.
 * @param contextLines - The number of lines to include before and after the target line.
 * @returns The extracted code snippet as a string, or an empty string if extraction fails.
 */
export function extractDiffSnippet(
	diffContent: string,
	targetLineNumber: number,
	contextLines = 2,
): string {
	const methodLogger = utilLogger.forMethod('extractDiffSnippet');
	methodLogger.debug(
		`Attempting to extract snippet around line ${targetLineNumber}`,
	);
	const lines = diffContent.split('\n');
	const snippetLines: string[] = [];
	let currentNewLineNumber = 0;
	let hunkHeaderFound = false;

	for (const line of lines) {
		if (line.startsWith('@@')) {
			// Found a hunk header, parse the starting line number of the new file
			const match = line.match(/\+([0-9]+)/); // Matches the part like "+1,10" or "+5"
			if (match && match[1]) {
				currentNewLineNumber = parseInt(match[1], 10) - 1; // -1 because we increment before checking
				hunkHeaderFound = true;
				methodLogger.debug(
					`Found hunk starting at new line number: ${currentNewLineNumber + 1}`,
				);
			} else {
				methodLogger.warn('Could not parse hunk header:', line);
				hunkHeaderFound = false; // Reset if header is unparseable
			}
			continue; // Skip the hunk header line itself
		}

		if (!hunkHeaderFound) {
			continue; // Skip lines before the first valid hunk header
		}

		// Track line numbers only for lines added or unchanged in the new file
		if (line.startsWith('+') || line.startsWith(' ')) {
			currentNewLineNumber++;
			// Check if the current line is within the desired context range
			if (
				currentNewLineNumber >= targetLineNumber - contextLines &&
				currentNewLineNumber <= targetLineNumber + contextLines
			) {
				// Prepend line numbers for context, marking the target line
				const prefix =
					currentNewLineNumber === targetLineNumber ? '>' : ' ';
				// Add the line, removing the diff marker (+ or space)
				snippetLines.push(
					`${prefix} ${currentNewLineNumber.toString().padStart(4)}: ${line.substring(1)}`,
				);
			}
		} else if (line.startsWith('-')) {
			// Lines only in the old file don't increment the new file line number
			// but can be included for context if they fall within the range calculation *based on previous new lines*
			// This is complex logic, for now, we only show '+' and ' ' lines for simplicity.
			// Future enhancement: Show '-' lines that are adjacent to the target context.
		}

		// Optimization: if we've passed the target context range, stop processing
		if (currentNewLineNumber > targetLineNumber + contextLines) {
			methodLogger.debug(
				`Passed target context range (current: ${currentNewLineNumber}, target: ${targetLineNumber}). Stopping search.`,
			);
			break;
		}
	}

	if (snippetLines.length === 0) {
		methodLogger.warn(
			`Could not find or extract snippet for line ${targetLineNumber}`,
		);
		return ''; // Return empty if no relevant lines found
	}

	methodLogger.debug(
		`Successfully extracted snippet with ${snippetLines.length} lines.`,
	);
	return snippetLines.join('\n');
}
