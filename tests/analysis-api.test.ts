import { afterEach, describe, expect, it, vi } from 'vitest';

import { analyzeTcePdf } from '../services/analysisApi';

describe('analyzeTcePdf', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('posts the PDF payload to the backend endpoint and returns the response body', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue('{"ok":true}'),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(analyzeTcePdf('base64-pdf', 'application/pdf')).resolves.toBe('{"ok":true}');

    expect(fetchMock).toHaveBeenCalledWith('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pdfBase64: 'base64-pdf',
        mimeType: 'application/pdf',
      }),
    });
  });

  it('surfaces the backend error message when the request fails', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({
        error: 'backend unavailable',
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(analyzeTcePdf('base64-pdf', 'application/pdf')).rejects.toThrow('backend unavailable');
  });
});
