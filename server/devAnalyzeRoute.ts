type AnalyzeResponse = {
  body: string;
  contentType: string;
  status: number;
};

type AnalyzeHandlerModule = {
  handleAnalyzeRequest: (body: unknown) => Promise<AnalyzeResponse>;
};

export const processDevAnalyzeRequest = async ({
  rawBody,
  loadHandler,
}: {
  rawBody: string;
  loadHandler: () => Promise<AnalyzeHandlerModule>;
}): Promise<AnalyzeResponse> => {
  try {
    const parsedBody = rawBody ? JSON.parse(rawBody) : null;
    const { handleAnalyzeRequest } = await loadHandler();
    return handleAnalyzeRequest(parsedBody);
  } catch {
    return {
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Corpo da requisição inválido.' }),
    };
  }
};
