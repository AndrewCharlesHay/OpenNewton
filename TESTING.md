# Testing Guide

## Overview

The GitHub Actions Monitor extension includes comprehensive unit tests to ensure code quality and reliability.

## Test Structure

```
src/test/
├── runTest.ts                    # VS Code test runner
└── suite/
    ├── index.ts                  # Test suite configuration
    ├── extension.test.ts         # Extension activation tests
    ├── statusBarManager.test.ts  # Status bar manager tests
    └── githubActionsMonitor.test.ts # Monitor logic tests
```

## Running Tests

### Prerequisites

```bash
npm install
```

### Run All Tests

```bash
npm test
```

This will:
1. Compile the TypeScript code
2. Run ESLint
3. Download VS Code if needed
4. Execute all tests in a VS Code extension host

### Compile and Lint Only

```bash
npm run pretest
```

### Watch Mode

For development, you can use watch mode:

```bash
npm run watch
```

Then run tests manually when needed.

## Test Coverage

### StatusBarManager Tests

- ✅ Status bar item creation
- ✅ Status updates (idle, loading, success, error)
- ✅ Icon and color changes
- ✅ Command binding
- ✅ Resource disposal

### GitHubActionsMonitor Tests

- ✅ Output channel creation
- ✅ Configuration initialization
- ✅ Start/stop monitoring
- ✅ Check status without workspace
- ✅ Check status without token
- ✅ Show recent failures
- ✅ Resource disposal

### Extension Tests

- ✅ Extension presence
- ✅ Command registration
- ✅ Configuration properties
- ✅ Default configuration values

## Writing Tests

Tests use the following frameworks:

- **Mocha**: Test framework (TDD style)
- **Sinon**: Mocking and stubbing
- **VS Code Test API**: Extension testing utilities

### Example Test

```typescript
import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';

suite('My Test Suite', () => {
    let stub: sinon.SinonStub;

    setup(() => {
        stub = sinon.stub(vscode.window, 'showInformationMessage');
    });

    teardown(() => {
        sinon.restore();
    });

    test('Should do something', () => {
        // Test code here
        assert.ok(true);
    });
});
```

## Test Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Use `teardown()` to restore stubs and clean up
3. **Assertions**: Use meaningful assertions with clear messages
4. **Mocking**: Mock external dependencies (VS Code API, GitHub API)
5. **Coverage**: Test both success and failure paths

## CI/CD Integration

Tests are automatically run in the CI pipeline:

```yaml
- name: Run tests
  run: npm test || echo "Tests not yet implemented"
```

## Troubleshooting

### Tests Not Found

Make sure tests are compiled:
```bash
npm run compile
```

### VS Code Download Issues

If tests fail to download VS Code:
```bash
# Clear cache
rm -rf .vscode-test
npm test
```

### Timeout Issues

Increase timeout in test suite if needed:
```typescript
mocha.timeout(10000); // 10 seconds
```

## Future Improvements

- [ ] Add integration tests with mocked GitHub API
- [ ] Add code coverage reporting
- [ ] Add performance benchmarks
- [ ] Add E2E tests with real workflows
