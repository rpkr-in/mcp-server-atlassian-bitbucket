# Atlassian Bitbucket MCP Server

## About

This project is a customizable Model Context Protocol (MCP) server written in TypeScript, designed to extend AI assistants like Claude or Cursor with access to Atlassian Bitbucket data. MCP is an open-source protocol by Anthropic for connecting AI systems to external capabilities securely and efficiently. For more details on MCP, see [https://modelcontextprotocol.io/docs/](https://modelcontextprotocol.io/docs/). This server allows AI assistants to access repositories, pull requests, and commits directly from your organization's Bitbucket instance.

## Project Features

- **MCP Server**: Exposes Bitbucket tools and resources to AI clients (e.g., Claude Desktop, Cursor AI) via STDIO or HTTP.
- **Bitbucket Integration**: Access repositories, pull requests, and commit information from your Bitbucket instance.
- **CLI Support**: Run Bitbucket queries directly from the command line without an AI client.
- **Flexible Configuration**: Supports direct environment variables for quick use or a global config file at `$HOME/.mcp/configs.json` for managing multiple servers.
- **Development Tools**: Built-in MCP Inspector for debugging, plus testing and linting utilities.

### Available Tools

- **`list-repositories`**: Get a list of all available Bitbucket repositories with optional filtering.
- **`get-repository`**: Retrieve detailed information about a specific repository by ID or slug.
- **`list-pull-requests`**: List pull requests with optional filtering.
- **`get-pull-request`**: Retrieve detailed information about a specific pull request by ID.

## User Guide

### Configuration Options

This server supports two authentication methods for connecting to Atlassian Bitbucket: standard Atlassian credentials or Bitbucket-specific credentials. You can use either method, depending on your preferences and access rights.

#### Option 1: Standard Atlassian Credentials (Compatible with other Atlassian MCP servers)

- **DEBUG**: Set to `true` for detailed logging (default: `false`).
- **ATLASSIAN_SITE_NAME**: Your Atlassian site name (e.g., `your-instance` for `your-instance.atlassian.net`).
- **ATLASSIAN_USER_EMAIL**: Your Atlassian account email address.
- **ATLASSIAN_API_TOKEN**: API token for Atlassian API access.

#### Option 2: Bitbucket-Specific Credentials

- **DEBUG**: Set to `true` for detailed logging (default: `false`).
- **ATLASSIAN_BITBUCKET_USERNAME**: Your Bitbucket username.
- **ATLASSIAN_BITBUCKET_APP_PASSWORD**: Your Bitbucket app password (create one in your Bitbucket account settings with appropriate permissions).

The server checks for standard Atlassian credentials first. If those aren't found, it falls back to Bitbucket-specific credentials. You only need to provide one set of credentials.

#### Method 1: Environment Variables

Pass configs directly when running:

```bash
# Using standard Atlassian credentials
DEBUG=true ATLASSIAN_SITE_NAME=your-instance ATLASSIAN_USER_EMAIL=your-email@example.com ATLASSIAN_API_TOKEN=your_token npx -y @aashari/mcp-server-atlassian-bitbucket

# Or using Bitbucket-specific credentials
DEBUG=true ATLASSIAN_BITBUCKET_USERNAME=your-username ATLASSIAN_BITBUCKET_APP_PASSWORD=your_app_password npx -y @aashari/mcp-server-atlassian-bitbucket
```

#### Method 2: Global Config File (Recommended)

Create `$HOME/.mcp/configs.json`:

```json
{
	"@aashari/mcp-server-atlassian-bitbucket": {
		"environments": {
			"DEBUG": "true",
			"ATLASSIAN_SITE_NAME": "your-instance",
			"ATLASSIAN_USER_EMAIL": "your-email@example.com",
			"ATLASSIAN_API_TOKEN": "your_api_token"
		}
	}
}
```

Or with Bitbucket-specific credentials:

```json
{
	"@aashari/mcp-server-atlassian-bitbucket": {
		"environments": {
			"DEBUG": "true",
			"ATLASSIAN_BITBUCKET_USERNAME": "your-username",
			"ATLASSIAN_BITBUCKET_APP_PASSWORD": "your_app_password"
		}
	}
}
```

You can also configure multiple MCP servers in the same file:

```json
{
	"@aashari/boilerplate-mcp-server": {
		"environments": {
			"DEBUG": "true",
			"IPAPI_API_TOKEN": "your_token"
		}
	},
	"@aashari/mcp-server-atlassian-confluence": {
		"environments": {
			"DEBUG": "true",
			"ATLASSIAN_SITE_NAME": "your-instance",
			"ATLASSIAN_USER_EMAIL": "your-email@example.com",
			"ATLASSIAN_API_TOKEN": "your_api_token"
		}
	},
	"@aashari/mcp-server-atlassian-bitbucket": {
		"environments": {
			"DEBUG": "true",
			"ATLASSIAN_BITBUCKET_USERNAME": "your-username",
			"ATLASSIAN_BITBUCKET_APP_PASSWORD": "your_app_password"
		}
	}
}
```

### Using with Claude Desktop

1. **Open Settings**:
    - Launch Claude Desktop, click the gear icon (top-right).
2. **Edit Config**:
    - Click "Edit Config" to open `claude_desktop_config.json` (e.g., `~/Library/Application Support/Claude` on macOS or `%APPDATA%\Claude` on Windows).
3. **Add Server**:
    - Use the global config file (recommended):
        ```json
        {
        	"mcpServers": {
        		"aashari/mcp-server-atlassian-bitbucket": {
        			"command": "npx",
        			"args": ["-y", "@aashari/mcp-server-atlassian-bitbucket"]
        		}
        	}
        }
        ```
    - Or configure directly with standard Atlassian credentials:
        ```json
        {
        	"mcpServers": {
        		"aashari/mcp-server-atlassian-bitbucket": {
        			"command": "npx",
        			"args": [
        				"-y",
        				"DEBUG=true",
        				"ATLASSIAN_SITE_NAME=your-instance",
        				"ATLASSIAN_USER_EMAIL=your-email@example.com",
        				"ATLASSIAN_API_TOKEN=your_token",
        				"@aashari/mcp-server-atlassian-bitbucket"
        			]
        		}
        	}
        }
        ```
    - Or with Bitbucket-specific credentials:
        ```json
        {
        	"mcpServers": {
        		"aashari/mcp-server-atlassian-bitbucket": {
        			"command": "npx",
        			"args": [
        				"-y",
        				"DEBUG=true",
        				"ATLASSIAN_BITBUCKET_USERNAME=your-username",
        				"ATLASSIAN_BITBUCKET_APP_PASSWORD=your_app_password",
        				"@aashari/mcp-server-atlassian-bitbucket"
        			]
        		}
        	}
        }
        ```
4. **Restart**: Close and reopen Claude Desktop.
5. **Test**: Click the hammer icon, verify Bitbucket tools are listed, then ask: "List my Bitbucket repositories" or "Show me the latest pull requests."

### Using with Cursor AI

1. **Open Settings**:
    - Launch Cursor, press `CMD + SHIFT + P` (or `CTRL + SHIFT + P`), select "Cursor Settings" > "MCP".
2. **Add Server**:
    - Click "+ Add new MCP server".
    - **Name**: `aashari/mcp-server-atlassian-bitbucket`.
    - **Type**: `command`.
    - **Command** (choose one of the following):
        - Global config: `npx -y @aashari/mcp-server-atlassian-bitbucket`.
        - With standard Atlassian credentials: `DEBUG=true ATLASSIAN_SITE_NAME=your-instance ATLASSIAN_USER_EMAIL=your-email@example.com ATLASSIAN_API_TOKEN=your_token npx -y @aashari/mcp-server-atlassian-bitbucket`.
        - With Bitbucket-specific credentials: `DEBUG=true ATLASSIAN_BITBUCKET_USERNAME=your-username ATLASSIAN_BITBUCKET_APP_PASSWORD=your_app_password npx -y @aashari/mcp-server-atlassian-bitbucket`.
    - Click "Add".
3. **Verify**: Check for a green indicator and Bitbucket tools listed.
4. **Test**: In Agent mode, ask: "Show me all open pull requests" or "Get details for repository X."

### Using as a CLI Tool

Run without installation:

```bash
# Help
npx -y @aashari/mcp-server-atlassian-bitbucket -- --help
# List repositories
npx -y @aashari/mcp-server-atlassian-bitbucket -- list-repositories
# Get repository details
npx -y @aashari/mcp-server-atlassian-bitbucket -- get-repository my-project/my-repo
# List pull requests with filtering
npx -y @aashari/mcp-server-atlassian-bitbucket -- list-pull-requests --state OPEN
# Get pull request details
npx -y @aashari/mcp-server-atlassian-bitbucket -- get-pull-request 123
```

Or install globally:

```bash
npm install -g @aashari/mcp-server-atlassian-bitbucket
```

Then run:

```bash
# Help
mcp-bitbucket --help
# List repositories with optional filtering
mcp-bitbucket list-repositories --limit 10
# Get a repository by ID or slug
mcp-bitbucket get-repository my-project/my-repo
# List pull requests with optional filtering
mcp-bitbucket list-pull-requests --state OPEN --limit 10
# Get a pull request by ID
mcp-bitbucket get-pull-request 123
```

Use the global config file or prefix with environment variables:

```bash
# Using standard Atlassian credentials
DEBUG=true ATLASSIAN_SITE_NAME=your-instance ATLASSIAN_USER_EMAIL=your-email@example.com ATLASSIAN_API_TOKEN=your_token mcp-bitbucket list-repositories

# Or using Bitbucket-specific credentials
DEBUG=true ATLASSIAN_BITBUCKET_USERNAME=your-username ATLASSIAN_BITBUCKET_APP_PASSWORD=your_app_password mcp-bitbucket list-repositories
```

## Developer Guide

### Development Scripts

The project includes several scripts for development and production use:

- **`npm run dev:server`**: Run the server in development mode with MCP Inspector and debug logging.
- **`npm run dev:cli`**: Run CLI commands in development mode with debug logging.
- **`npm run start:server`**: Run the server in production mode with MCP Inspector.
- **`npm run start:cli`**: Run CLI commands in production mode.

Example usage:

```bash
# Start the server with Inspector and debug logging
npm run dev:server

# Run a CLI command with debug logging
npm run dev:cli -- list-repositories

# Start the server with Inspector (no debug)
npm run start:server

# Run a CLI command (no debug)
npm run start:cli -- list-pull-requests --state OPEN
```

### Extending the Project

To add custom tools or resources:

1. **Services**: Add API/data logic in `src/services`.
2. **Controllers**: Implement business logic in `src/controllers`.
3. **Tools**: Define new tools in `src/tools`.
4. **Resources**: Add data sources in `src/resources`.
5. **Register**: Update `src/index.ts` with your tools/resources.

### Additional Development Tools

```bash
# Run tests
npm test
# Test coverage
npm run test:coverage
# Lint
npm run lint
# Format
npm run format
```

### MCP Inspector

The MCP Inspector provides a visual interface for debugging and testing your MCP server:

1. The Inspector starts your MCP server.
2. It launches a web UI (typically at `http://localhost:5173`).
3. Use the UI to test Bitbucket tools, view requests/responses, and check errors.

## Versioning Note

This project follows semantic versioning independently from other MCP servers in the same family (like the Confluence MCP server). Version differences between these projects are expected and reflect their individual development cycles and feature implementations.

## License

[ISC](https://opensource.org/licenses/ISC)
