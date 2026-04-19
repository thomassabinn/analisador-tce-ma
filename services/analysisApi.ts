import { upload } from '@vercel/blob/client';

export const uploadPdfForAnalysis = async (file: File): Promise<string> => {
  try {
    const blob = await upload(file.name, file, {
      access: 'private',
      contentType: file.type,
      handleUploadUrl: '/api/upload',
      multipart: true,
    });

    return blob.url;
  } catch (error) {
    if (error instanceof Error && error.message.includes('Failed to retrieve the client token')) {
      throw new Error('Falha ao iniciar o upload do PDF. Verifique se BLOB_READ_WRITE_TOKEN está configurado na Vercel e se a rota /api/upload está funcionando.');
    }

    throw error instanceof Error
      ? error
      : new Error('Falha ao enviar o PDF para o storage.');
  }
};

export const analyzeTcePdf = async (blobUrl: string): Promise<string> => {
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      blobUrl,
    }),
  });

  if (!response.ok) {
    let message = 'Falha ao analisar o PDF.';

    try {
      const errorPayload = await response.json();
      if (typeof errorPayload?.error === 'string') {
        message = errorPayload.error;
      }
    } catch {
      message = 'Falha ao analisar o PDF.';
    }

    throw new Error(message);
  }

  return response.text();
};
