"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runCli = runCli;
const commander_1 = require("commander");
const logger_util_js_1 = require("../utils/logger.util.js");
const atlassian_projects_cli_js_1 = __importDefault(require("./atlassian.projects.cli.js"));
const atlassian_issues_cli_js_1 = __importDefault(require("./atlassian.issues.cli.js"));
// Get the version from package.json
const VERSION = '1.1.2'; // This should match the version in src/index.ts
const NAME = '@aashari/mcp-atlassian-jira';
const DESCRIPTION = 'A Model Context Protocol (MCP) server for Atlassian Jira integration';
async function runCli(args) {
    const program = new commander_1.Command();
    program.name(NAME).description(DESCRIPTION).version(VERSION);
    // Register CLI commands
    atlassian_projects_cli_js_1.default.register(program);
    atlassian_issues_cli_js_1.default.register(program);
    // Handle unknown commands
    program.on('command:*', (operands) => {
        logger_util_js_1.logger.error(`[src/cli/index.ts] Unknown command: ${operands[0]}`);
        console.log('');
        program.help();
        process.exit(1);
    });
    // Parse arguments; default to help if no command provided
    await program.parseAsync(args.length ? args : ['--help'], { from: 'user' });
}
