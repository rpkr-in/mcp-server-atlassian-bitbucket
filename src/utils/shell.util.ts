import { promisify } from 'util';
import { exec as callbackExec } from 'child_process';
import { Logger } from './logger.util.js';

const exec = promisify(callbackExec);
const utilLogger = Logger.forContext('utils/shell.util.ts');

/**
 * Executes a shell command.
 *
 * @param command The command string to execute.
 * @param operationDesc A brief description of the operation for logging purposes.
 * @returns A promise that resolves with the stdout of the command.
 * @throws An error if the command execution fails, including stderr.
 */
export async function executeShellCommand(
	command: string,
	operationDesc: string,
): Promise<string> {
	const methodLogger = utilLogger.forMethod('executeShellCommand');
	methodLogger.debug(`Attempting to ${operationDesc}: ${command}`);
	try {
		const { stdout, stderr } = await exec(command);
		if (stderr) {
			methodLogger.warn(`Stderr from ${operationDesc}: ${stderr}`);
			// Depending on the command, stderr might not always indicate a failure,
			// but for git clone, it usually does if stdout is empty.
			// If stdout is also present, it might be a warning.
		}
		methodLogger.info(
			`Successfully executed ${operationDesc}. Stdout: ${stdout}`,
		);
		return stdout || `Successfully ${operationDesc}.`; // Return stdout or a generic success message
	} catch (error: unknown) {
		methodLogger.error(`Failed to ${operationDesc}: ${command}`, error);

		let errorMessage = 'Unknown error during shell command execution.';
		if (error instanceof Error) {
			// Node's child_process.ExecException often has stdout and stderr properties
			const execError = error as Error & {
				stdout?: string;
				stderr?: string;
			};
			errorMessage =
				execError.stderr || execError.stdout || execError.message;
		} else if (typeof error === 'string') {
			errorMessage = error;
		}
		// Ensure a default message if somehow it's still undefined (though unlikely with above checks)
		if (!errorMessage && error) {
			errorMessage = String(error);
		}

		throw new Error(`Failed to ${operationDesc}: ${errorMessage}`);
	}
}
