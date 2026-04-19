import { handleUploadRequest } from '../server/uploadHandler';

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Método não permitido.' });
      return;
    }

    const response = await handleUploadRequest({
      body: req.body,
    });

    res.status(response.status);
    res.setHeader('Content-Type', response.contentType);
    res.send(response.body);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro interno ao preparar o upload.';
    res.status(500).json({ error: message });
  }
}
