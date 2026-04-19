import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  MAX_UPLOAD_SIZE_BYTES,
  handleUploadRequest,
} from '../server/uploadHandler';

describe('handleUploadRequest', () => {
  afterEach(() => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
  });

  it('generates a client token for private PDF uploads up to 50MB', async () => {
    process.env.BLOB_READ_WRITE_TOKEN = 'blob-token';
    const generateClientTokenImpl = vi.fn().mockResolvedValue('token-123');
    const body = {
      type: 'blob.generate-client-token',
      payload: {
        pathname: 'relatorio.pdf',
        clientPayload: null,
        multipart: true,
      },
    };

    const response = await handleUploadRequest({
      body,
      generateClientTokenImpl,
    });

    expect(generateClientTokenImpl).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 'blob-token',
        pathname: 'relatorio.pdf',
        addRandomSuffix: true,
        allowedContentTypes: ['application/pdf'],
        maximumSizeInBytes: MAX_UPLOAD_SIZE_BYTES,
        validUntil: expect.any(Number),
      })
    );

    expect(response).toEqual({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ type: 'blob.generate-client-token', clientToken: 'token-123' }),
    });
  });

  it('acknowledges upload completion events without requiring callback auto-discovery', async () => {
    const response = await handleUploadRequest({
      body: {
        type: 'blob.upload-completed',
        payload: {
          blob: {
            pathname: 'relatorio.pdf',
            contentType: 'application/pdf',
            contentDisposition: 'inline',
            url: 'https://blob.vercel-storage.com/private/relatorio.pdf',
            downloadUrl: 'https://blob.vercel-storage.com/private/relatorio.pdf?download=1',
            etag: 'etag-123',
          },
          tokenPayload: null,
        },
      },
    });

    expect(response).toEqual({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ type: 'blob.upload-completed', response: 'ok' }),
    });
  });

  it('returns the upload error message when token generation fails', async () => {
    process.env.BLOB_READ_WRITE_TOKEN = 'blob-token';
    const generateClientTokenImpl = vi.fn().mockRejectedValue(new Error('missing blob token'));

    const response = await handleUploadRequest({
      body: {
        type: 'blob.generate-client-token',
        payload: {
          pathname: 'relatorio.pdf',
          clientPayload: null,
          multipart: false,
        },
      },
      generateClientTokenImpl,
    });

    expect(response).toEqual({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'missing blob token' }),
    });
  });
});
