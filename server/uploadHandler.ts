export const MAX_UPLOAD_SIZE_BYTES = 50 * 1024 * 1024;

type UploadResponse = {
  body: string;
  contentType: string;
  status: number;
};

type GenerateClientTokenOptions = {
  token: string;
  pathname: string;
  addRandomSuffix: boolean;
  allowedContentTypes: string[];
  maximumSizeInBytes: number;
  validUntil: number;
};

type GenerateClientTokenImpl = (options: GenerateClientTokenOptions) => Promise<string>;

type GenerateClientTokenBody = {
  type: 'blob.generate-client-token';
  payload: {
    pathname: string;
    clientPayload: string | null;
    multipart: boolean;
  };
};

type UploadCompletedBody = {
  type: 'blob.upload-completed';
  payload: {
    blob: {
      pathname: string;
      contentType: string;
      contentDisposition: string;
      url: string;
      downloadUrl: string;
      etag: string;
    };
    tokenPayload?: string | null;
  };
};

const getBlobToken = () => {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error('O Vercel Blob não está configurado no ambiente do servidor.');
  }
  return token;
};

const isGenerateClientTokenBody = (body: unknown): body is GenerateClientTokenBody => {
  if (!body || typeof body !== 'object') {
    return false;
  }

  const candidate = body as Partial<GenerateClientTokenBody>;
  return (
    candidate.type === 'blob.generate-client-token'
    && !!candidate.payload
    && typeof candidate.payload === 'object'
    && typeof candidate.payload.pathname === 'string'
  );
};

const isUploadCompletedBody = (body: unknown): body is UploadCompletedBody => {
  if (!body || typeof body !== 'object') {
    return false;
  }

  const candidate = body as Partial<UploadCompletedBody>;
  return candidate.type === 'blob.upload-completed';
};

const getDefaultGenerateClientTokenImpl = async (): Promise<GenerateClientTokenImpl> => {
  const blobClientModule = await import('@vercel/blob/client');
  return blobClientModule.generateClientTokenFromReadWriteToken as GenerateClientTokenImpl;
};

export const handleUploadRequest = async ({
  body,
  generateClientTokenImpl,
}: {
  body: unknown;
  generateClientTokenImpl?: GenerateClientTokenImpl;
}): Promise<UploadResponse> => {
  try {
    if (isUploadCompletedBody(body)) {
      return {
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ type: 'blob.upload-completed', response: 'ok' }),
      };
    }

    if (!isGenerateClientTokenBody(body)) {
      return {
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Corpo da requisição inválido.' }),
      };
    }

    const generateToken = generateClientTokenImpl ?? await getDefaultGenerateClientTokenImpl();
    const clientToken = await generateToken({
      token: getBlobToken(),
      pathname: body.payload.pathname,
      addRandomSuffix: true,
      allowedContentTypes: ['application/pdf'],
      maximumSizeInBytes: MAX_UPLOAD_SIZE_BYTES,
      validUntil: Date.now() + (60 * 60 * 1000),
    });

    return {
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ type: 'blob.generate-client-token', clientToken }),
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
