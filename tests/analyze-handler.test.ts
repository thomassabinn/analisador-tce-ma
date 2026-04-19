import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  analyzeTcePdfFromBlobUrl,
  analyzeTcePdfServer,
} from '../server/geminiAnalysis';
import { handleAnalyzeRequest } from '../server/analyzeHandler';

vi.mock('../server/geminiAnalysis', () => ({
  analyzeTcePdfFromBlobUrl: vi.fn(),
  analyzeTcePdfServer: vi.fn(),
}));

describe('handleAnalyzeRequest', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('accepts blob URLs and analyzes the uploaded PDF', async () => {
    vi.mocked(analyzeTcePdfFromBlobUrl).mockResolvedValue('{"ok":true}');

    const response = await handleAnalyzeRequest({
      blobUrl: 'https://blob.vercel-storage.com/private/relatorio.pdf',
    });

    expect(analyzeTcePdfFromBlobUrl).toHaveBeenCalledWith(
      'https://blob.vercel-storage.com/private/relatorio.pdf'
    );
    expect(response).toEqual({
      status: 200,
      contentType: 'application/json',
      body: '{"ok":true}',
    });
  });

  it('keeps compatibility with direct base64 payloads', async () => {
    vi.mocked(analyzeTcePdfServer).mockResolvedValue('{"legacy":true}');

    const response = await handleAnalyzeRequest({
      pdfBase64: 'base64-pdf',
      mimeType: 'application/pdf',
    });

    expect(analyzeTcePdfServer).toHaveBeenCalledWith('base64-pdf', 'application/pdf');
    expect(response).toEqual({
      status: 200,
      contentType: 'application/json',
      body: '{"legacy":true}',
    });
  });

  it('rejects invalid request bodies', async () => {
    const response = await handleAnalyzeRequest({ blobUrl: 123 });

    expect(response.status).toBe(400);
    expect(response.body).toContain('Corpo da requisição inválido.');
  });
});
