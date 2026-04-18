type AnalysisSessionPlanInput = {
  previousSessionId: string | null;
  tempSessionId: string;
  queueLength: number;
};

type AnalysisSessionPlan = {
  sessionIdToSave: string;
  shouldLoadSession: boolean;
};

export const getAnalysisSessionPlan = ({
  previousSessionId,
  tempSessionId,
  queueLength,
}: AnalysisSessionPlanInput): AnalysisSessionPlan => {
  return {
    sessionIdToSave: tempSessionId,
    shouldLoadSession: queueLength === 1 || previousSessionId === null,
  };
};
