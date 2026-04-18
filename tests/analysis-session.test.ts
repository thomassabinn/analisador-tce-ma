import { describe, expect, it } from 'vitest';

import { getAnalysisSessionPlan } from '../utils/analysisSession';

describe('getAnalysisSessionPlan', () => {
  it('persists analysis results into the temporary session instead of the previous one', () => {
    expect(
      getAnalysisSessionPlan({
        previousSessionId: 'existing-session',
        tempSessionId: 'temp-session',
        queueLength: 3,
      })
    ).toEqual({
      sessionIdToSave: 'temp-session',
      shouldLoadSession: false,
    });
  });

  it('loads the session after the last file in the queue finishes', () => {
    expect(
      getAnalysisSessionPlan({
        previousSessionId: 'existing-session',
        tempSessionId: 'temp-session',
        queueLength: 1,
      })
    ).toEqual({
      sessionIdToSave: 'temp-session',
      shouldLoadSession: true,
    });
  });

  it('keeps the current behavior of loading immediately when analysis starts without an active session', () => {
    expect(
      getAnalysisSessionPlan({
        previousSessionId: null,
        tempSessionId: 'temp-session',
        queueLength: 4,
      })
    ).toEqual({
      sessionIdToSave: 'temp-session',
      shouldLoadSession: true,
    });
  });
});
