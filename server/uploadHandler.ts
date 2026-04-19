import { handleUpload, type HandleUploadBody, type HandleUploadOptions } from '@vercel/blob/client';

export const MAX_UPLOAD_SIZE_BYTES = 50 * 1024 * 1024;

type UploadResponse = {
  body: string;
  contentType: string;
  status: number;
};

type HandleUploadImpl = (options: HandleUploadOptions) => ReturnType<typeof handleUpload>;

const getBlobToken = () => {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error('O Vercel Blob não está configurado no ambiente do servidor.');
  }
  return token;
};

export const handleUploadRequest = async ({
  body,
  request,
  handleUploadImpl = handleUpload,
}: {
  body: HandleUploadBody;
  request: HandleUploadOptions['request'];
  handleUploadImpl?: HandleUploadImpl;
}): Promise<UploadResponse> => {
  try {
    const jsonResponse = await handleUploadImpl({
      token: getBlobToken(),
      body,
      request,
      onBeforeGenerateToken: async () => ({
        addRandomSuffix: true,
        allowedContentTypes: ['application/pdf'],
        maximumSizeInBytes: MAX_UPLOAD_SIZE_BYTES,
      }),
      onUploadCompleted: async () => {
        // No-op: the blob is consumed by the analysis flow immediately after upload.
      },
    });

    return {
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(jsonResponse),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao preparar o upload do PDF.';
    return {
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({ error: message }),
    };
  }
};
