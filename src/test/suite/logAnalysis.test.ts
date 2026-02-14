import * as assert from 'assert';
import { LogAnalysis } from '../../logAnalysis';
import { Octokit } from '@octokit/rest';
import * as sinon from 'sinon';

suite('LogAnalysis Test Suite', () => {
	let octokitStub: sinon.SinonStubbedInstance<Octokit>;
	let logAnalysis: LogAnalysis;

	setup(() => {
		octokitStub = sinon.createStubInstance(Octokit);
        // Mock the nested actions property
        (octokitStub as any).actions = {
            listJobsForWorkflowRun: sinon.stub(),
            downloadJobLogsForWorkflowRun: sinon.stub()
        };
		logAnalysis = new LogAnalysis(octokitStub as unknown as Octokit);
	});

	test('getFailureContext returns error message from logs', async () => {
        const runId = 123;
        const jobId = 456;
        const logContent = `
2023-10-27T10:00:00.000Z Starting job...
2023-10-27T10:00:01.000Z Run actions/checkout@v3
2023-10-27T10:00:02.000Z Error: Process completed with exit code 1.
2023-10-27T10:00:03.000Z Job failed.
`;

        (octokitStub as any).actions.listJobsForWorkflowRun.resolves({
            data: {
                jobs: [
                    { id: jobId, name: 'build', conclusion: 'failure' }
                ]
            }
        });

        (octokitStub as any).actions.downloadJobLogsForWorkflowRun.resolves({
            data: logContent
        });

		const result = await logAnalysis.getFailureContext('owner', 'repo', runId);
		assert.ok(result.includes('Error: Process completed with exit code 1'));
        assert.ok(result.includes('Job: build'));
	});

    test('getFailureContext handles no failed jobs', async () => {
        (octokitStub as any).actions.listJobsForWorkflowRun.resolves({
            data: {
                jobs: [
                    { id: 1, name: 'build', conclusion: 'success' }
                ]
            }
        });

        const result = await logAnalysis.getFailureContext('owner', 'repo', 123);
        assert.strictEqual(result, 'No failed job found to analyze.');
    });

    test('getFailureContext handles download error', async () => {
         (octokitStub as any).actions.listJobsForWorkflowRun.resolves({
            data: {
                jobs: [
                    { id: 1, name: 'build', conclusion: 'failure' }
                ]
            }
        });

        (octokitStub as any).actions.downloadJobLogsForWorkflowRun.rejects(new Error('API Error'));

        const result = await logAnalysis.getFailureContext('owner', 'repo', 123);
        assert.ok(result.includes('Failed to download logs'));
    });
});
