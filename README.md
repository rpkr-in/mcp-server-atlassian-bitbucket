# Atlassian Bitbucket MCP Server

This project provides a Model Context Protocol (MCP) server that acts as a bridge between AI assistants (like Anthropic's Claude, Cursor AI, or other MCP-compatible clients) and your Atlassian Bitbucket instance. It allows AI to securely access and interact with your repositories, pull requests, and other Bitbucket resources in real-time.

## What is MCP and Why Use This Server?

Model Context Protocol (MCP) is an open standard enabling AI models to connect securely to external tools and data sources. This server implements MCP specifically for Bitbucket.

**Benefits:**

- **Real-time Access:** Your AI assistant can directly access up-to-date Bitbucket data.
- **Eliminate Copy/Paste:** No need to manually transfer information between Bitbucket and your AI assistant.
- **Enhanced AI Capabilities:** Enables AI to analyze repositories, review pull requests, and work with your code contextually.
- **Security:** You control access via API credentials. The AI interacts through the server, and sensitive operations remain contained.

## Available Tools

This MCP server exposes the following capabilities as standardized "Tools" for AI assistants:

| Tool Name            | Key Parameter(s)                                               | Description                                    | Example Conversational Use                | AI Tool Call Example (Simplified)                           |
| :------------------- | :------------------------------------------------------------- | :--------------------------------------------- | :---------------------------------------- | :---------------------------------------------------------- |
| `list-workspaces`    | _None required_                                                | List available Bitbucket workspaces.           | "Show me all my Bitbucket workspaces"     | `{}`                                                        |
| `get-workspace`      | `workspaceSlug` (string)                                       | Get detailed information about a workspace.    | "Tell me about the acme workspace"        | `{ workspaceSlug: "acme" }`                                 |
| `list-repositories`  | `workspaceSlug` (string)                                       | List repositories in a specific workspace.     | "Show repositories in the acme workspace" | `{ workspaceSlug: "acme" }`                                 |
| `get-repository`     | `workspaceSlug` (string), `repoSlug` (string)                  | Get detailed information about a repository.   | "Show me details of the acme/api repo"    | `{ workspaceSlug: "acme", repoSlug: "api" }`                |
| `list-pull-requests` | `workspaceSlug` (string), `repoSlug` (string)                  | List pull requests for a specific repository.  | "Show open PRs in acme/api repo"          | `{ workspaceSlug: "acme", repoSlug: "api", state: "OPEN" }` |
| `get-pull-request`   | `workspaceSlug` (string), `repoSlug` (string), `prId` (string) | Get detailed information about a pull request. | "Tell me about PR #123 in acme/api repo"  | `{ workspaceSlug: "acme", repoSlug: "api", prId: "123" }`   |

## Interface Philosophy: Minimal Interface, Maximal Detail

This server is designed to be simple for both humans (via CLI) and AI (via MCP Tools) to use, while providing rich information:

1. **Simple Commands/Tools:** Interfaces require only the essential identifiers or filters (like `workspaceSlug`, `repoSlug`, `prId`).
2. **Comprehensive Results by Default:** Operations that retrieve a specific item (`get-repository`, `get-pull-request`, `get-workspace`) automatically fetch and return all relevant details (metadata, branches, reviewers, etc.) without needing extra "include" flags.

This philosophy ensures you get the full picture without complex commands, letting the AI focus on using the information rather than configuring requests.

## Prerequisites

- **Node.js and npm:** Ensure you have Node.js (which includes npm) installed. Download from [nodejs.org](https://nodejs.org/).
- **Atlassian Account:** An active Atlassian account with access to the Bitbucket repositories you want to connect to.

## Quick Start Guide

Follow these steps to connect your AI assistant to Bitbucket:

### Step 1: Set Up Authentication

You have two options for authenticating with Bitbucket:

#### Option A: Get Your Atlassian API Token (Recommended if you use other Atlassian MCP servers)

**Important:** Treat your API token like a password. Do not share it or commit it to version control.

1. Go to your Atlassian API token management page:
   [https://id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Click **Create API token**.
3. Give it a descriptive **Label** (e.g., `mcp-bitbucket-access`).
4. Click **Create**.
5. **Immediately copy the generated API token.** You won't be able to see it again. Store it securely (e.g., in a password manager).

#### Option B: Create a Bitbucket App Password

1. Navigate to your Bitbucket settings → App passwords
2. Click **Create app password**
3. Give it a name and select appropriate permissions (at minimum: repositories:read, pull requests:read)
4. **Immediately copy the generated password.** You won't be able to see it again. Store it securely.

### Step 2: Configure the Server Credentials

Choose **one** of the following methods:

#### Method A: Global MCP Config File (Recommended for Persistent Use)

This is the preferred method as it keeps credentials separate from your AI client configuration.

1. **Create the directory** (if it doesn't exist):
    - macOS/Linux: `mkdir -p ~/.mcp`
    - Windows: Create a folder named `.mcp` in your user profile directory (e.g., `C:\Users\<YourUsername>\.mcp`)
2. **Create the config file:** Inside the `.mcp` directory, create a file named `configs.json`.
3. **Add the configuration:** Paste one of the following JSON structures into `configs.json`, replacing the placeholder values:

**Using Atlassian API Token:**

```json
{
	"@aashari/mcp-server-atlassian-bitbucket": {
		"environments": {
			"ATLASSIAN_SITE_NAME": "<YOUR_SITE_NAME>",
			"ATLASSIAN_USER_EMAIL": "<YOUR_ATLASSIAN_EMAIL>",
			"ATLASSIAN_API_TOKEN": "<YOUR_COPIED_API_TOKEN>"
		}
	}
	// You can add configurations for other @aashari MCP servers here too
}
```

**Using Bitbucket App Password:**

```json
{
	"@aashari/mcp-server-atlassian-bitbucket": {
		"environments": {
			"ATLASSIAN_BITBUCKET_USERNAME": "<YOUR_BITBUCKET_USERNAME>",
			"ATLASSIAN_BITBUCKET_APP_PASSWORD": "<YOUR_COPIED_APP_PASSWORD>"
		}
	}
	// You can add configurations for other @aashari MCP servers here too
}
```

- `<YOUR_SITE_NAME>`: Your Atlassian site name (e.g., if your URL is `mycompany.atlassian.net`, enter `mycompany`).
- `<YOUR_ATLASSIAN_EMAIL>`: The email address associated with your Atlassian account.
- `<YOUR_COPIED_API_TOKEN>`: The API token you generated in Step 1.
- `<YOUR_BITBUCKET_USERNAME>`: Your Bitbucket username.
- `<YOUR_COPIED_APP_PASSWORD>`: The app password you generated in Step 1.

#### Method B: Environment Variables (Alternative / Temporary)

You can set environment variables directly when running the server. This is less convenient for regular use but useful for testing.

**Using Atlassian API Token:**

```bash
# Example for running the server directly
ATLASSIAN_SITE_NAME=<YOUR_SITE_NAME> \
ATLASSIAN_USER_EMAIL=<YOUR_ATLASSIAN_EMAIL> \
ATLASSIAN_API_TOKEN=<YOUR_COPIED_API_TOKEN> \
npx -y @aashari/mcp-server-atlassian-bitbucket
```

**Using Bitbucket App Password:**

```bash
# Example for running the server directly
ATLASSIAN_BITBUCKET_USERNAME=<YOUR_BITBUCKET_USERNAME> \
ATLASSIAN_BITBUCKET_APP_PASSWORD=<YOUR_COPIED_APP_PASSWORD> \
npx -y @aashari/mcp-server-atlassian-bitbucket
```

### Step 3: Connect Your AI Assistant

Configure your MCP client (Claude Desktop, Cursor, etc.) to run this server.

#### Option 1: Claude Desktop

1. Open Claude Desktop settings (gear icon).
2. Click **Edit Config**.
3. Add or merge the following into the `mcpServers` section:

```json
{
	"mcpServers": {
		"aashari/mcp-server-atlassian-bitbucket": {
			"command": "npx",
			"args": ["-y", "@aashari/mcp-server-atlassian-bitbucket"]
		}
		// Add other servers here if needed
	}
}
```

4. Save the configuration file.
5. **Restart Claude Desktop.**
6. Verify the connection: Click the "Tools" (hammer) icon. You should see the Bitbucket tools listed (e.g., `list-workspaces`, `get-repository`).

#### Option 2: Cursor AI

1. Open the Command Palette (`Cmd+Shift+P` or `Ctrl+Shift+P`).
2. Search for and select **Cursor Settings > MCP**.
3. Click **+ Add new MCP server**.
4. Fill in the details:
    - **Name**: `aashari/mcp-server-atlassian-bitbucket` (or another name you prefer)
    - **Type**: `command`
    - **Command**: `npx -y @aashari/mcp-server-atlassian-bitbucket`
5. Click **Add**.
6. Wait for the indicator next to the server name to turn green, confirming it's running and connected.

### Step 4: Using the Tools

Now you can ask your AI assistant questions related to your Bitbucket instance:

- "List all the workspaces I have access to in Bitbucket."
- "Show me all repositories in the 'acme' workspace."
- "Get information about the 'api' repository in the 'acme' workspace."
- "Show me open pull requests for the 'acme/api' repository."
- "Summarize pull request #123 in the 'acme/api' repository."

## Using as a Command-Line Tool (CLI)

You can also use this package directly from your terminal for quick checks or scripting.

#### Method 1: `npx` (No Installation Needed)

Run commands directly using `npx`:

```bash
# Ensure credentials are set via ~/.mcp/configs.json or environment variables first!
npx -y @aashari/mcp-server-atlassian-bitbucket list-workspaces
npx -y @aashari/mcp-server-atlassian-bitbucket get-repository --workspace acme --repository api
npx -y @aashari/mcp-server-atlassian-bitbucket list-pull-requests --workspace acme --repository api --state OPEN
```

#### Method 2: Global Installation (for Frequent Use)

1. Install globally: `npm install -g @aashari/mcp-server-atlassian-bitbucket`
2. Run commands using the `mcp-bitbucket` alias:

```bash
# Ensure credentials are set via ~/.mcp/configs.json or environment variables first!
mcp-bitbucket list-workspaces
mcp-bitbucket get-repository --workspace acme --repository api
mcp-bitbucket list-pull-requests --workspace acme --repository api --state OPEN
mcp-bitbucket --help # See all commands
mcp-bitbucket get-pull-request --help # Help for a specific command
```

## Troubleshooting

- **Authentication Errors:**
    - Double-check your credentials in your `~/.mcp/configs.json` or environment variables.
    - Ensure the API token or app password is still valid and hasn't been revoked.
    - Verify your user account has permission to access the Bitbucket workspaces and repositories you're querying.
- **Server Not Connecting (in AI Client):**
    - Ensure the command in your AI client configuration (`npx -y @aashari/mcp-server-atlassian-bitbucket`) is correct.
    * Check if Node.js/npm are correctly installed and in your system's PATH.
    * Try running the `npx` command directly in your terminal to see if it outputs any errors.
- **Resource Not Found (404 Errors):**
    - Verify the workspace slug, repository slug, or pull request ID you are using is correct.
    - Ensure you have permissions to view the specific workspace, repository, or pull request.
- **Enable Debug Logs:** Set the `DEBUG` environment variable to `true` for more detailed logs. Add `"DEBUG": "true"` inside the `environments` block in `configs.json` or run like `DEBUG=true npx ...`.

## For Developers: Contributing

Contributions are welcome! Please follow the established architecture and guidelines.

### Project Architecture

This MCP server adheres to a layered architecture promoting separation of concerns:

1. **`src/cli`**: Defines the command-line interface using `commander`. Minimal logic, mainly argument parsing and calling controllers.
2. **`src/tools`**: Defines the MCP tool interface for AI clients using `@modelcontextprotocol/sdk` and `zod` for schemas. Minimal logic, maps arguments and calls controllers.
3. **`src/controllers`**: Contains the core application logic. Orchestrates calls to services, uses formatters, handles pagination, and ensures consistent responses. Implements the "maximal detail" principle for 'get' operations.
4. **`src/services`**: Acts as an adapter to the specific vendor (Atlassian Bitbucket) API. Uses `transport.util` for actual HTTP calls.
5. **`src/formatters`**: Responsible for converting data into user-friendly Markdown output, heavily utilizing `formatter.util`.
6. **`src/utils`**: Holds shared, reusable utilities (config, logging, errors, formatting, transport, pagination, defaults).
7. **`src/types`**: Defines shared internal TypeScript types (`ControllerResponse`, etc.).

#### Design Principles

The code is structured around several key principles:

1. **Separation of Concerns**: Each layer has distinct responsibilities
2. **Minimal Interface**: Command options are limited to essential parameters
3. **Maximal Detail**: Responses include comprehensive information by default
4. **Consistent Patterns**: Similar commands follow consistent patterns across all tools
5. **Error Handling**: Robust error handling with clear, actionable messages

These principles ensure a robust, maintainable codebase that delivers a consistent user experience.

### Setting Up Development Environment

1. Clone the repository
2. Install dependencies: `npm install`
3. Run in development mode: `npm run dev:server`

### Development Scripts

- `npm run dev:server`: Run with hot reloading and debug logging
- `npm run dev:cli -- [command]`: Execute CLI commands during development
- `npm test`: Run test suite
- `npm run lint`: Check for code issues
- `npm run format`: Format code with Prettier

### Adding a New Feature

1. **API Research:** Identify the target Bitbucket API endpoint(s).
2. **Service Layer:** Add function(s) in `src/services/vendor.atlassian.*.service.ts` using `fetchAtlassian`.
3. **Controller Layer:** Add function in `src/controllers/*.controller.ts`. Call the service, ensure maximum detail for 'get' operations.
4. **Formatter:** Add/update function in `src/controllers/*.formatter.ts` using `formatter.util`.
5. **Tool Layer:** Define Zod schema in `src/tools/*.types.ts` (minimal args). Define tool in `src/tools/*.tool.ts` using `server.tool()`.
6. **CLI Layer:** Define command in `src/cli/*.cli.ts` using `commander` (options matching tool args).
7. **Testing:** Add relevant tests (unit, integration, CLI execution).
8. **Documentation:** Update this README and ensure tool/CLI descriptions are accurate.

### Standard Formatting Template for Tools

When documenting new tools, follow our standard template:

```
PURPOSE: What the tool does and its main functionality

WHEN TO USE:
- Primary use case
- Secondary use cases
- When this tool is the best choice

WHEN NOT TO USE:
- When another tool would be better
- Inefficient use cases
- Performance considerations

RETURNS: Description of the output format

EXAMPLES:
- Simple example
- More complex example

ERRORS:
- Common error scenarios and how to resolve them
```

### File Naming Convention

- All utility files are located in `src/utils/` and follow the `kebab-case` pattern: `{feature-name}.{category}.ts`.
- Example: `formatter.util.ts`, `logger.util.ts`.
- Feature-specific files (CLI, Controller, Formatter, Service, Tool, Types) use the pattern `atlassian.{feature}.{layer}.ts` or `vendor.atlassian.{feature}.{layer}.ts` (for services/service-types).
- Subdirectories under `utils/` are not used to keep the structure flat.

## Versioning Note

This project follows semantic versioning independently from other MCP servers in the same family (like the Jira and Confluence MCP servers). Version differences between these projects are expected and reflect their individual development cycles and feature implementations.

## License

[ISC](https://opensource.org/licenses/ISC)
