# Atlassian Jira MCP Server

[![smithery badge](https://smithery.ai/badge/@aashari/boilerplate-mcp-server)](https://smithery.ai/server/@aashari/boilerplate-mcp-server)

## About MCP

The Model Context Protocol (MCP) is an open standard developed by Anthropic to simplify how AI systems connect to external data sources and tools. This implementation provides an MCP server for connecting Claude Desktop and other MCP-compatible AI systems to Atlassian Jira.

## Overview

A TypeScript-based Model Context Protocol (MCP) server for integrating with Atlassian Jira. This server provides tools for accessing Jira projects and issues, allowing Claude/Anthropic AI systems to retrieve information directly from your organization's Jira instance.

## Configuration Options

Before setting up with any integration method, you should understand the available configuration options:

### Available Configuration Options

- **DEBUG**: Set to `true` to enable debug logging.
- **ATLASSIAN_SITE_NAME**: Your Atlassian site name, e.g., 'your-instance' for 'your-instance.atlassian.net' (required)
- **ATLASSIAN_USER_EMAIL**: Your Atlassian account email address (required)
- **ATLASSIAN_API_TOKEN**: API token for Atlassian API access (required)

### Configuration Methods

You can configure the server in two ways:

#### Option 1: Direct Configuration (Environment Variables)

Pass configuration directly as environment variables before the start command:

```bash
DEBUG=true ATLASSIAN_SITE_NAME=your-instance ATLASSIAN_USER_EMAIL=your-email@example.com ATLASSIAN_API_TOKEN=your_token npx -y @aashari/mcp-server-atlassian-jira
```

#### Option 2: Global Configuration File (Recommended)

Create a global configuration file at `$HOME/.mcp/configs.json`:

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

This approach keeps your configuration in one secure location and simplifies your AI assistant setup.

## Setting Up with Claude Desktop

To use this Jira MCP server with Claude Desktop:

1. **Open Claude Desktop Settings**:

    - Launch Claude Desktop
    - Click on the settings icon (gear) in the top-right corner

2. **Edit MCP Configuration**:

    - Click on "Edit Config" button
    - This will open File Explorer/Finder with the `claude_desktop_config.json` file

3. **Update Configuration File**:

    - Add configuration using one of the methods below
    - Save the file

    #### Method 1: Using Global Configuration File (Recommended)

    First, create the global config file as described in the "Configuration Options" section above, then use this simplified configuration:

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

    #### Method 2: Direct Configuration in Claude Desktop

    Pass configuration directly in the Claude Desktop config:

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
    				"ATLASSIAN_API_TOKEN=your_api_token",
    				"@aashari/mcp-server-atlassian-jira"
    			]
    		}
    	}
    }
    ```

4. **Restart Claude Desktop**:

    - Close and reopen Claude Desktop to apply the changes

5. **Verify Tool Availability**:

    - On the Claude home page, look for the hammer icon on the right side
    - Click it to see available tools
    - Ensure the Jira tools are listed

6. **Test the Tool**:
    - Try asking Claude: "list projects in Jira" or "get details for issue PROJ-123"
    - Claude will use the MCP tool to fetch and display the requested information from your Jira instance

## Setting Up with Cursor AI

To use this MCP server with Cursor AI:

1. **Open Cursor Settings**:

    - Launch Cursor
    - Press `CMD + SHIFT + P` (or `CTRL + SHIFT + P` on Windows)
    - Type "settings" and select "Cursor Settings"
    - On the sidebar, select "MCP"

2. **Add New MCP Server**:

    - Click "+ Add new MCP server"
    - A configuration form will appear

3. **Configure MCP Server**:

    - **Name**: Enter `aashari/mcp-server-atlassian-jira`
    - **Type**: Select `command` from the dropdown
    - **Command**: Choose one of the following configuration methods:

    #### Method 1: Using Global Configuration File (Recommended)

    First, create the global config file at `$HOME/.mcp/configs.json` as described in the "Configuration Options" section, then use this command:

    ```
    npx -y @aashari/mcp-server-atlassian-jira
    ```

    #### Method 2: Direct Configuration with Environment Variables

    Pass configuration directly in the command:

    ```
    DEBUG=true ATLASSIAN_SITE_NAME=your-instance ATLASSIAN_USER_EMAIL=your-email@example.com ATLASSIAN_API_TOKEN=your_token npx -y @aashari/mcp-server-atlassian-jira
    ```

    - Click "Add"

4. **Verify Server Configuration**:

    - The server should now be listed with a green indicator
    - You should see the Jira tools listed under the server

5. **Test the Tool**:
    - In the chat sidebar, ensure Agent mode is active
    - Try asking: "list projects in Jira" or "get details for issue PROJ-123"
    - Cursor AI will use the MCP tool to fetch and display the requested information from your Jira instance

## Using as a CLI Tool

This package can also be used as a command-line tool:

### Global Installation

You can install this package globally to use as a CLI tool:

```bash
npm install -g @aashari/mcp-server-atlassian-jira
```

After global installation, you can run the CLI commands directly:

```bash
# Get help
mcp-jira --help

# List projects with optional filtering
mcp-jira list-projects --limit 10

# Get a specific project by ID or key
mcp-jira get-project PROJ

# List issues with optional JQL filtering
mcp-jira list-issues --jql "project = PROJ AND status = Open" --limit 10

# Get a specific issue by ID or key
mcp-jira get-issue PROJ-123
```

### CLI Configuration

The CLI tool uses the same configuration options as the MCP server:

#### Method 1: Using Global Configuration File (Recommended)

Create a global configuration file at `$HOME/.mcp/configs.json` as described above.

#### Method 2: Direct Environment Variables

Run commands with environment variables:

```bash
DEBUG=true ATLASSIAN_SITE_NAME=your-instance ATLASSIAN_USER_EMAIL=your-email@example.com ATLASSIAN_API_TOKEN=your_token mcp-jira list-projects
```

## Core Features

- **STDIO MCP Server**: Designed for AI clients like Claude Desktop, providing Jira tools and resources via the Model Context Protocol.
- **CLI Support**: Human-friendly command-line interface for the same functionality, making it easy to test and use directly.
- **Jira Integration**: Two main modules for comprehensive Jira access:
    - **Projects**: List and retrieve detailed information about Jira projects.
    - **Issues**: Access and retrieve issue details with powerful JQL filtering.
- **Flexible Configuration**: Support for environment variables, .env files, and global config files.
- **Testing & Development Tools**: Built-in inspection, testing, and development utilities.

## Available Tools

### Jira Projects

- **list_projects**: List Jira projects with filtering options and pagination support.
- **get_project**: Get detailed information about a specific Jira project by ID or key.

### Jira Issues

- **list_issues**: List Jira issues with JQL filtering and pagination.
- **get_issue**: Get detailed information about a specific Jira issue by ID or key.

## For Developers

### MCP Inspector Usage

This project includes integration with MCP Inspector for easy debugging and testing:

```bash
# Launch the MCP Inspector with your server
npm run inspect

# Launch with debug mode enabled
npm run inspect:debug
```

When you run the inspector:

1. The Inspector will start your MCP server
2. It will launch a web UI (typically at http://localhost:5173)
3. You can use the UI to interact with your server and test its functionality

The inspector provides a visual way to see:

- Your server's tools and resources
- The requests and responses between client and server
- Any errors that occur during communication

## Extending This Project

To add your own tools and resources:

1. Create service files in the `src/services` directory
2. Implement controllers in `src/controllers`
3. Create tool implementations in `src/tools`
4. Register your new tools in `src/index.ts`

## Developer Tools

This project includes several scripts to make development easier:

```bash
# Run tests
npm test

# Check test coverage
npm run test:coverage

# Run linting
npm run lint

# Format code
npm run format

# Build the project
npm run build

# Start the server
npm start

# Run development mode with auto-reload
npm run dev
```

## License

[ISC](https://opensource.org/licenses/ISC)
