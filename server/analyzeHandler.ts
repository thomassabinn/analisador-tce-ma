import { analyzeTcePdfFromBlobUrl, analyzeTcePdfServer } from './geminiAnalysis.js';

type LegacyAnalyzeRequestBody = {
  pdfBase64: string;
  mimeType: string;
};

type BlobAnalyzeRequestBody = {
  blobUrl: string;
};

type AnalyzeResponse = {
  body: string;
  contentType: string;
  status: number;
};

const isLegacyAnalyzeRequestBody = (value: unknown): value is LegacyAnalyzeRequestBody => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<LegacyAnalyzeRequestBody>;
  return typeof candidate.pdfBase64 === 'string' && typeof candidate.mimeType === 'string';
};

const isBlobAnalyzeRequestBody = (value: unknown): value is BlobAnalyzeRequestBody => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<BlobAnalyzeRequestBody>;
  return typeof candidate.blobUrl === 'string';
};

export const handleAnalyzeRequest = async (body: unknown): Promise<AnalyzeResponse> => {
  if (!isLegacyAnalyzeRequestBody(body) && !isBlobAnalyzeRequestBody(body)) {
    return {
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Corpo da requisição inválido.' }),
    };
  }

  try {
    const result = isBlobAnalyzeRequestBody(body)
      ? await analyzeTcePdfFromBlobUrl(body.blobUrl)
      : await analyzeTcePdfServer(body.pdfBase64, body.mimeType);

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
