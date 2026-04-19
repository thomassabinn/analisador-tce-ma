import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  MAX_UPLOAD_SIZE_BYTES,
  handleUploadRequest,
} from '../server/uploadHandler';

describe('handleUploadRequest', () => {
  afterEach(() => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
  });

  it('configures private PDF uploads up to 50MB', async () => {
    process.env.BLOB_READ_WRITE_TOKEN = 'blob-token';
    const handleUploadImpl = vi
      .fn()
      .mockResolvedValue({ type: 'blob.generate-client-token', clientToken: 'token-123' });

    const request = { method: 'POST' };
    const body = { type: 'blob.generate-client-token', pathname: 'relatorio.pdf' };

    const response = await handleUploadRequest({
      body,
      request,
      handleUploadImpl,
    });

    expect(handleUploadImpl).toHaveBeenCalledWith(
      expect.objectContaining({
        body,
        request,
        onBeforeGenerateToken: expect.any(Function),
        onUploadCompleted: expect.any(Function),
      })
    );

    const options = handleUploadImpl.mock.calls[0][0];
    await expect(options.onBeforeGenerateToken('relatorio.pdf')).resolves.toEqual({
      addRandomSuffix: true,
      allowedContentTypes: ['application/pdf'],
      maximumSizeInBytes: MAX_UPLOAD_SIZE_BYTES,
    });

    expect(response).toEqual({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ type: 'blob.generate-client-token', clientToken: 'token-123' }),
    });
  });

  it('returns the upload error message when token generation fails', async () => {
    process.env.BLOB_READ_WRITE_TOKEN = 'blob-token';
    const handleUploadImpl = vi.fn().mockRejectedValue(new Error('missing blob token'));

    const response = await handleUploadRequest({
      body: { type: 'blob.generate-client-token', pathname: 'relatorio.pdf' },
      request: { method: 'POST' },
      handleUploadImpl,
    });

    expect(response).toEqual({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'missing blob token' }),
    });
  });
});
