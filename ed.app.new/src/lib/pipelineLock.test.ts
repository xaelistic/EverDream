import { describe, expect, it } from 'vitest';
import { pipelineIsRunning, releasePipeline, tryAcquirePipeline, withPipelineLock } from './pipelineLock';

describe('pipelineLock', () => {
  it('allows one runner per dream', async () => {
    const id = 'dream-lock-1';
    expect(tryAcquirePipeline(id)).toBe(true);
    expect(pipelineIsRunning(id)).toBe(true);
    expect(tryAcquirePipeline(id)).toBe(false);
    expect(await withPipelineLock(id, async () => 'second')).toBeNull();
    releasePipeline(id);
    expect(pipelineIsRunning(id)).toBe(false);
    expect(await withPipelineLock(id, async () => 'ok')).toBe('ok');
  });
});
