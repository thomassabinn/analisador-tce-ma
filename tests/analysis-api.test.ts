import { afterEach, describe, expect, it, vi } from 'vitest';

import { upload } from '@vercel/blob/client';

import { analyzeTcePdf, uploadPdfForAnalysis } from '../services/analysisApi';

vi.mock('@vercel/blob/client', () => ({
  upload: vi.fn(),
}));

describe('analysisApi', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('uploads the PDF to Vercel Blob and returns the blob URL', async () => {
    const file = new File(['fake-pdf'], 'relatorio.pdf', { type: 'application/pdf' });
    vi.mocked(upload).mockResolvedValue({
      url: 'https://blob.vercel-storage.com/private/relatorio.pdf',
    } as Awaited<ReturnType<typeof upload>>);

    await expect(uploadPdfForAnalysis(file)).resolves.toBe(
      'https://blob.vercel-storage.com/private/relatorio.pdf'
    );

    expect(upload).toHaveBeenCalledWith(
      'relatorio.pdf',
      file,
      expect.objectContaining({
        access: 'private',
        contentType: 'application/pdf',
        handleUploadUrl: '/api/upload',
        multipart: true,
      })
    );
  });

  it('posts the uploaded blob URL to the backend endpoint and returns the response body', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue('{"ok":true}'),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      analyzeTcePdf('https://blob.vercel-storage.com/private/relatorio.pdf')
    ).resolves.toBe('{"ok":true}');

    expect(fetchMock).toHaveBeenCalledWith('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        blobUrl: 'https://blob.vercel-storage.com/private/relatorio.pdf',
      }),
    });
  });

  it('surfaces the backend error message when the analysis request fails', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({
        error: 'backend unavailable',
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      analyzeTcePdf('https://blob.vercel-storage.com/private/relatorio.pdf')
    ).rejects.toThrow('backend unavailable');
  });
});
