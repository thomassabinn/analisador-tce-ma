import { handleAnalyzeRequest } from '../server/analyzeHandler.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido.' });
    return;
  }

  const response = await handleAnalyzeRequest(req.body);
  res.status(response.status);
  res.setHeader('Content-Type', response.contentType);
  res.send(response.body);
}
