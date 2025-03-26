import { Command } from 'commander';
import { logger } from '../utils/logger.util.js';

// Import Bitbucket-specific CLI modules
import atlassianWorkspacesCli from './atlassian.workspaces.cli.js';
import atlassianRepositoriesCli from './atlassian.repositories.cli.js';
import atlassianPullRequestsCli from './atlassian.pullrequests.cli.js';

// Get the version from package.json
const VERSION = '1.7.1'; // This should match the version in src/index.ts
const NAME = '@aashari/mcp-server-atlassian-bitbucket';
const DESCRIPTION =
	'A Model Context Protocol (MCP) server for Atlassian Bitbucket integration';

export async function runCli(args: string[]) {
	const program = new Command();

	program.name(NAME).description(DESCRIPTION).version(VERSION);

	// Register CLI commands
	atlassianWorkspacesCli.register(program);
	atlassianRepositoriesCli.register(program);
	atlassianPullRequestsCli.register(program);

	// Handle unknown commands
	program.on('command:*', (operands) => {
		logger.error(`[src/cli/index.ts] Unknown command: ${operands[0]}`);
		console.log('');
		program.help();
		process.exit(1);
	});

	// Parse arguments; default to help if no command provided
	await program.parseAsync(args.length ? args : ['--help'], { from: 'user' });
}
