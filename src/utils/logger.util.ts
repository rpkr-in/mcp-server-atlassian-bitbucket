/**
 * Format a timestamp for logging
 * @returns Formatted timestamp [HH:MM:SS]
 */
function getTimestamp(): string {
	const now = new Date();
	return `[${now.toISOString().split('T')[1].split('.')[0]}]`;
}

/**
 * Safely convert object to string with size limits
 * @param obj Object to stringify
 * @param maxLength Maximum length of the resulting string
 * @returns Safely stringified object
 */
function safeStringify(obj: unknown, maxLength = 1000): string {
	try {
		const str = JSON.stringify(obj);
		if (str.length <= maxLength) {
			return str;
		}
		return `${str.substring(0, maxLength)}... (truncated, ${str.length} chars total)`;
	} catch {
		return '[Object cannot be stringified]';
	}
}

/**
 * Extract essential values from larger objects for logging
 * @param obj The object to extract values from
 * @param keys Keys to extract (if available)
 * @returns Object containing only the specified keys
 */
function extractEssentialValues(
	obj: Record<string, unknown>,
	keys: string[],
): Record<string, unknown> {
	const result: Record<string, unknown> = {};
	keys.forEach((key) => {
		if (Object.prototype.hasOwnProperty.call(obj, key)) {
			result[key] = obj[key];
		}
	});
	return result;
}

/**
 * Format source path consistently using the standardized format:
 * [module/file.ts@function] or [module/file.ts]
 *
 * @param filePath File path (with or without src/ prefix)
 * @param functionName Optional function name
 * @returns Formatted source path according to standard pattern
 */
function formatSourcePath(filePath: string, functionName?: string): string {
	// Always strip 'src/' prefix for consistency
	const normalizedPath = filePath.replace(/^src\//, '');

	return functionName
		? `[${normalizedPath}@${functionName}]`
		: `[${normalizedPath}]`;
}

/**
 * Logger class for consistent logging across the application.
 *
 * RECOMMENDED USAGE:
 *
 * 1. Create a file-level logger using the static forContext method:
 *    ```
 *    const logger = Logger.forContext('controllers/myController.ts');
 *    ```
 *
 * 2. For method-specific logging, create a method logger:
 *    ```
 *    const methodLogger = Logger.forContext('controllers/myController.ts', 'myMethod');
 *    ```
 *
 * 3. Avoid using raw string prefixes in log messages. Instead, use contextualized loggers.
 *
 * 4. For debugging objects, use the debugResponse method to log only essential properties.
 */
class Logger {
	private context?: string;

	constructor(context?: string) {
		this.context = context;
	}

	/**
	 * Create a contextualized logger for a specific file or component.
	 * This is the preferred method for creating loggers.
	 *
	 * @param filePath The file path (e.g., 'controllers/atlassian.projects.controller.ts')
	 * @param functionName Optional function name for more specific context
	 * @returns A new Logger instance with the specified context
	 *
	 * @example
	 * // File-level logger
	 * const logger = Logger.forContext('controllers/myController.ts');
	 *
	 * // Method-level logger
	 * const methodLogger = Logger.forContext('controllers/myController.ts', 'myMethod');
	 */
	static forContext(filePath: string, functionName?: string): Logger {
		return new Logger(formatSourcePath(filePath, functionName));
	}

	private _formatMessage(message: string): string {
		return this.context ? `${this.context} ${message}` : message;
	}

	private _formatArgs(args: unknown[]): unknown[] {
		// If the first argument is an object and not an Error, safely stringify it
		if (
			args.length > 0 &&
			typeof args[0] === 'object' &&
			args[0] !== null &&
			!(args[0] instanceof Error)
		) {
			args[0] = safeStringify(args[0]);
		}
		return args;
	}

	_log(
		level: 'info' | 'warn' | 'error' | 'debug',
		message: string,
		...args: unknown[]
	) {
		// Skip debug messages if DEBUG is not set to true
		if (level === 'debug' && process.env.DEBUG !== 'true') {
			return;
		}

		const timestamp = getTimestamp();
		const prefix = `${timestamp} [${level.toUpperCase()}]`;
		let logMessage = `${prefix} ${this._formatMessage(message)}`;

		const formattedArgs = this._formatArgs(args);
		if (formattedArgs.length > 0) {
			// Handle errors specifically
			if (formattedArgs[0] instanceof Error) {
				const error = formattedArgs[0] as Error;
				logMessage += ` Error: ${error.message}`;
				if (error.stack) {
					logMessage += `\n${error.stack}`;
				}
				// If there are more args, add them after the error
				if (formattedArgs.length > 1) {
					logMessage += ` ${formattedArgs
						.slice(1)
						.map((arg) =>
							typeof arg === 'string' ? arg : safeStringify(arg),
						)
						.join(' ')}`;
				}
			} else {
				logMessage += ` ${formattedArgs
					.map((arg) =>
						typeof arg === 'string' ? arg : safeStringify(arg),
					)
					.join(' ')}`;
			}
		}

		if (process.env.NODE_ENV === 'test') {
			console[level](logMessage);
		} else {
			console.error(logMessage);
		}
	}

	info(message: string, ...args: unknown[]) {
		this._log('info', message, ...args);
	}

	warn(message: string, ...args: unknown[]) {
		this._log('warn', message, ...args);
	}

	error(message: string, ...args: unknown[]) {
		this._log('error', message, ...args);
	}

	debug(message: string, ...args: unknown[]) {
		this._log('debug', message, ...args);
	}

	/**
	 * Log essential information about an API response
	 * @param message Log message
	 * @param response API response object
	 * @param essentialKeys Keys to extract from the response
	 */
	debugResponse(
		message: string,
		response: Record<string, unknown>,
		essentialKeys: string[],
	) {
		const essentialInfo = extractEssentialValues(response, essentialKeys);
		this.debug(message, essentialInfo);
	}
}

// Export the default logger instance and the Logger class
export const logger = new Logger();
export { Logger };
