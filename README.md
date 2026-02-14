# OpenNewton - GitHub Actions Monitor

A VS Code extension that monitors GitHub Actions workflows and notifies you when builds fail, providing detailed context about failures to help you debug faster.

## Features

- **🔍 Automatic Monitoring**: Continuously monitors your GitHub repository's workflow runs
- **🔔 Instant Notifications**: Get notified immediately when workflows fail
- **📊 Detailed Failure Context**: View detailed information about failed jobs and steps
- **📝 Coding Agent Integration**: Failures are logged to an output channel for easy access by coding agents
- **⚡ Status Bar Integration**: See your build status at a glance
- **🎯 Quick Access**: Command palette commands for manual checks and configuration

## Installation

### From Source

1. Clone this repository
2. Run `npm install` to install dependencies
3. Run `npm run compile` to build the extension
4. Press F5 in VS Code to run the extension in development mode

### Building VSIX Package

```bash
npm install -g vsce
vsce package
```

Then install the generated `.vsix` file in VS Code.

## Configuration

### GitHub Personal Access Token

To monitor private repositories or increase API rate limits, you'll need a GitHub Personal Access Token:

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token" (classic)
3. Select the following scopes:
   - `repo` (for private repositories)
   - `workflow` (to access GitHub Actions)
4. Copy the generated token
5. In VS Code, run the command `GitHub Actions: Configure` and paste your token

### Settings

Access settings via File → Preferences → Settings, then search for "GitHub Actions Monitor":

- **`githubActionsMonitor.token`**: Your GitHub Personal Access Token
- **`githubActionsMonitor.pollInterval`**: How often to check for updates (in seconds, default: 300)
- **`githubActionsMonitor.enabled`**: Enable/disable automatic monitoring
- **`githubActionsMonitor.notifyOnFailure`**: Show notifications when workflows fail

## Usage

### Commands

Access these commands via the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`):

- **GitHub Actions: Check Status** - Manually check the current status of your workflows
- **GitHub Actions: Configure** - Set up your GitHub token
- **GitHub Actions: Show Recent Failures** - View a list of recent workflow failures

### Status Bar

The extension adds a status bar item that shows:
- ✓ Green checkmark when all workflows are passing
- ✗ Red X when workflows are failing
- ⟳ Spinning sync icon when checking status
- Click the status bar item to manually refresh

### Notifications

When a workflow fails, you'll see a notification with options to:
- **View Details**: Opens a detailed view of the failure in VS Code
- **Open in Browser**: Opens the workflow run in GitHub

### Output Channel

All failures are logged to the "GitHub Actions Failures" output channel, which can be accessed by:
1. Opening the Output panel (View → Output)
2. Selecting "GitHub Actions Failures" from the dropdown

This makes it easy for coding agents and automation tools to access failure information.

## How It Works

1. **Repository Detection**: The extension uses VS Code's Git integration to detect the GitHub repository in your workspace
2. **Periodic Polling**: Based on your configured interval, the extension queries the GitHub API for workflow runs
3. **Failure Detection**: When a new failure is detected (based on workflow run IDs), it triggers a notification
4. **Detailed Analysis**: The extension fetches job details and failed steps to provide comprehensive context
5. **Persistent Logging**: All failures are logged to an output channel for historical reference and agent access

## For Coding Agents

This extension is designed to work seamlessly with coding agents like GitHub Copilot. When a workflow fails:

1. A detailed message is written to the "GitHub Actions Failures" output channel
2. The message includes:
   - Workflow name and status
   - Branch and commit information
   - List of failed jobs and steps
   - Links to detailed logs

Coding agents can monitor this output channel to automatically receive context about build failures.

## Development

### Prerequisites

- Node.js 20.x or later
- VS Code 1.80.0 or later

### Building

```bash
npm install
npm run compile
```

### Linting

```bash
npm run lint
```

### Testing

```bash
npm test
```

## Architecture

The extension consists of three main components:

1. **extension.ts**: Entry point that registers commands and initializes the monitor
2. **githubActionsMonitor.ts**: Core monitoring logic that interfaces with GitHub API
3. **statusBarManager.ts**: Manages the status bar item and its visual states

## Troubleshooting

### "No GitHub repository detected"

Make sure you have:
- Opened a folder that contains a Git repository
- The repository has a GitHub remote configured
- VS Code's Git extension is enabled

### "GitHub token not configured"

Run the `GitHub Actions: Configure` command and enter your GitHub Personal Access Token.

### Rate Limiting

Without authentication, GitHub's API allows 60 requests per hour. With authentication, this increases to 5,000 requests per hour. Configure a token to avoid rate limiting.

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

See LICENSE file for details.