import { analyzeTcePdfServer } from './geminiAnalysis';

type AnalyzeRequestBody = {
  pdfBase64: string;
  mimeType: string;
};

type AnalyzeResponse = {
  body: string;
  contentType: string;
  status: number;
};

const isAnalyzeRequestBody = (value: unknown): value is AnalyzeRequestBody => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<AnalyzeRequestBody>;
  return typeof candidate.pdfBase64 === 'string' && typeof candidate.mimeType === 'string';
};

export const handleAnalyzeRequest = async (body: unknown): Promise<AnalyzeResponse> => {
  if (!isAnalyzeRequestBody(body)) {
    return {
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Corpo da requisição inválido.' }),
    };
  }

  try {
    const result = await analyzeTcePdfServer(body.pdfBase64, body.mimeType);
    return {
      status: 200,
      contentType: 'application/json',
      body: result,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro interno ao analisar o PDF.';
    return {
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: message }),
    };
  }
};
