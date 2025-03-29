import { Command } from 'commander';
import { Logger } from '../utils/logger.util.js';

// Import Bitbucket-specific CLI modules
import atlassianWorkspacesCli from './atlassian.workspaces.cli.js';
import atlassianRepositoriesCli from './atlassian.repositories.cli.js';
import atlassianPullRequestsCli from './atlassian.pullrequests.cli.js';
import atlassianSearchCommands from './atlassian.search.cli.js';

// Get the version from package.json
const VERSION = '1.11.1'; // This should match the version in src/index.ts
const NAME = 'mcp-atlassian-bitbucket';
const DESCRIPTION =
	'A Model Context Protocol (MCP) server for Atlassian Bitbucket integration';

// Create a contextualized logger for this file
const cliLogger = Logger.forContext('cli/index.ts');

// Log CLI initialization
cliLogger.debug('Bitbucket CLI module initialized');

export async function runCli(args: string[]) {
	const methodLogger = Logger.forContext('cli/index.ts', 'runCli');

	const program = new Command();

	program.name(NAME).description(DESCRIPTION).version(VERSION);

	// Register CLI commands
	atlassianWorkspacesCli.register(program);
	cliLogger.debug('Workspace commands registered');

	atlassianRepositoriesCli.register(program);
	cliLogger.debug('Repository commands registered');

	atlassianPullRequestsCli.register(program);
	cliLogger.debug('Pull Request commands registered');

	atlassianSearchCommands.register(program);
	cliLogger.debug('Search commands registered');

	// Handle unknown commands
	program.on('command:*', (operands) => {
		methodLogger.error(`Unknown command: ${operands[0]}`);
		console.log('');
		program.help();
		process.exit(1);
	});

	// Parse arguments; default to help if no command provided
	await program.parseAsync(args.length ? args : ['--help'], { from: 'user' });
}
