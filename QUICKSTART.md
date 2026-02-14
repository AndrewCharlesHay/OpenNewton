# Quick Start Guide

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/AndrewCharlesHay/OpenNewton.git
   cd OpenNewton
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Compile the extension:
   ```bash
   npm run compile
   ```

## Running the Extension

### In Development Mode

1. Open the project in VS Code
2. Press `F5` to launch a new VS Code window with the extension loaded
3. The extension will automatically start monitoring GitHub Actions

### Building a VSIX Package

1. Install vsce (VS Code Extension CLI):
   ```bash
   npm install -g @vscode/vsce
   ```

2. Package the extension:
   ```bash
   vsce package
   ```

3. Install the `.vsix` file:
   - In VS Code, go to Extensions view
   - Click the "..." menu
   - Select "Install from VSIX..."
   - Choose the generated `.vsix` file

## First Time Setup

1. Open a GitHub repository in VS Code
2. Run command: `GitHub Actions: Configure`
3. Enter your GitHub Personal Access Token
4. The extension will start monitoring automatically

## GitHub Token Setup

To create a GitHub Personal Access Token:

1. Go to https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Give it a descriptive name (e.g., "VS Code GitHub Actions Monitor")
4. Select scopes:
   - `repo` - Full control of private repositories
   - `workflow` - Update GitHub Action workflows
5. Click "Generate token"
6. Copy the token (you won't see it again!)
7. Paste it when running `GitHub Actions: Configure` in VS Code

## Usage Examples

### Manual Status Check
```
Cmd/Ctrl + Shift + P → "GitHub Actions: Check Status"
```

### View Recent Failures
```
Cmd/Ctrl + Shift + P → "GitHub Actions: Show Recent Failures"
```

### Check Status Bar
Look at the bottom-left status bar for build status:
- ✓ All checks passing
- ✗ Build failing
- ⟳ Checking...

## Troubleshooting

### Extension Not Activating
- Make sure you have a Git repository open
- Check that the repository has a GitHub remote

### No Notifications
- Verify your GitHub token is configured
- Check that `githubActionsMonitor.enabled` is `true` in settings
- Check that `githubActionsMonitor.notifyOnFailure` is `true` in settings

### Rate Limiting
- Use a GitHub token to get 5,000 requests/hour instead of 60
- Increase the `pollInterval` setting to check less frequently

## Development

### Watch Mode
For active development:
```bash
npm run watch
```

This will automatically recompile when you make changes.

### Debugging
1. Open the project in VS Code
2. Set breakpoints in the TypeScript files
3. Press `F5` to start debugging
4. The debugger will attach to the extension host

## Next Steps

- Read the full README.md for detailed documentation
- Check out the configuration options
- Explore the source code in the `src/` directory
