# Atlassian Jira MCP Server

## About

This project is a customizable Model Context Protocol (MCP) server written in TypeScript, designed to extend AI assistants like Claude or Cursor with access to Atlassian Jira data. MCP is an open-source protocol by Anthropic for connecting AI systems to external capabilities securely and efficiently. For more details on MCP, see [https://modelcontextprotocol.io/docs/](https://modelcontextprotocol.io/docs/). This server allows AI assistants to access projects and issues directly from your organization's Jira instance.

## Project Features

- **MCP Server**: Exposes Jira tools and resources to AI clients (e.g., Claude Desktop, Cursor AI) via STDIO or HTTP.
- **Jira Integration**: Access projects and issues from your Jira instance.
- **CLI Support**: Run Jira queries directly from the command line without an AI client.
- **Flexible Configuration**: Supports direct environment variables for quick use or a global config file at `$HOME/.mcp/configs.json` for managing multiple servers.
- **Development Tools**: Built-in MCP Inspector for debugging, plus testing and linting utilities.

### Available Tools

- **`list-projects`**: Get a list of all available Jira projects with optional filtering.
- **`get-project`**: Retrieve detailed information about a specific project by ID or key.
- **`list-issues`**: List issues with optional JQL filtering.
- **`get-issue`**: Retrieve detailed information about a specific issue by ID or key.

## User Guide

### Configuration Options

- **DEBUG**: Set to `true` for detailed logging (default: `false`).
- **ATLASSIAN_SITE_NAME**: Your Atlassian site name (e.g., `your-instance` for `your-instance.atlassian.net`) – required.
- **ATLASSIAN_USER_EMAIL**: Your Atlassian account email address – required.
- **ATLASSIAN_API_TOKEN**: API token for Atlassian API access – required.

#### Method 1: Environment Variables

Pass configs directly when running:

```bash
DEBUG=true ATLASSIAN_SITE_NAME=your-instance ATLASSIAN_USER_EMAIL=your-email@example.com ATLASSIAN_API_TOKEN=your_token npx -y @aashari/mcp-server-atlassian-jira
```

#### Method 2: Global Config File (Recommended)

Create `$HOME/.mcp/configs.json`:

```json
{
	"@aashari/mcp-server-atlassian-jira": {
		"environments": {
			"DEBUG": "true",
			"ATLASSIAN_SITE_NAME": "your-instance",
			"ATLASSIAN_USER_EMAIL": "your-email@example.com",
			"ATLASSIAN_API_TOKEN": "your_api_token"
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
	"@aashari/mcp-server-atlassian-jira": {
		"environments": {
			"DEBUG": "true",
			"ATLASSIAN_SITE_NAME": "your-instance",
			"ATLASSIAN_USER_EMAIL": "your-email@example.com",
			"ATLASSIAN_API_TOKEN": "your_api_token"
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
        		"aashari/mcp-server-atlassian-jira": {
        			"command": "npx",
        			"args": ["-y", "@aashari/mcp-server-atlassian-jira"]
        		}
        	}
        }
        ```
    - Or configure directly:
        ```json
        {
        	"mcpServers": {
        		"aashari/mcp-server-atlassian-jira": {
        			"command": "npx",
        			"args": [
        				"-y",
        				"DEBUG=true",
        				"ATLASSIAN_SITE_NAME=your-instance",
        				"ATLASSIAN_USER_EMAIL=your-email@example.com",
        				"ATLASSIAN_API_TOKEN=your_token",
        				"@aashari/mcp-server-atlassian-jira"
        			]
        		}
        	}
        }
        ```
4. **Restart**: Close and reopen Claude Desktop.
5. **Test**: Click the hammer icon, verify Jira tools are listed, then ask: "List my Jira projects" or "Show me details for issue PROJ-123."

### Using with Cursor AI

1. **Open Settings**:
    - Launch Cursor, press `CMD + SHIFT + P` (or `CTRL + SHIFT + P`), select "Cursor Settings" > "MCP".
2. **Add Server**:
    - Click "+ Add new MCP server".
    - **Name**: `aashari/mcp-server-atlassian-jira`.
    - **Type**: `command`.
    - **Command**:
        - Global config: `npx -y @aashari/mcp-server-atlassian-jira`.
        - Direct: `DEBUG=true ATLASSIAN_SITE_NAME=your-instance ATLASSIAN_USER_EMAIL=your-email@example.com ATLASSIAN_API_TOKEN=your_token npx -y @aashari/mcp-server-atlassian-jira`.
    - Click "Add".
3. **Verify**: Check for a green indicator and Jira tools listed.
4. **Test**: In Agent mode, ask: "Show me open issues in project X" or "Get details for ticket PROJ-456."

### Using as a CLI Tool

Run without installation:

```bash
# Help
npx -y @aashari/mcp-server-atlassian-jira -- --help
# List projects
npx -y @aashari/mcp-server-atlassian-jira -- list-projects
# Get project details
npx -y @aashari/mcp-server-atlassian-jira -- get-project PROJ
# List issues with JQL
npx -y @aashari/mcp-server-atlassian-jira -- list-issues --jql "project = PROJ AND status = Open"
# Get issue details
npx -y @aashari/mcp-server-atlassian-jira -- get-issue PROJ-123
```

Or install globally:

```bash
npm install -g @aashari/mcp-server-atlassian-jira
```

Then run:

```bash
# Help
mcp-jira --help
# List projects with optional filtering
mcp-jira list-projects --limit 10
# Get a project by ID or key
mcp-jira get-project PROJ
# List issues with optional JQL filtering
mcp-jira list-issues --jql "project = PROJ AND status = Open" --limit 10
# Get an issue by ID or key
mcp-jira get-issue PROJ-123
```

Use the global config file or prefix with environment variables:

```bash
DEBUG=true ATLASSIAN_SITE_NAME=your-instance ATLASSIAN_USER_EMAIL=your-email@example.com ATLASSIAN_API_TOKEN=your_token mcp-jira list-projects
```

## Developer Guide

### Extending the Project

To add custom tools or resources:

1. **Services**: Add API/data logic in `src/services`.
2. **Controllers**: Implement business logic in `src/controllers`.
3. **Tools**: Define new tools in `src/tools`.
4. **Resources**: Add data sources in `src/resources`.
5. **Register**: Update `src/index.ts` with your tools/resources.

### Development Tools

```bash
# Run with live reload
npm run dev
# Test
npm run test
# Test coverage
npm run test:coverage
# Lint
npm run lint
# Format
npm run format
```

### MCP Inspector

Debug visually:

```bash
# Start inspector
npm run inspect
# With debug logs
npm run inspect:debug
```

When you run the inspector:

1. The Inspector starts your MCP server.
2. It launches a web UI (typically at `http://localhost:5173`).
3. Use the UI to test Jira tools, view requests/responses, and check errors.

## License

[ISC](https://opensource.org/licenses/ISC)
