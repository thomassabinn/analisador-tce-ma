import { describe, expect, it, vi } from 'vitest';

import { processDevAnalyzeRequest } from '../server/devAnalyzeRoute';

describe('processDevAnalyzeRequest', () => {
  it('loads the latest analyze handler on every request in dev mode', async () => {
    const loadHandler = vi
      .fn()
      .mockResolvedValueOnce({
        handleAnalyzeRequest: vi.fn().mockResolvedValue({
          status: 200,
          contentType: 'application/json',
          body: '{"version":"old"}',
        }),
      })
      .mockResolvedValueOnce({
        handleAnalyzeRequest: vi.fn().mockResolvedValue({
          status: 200,
          contentType: 'application/json',
          body: '{"version":"new"}',
        }),
      });

    const first = await processDevAnalyzeRequest({
      rawBody: '{"pdfBase64":"a","mimeType":"application/pdf"}',
      loadHandler,
    });
    const second = await processDevAnalyzeRequest({
      rawBody: '{"pdfBase64":"a","mimeType":"application/pdf"}',
      loadHandler,
    });

    expect(first.body).toBe('{"version":"old"}');
    expect(second.body).toBe('{"version":"new"}');
    expect(loadHandler).toHaveBeenCalledTimes(2);
  });

  it('returns a 400 response when the request body is invalid JSON', async () => {
    const loadHandler = vi.fn();

    await expect(
      processDevAnalyzeRequest({
        rawBody: '{invalid-json',
        loadHandler,
      })
    ).resolves.toEqual({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Corpo da requisição inválido.' }),
    });
    expect(loadHandler).not.toHaveBeenCalled();
  });
});
