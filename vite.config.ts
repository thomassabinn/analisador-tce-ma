import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import type { HandleUploadBody } from '@vercel/blob/client';

import { processDevAnalyzeRequest } from './server/devAnalyzeRoute';
import { handleUploadRequest } from './server/uploadHandler';

const analyzeApiPlugin = () => ({
  name: 'local-analyze-api',
  configureServer(server: any) {
    server.middlewares.use('/api/analyze', async (req: any, res: any, next: () => void) => {
      if (req.method !== 'POST') {
        next();
        return;
      }

      const chunks: Buffer[] = [];
      req.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      req.on('end', async () => {
        const rawBody = Buffer.concat(chunks).toString('utf8');
        const response = await processDevAnalyzeRequest({
          rawBody,
          loadHandler: () => import('./server/analyzeHandler'),
        });

        res.statusCode = response.status;
        res.setHeader('Content-Type', response.contentType);
        res.end(response.body);
      });
    });

    server.middlewares.use('/api/upload', async (req: any, res: any, next: () => void) => {
      if (req.method !== 'POST') {
        next();
        return;
      }

      const chunks: Buffer[] = [];
      req.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      req.on('end', async () => {
        try {
          const rawBody = Buffer.concat(chunks).toString('utf8');
          const parsedBody = JSON.parse(rawBody) as HandleUploadBody;
          const response = await handleUploadRequest({
            body: parsedBody,
            request: req,
          });

          res.statusCode = response.status;
          res.setHeader('Content-Type', response.contentType);
          res.end(response.body);
        } catch {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Corpo da requisição inválido.' }));
        }
      });
    });
  },
});

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const apiKey = env.GEMINI_API_KEY || env.API_KEY || env.VITE_GEMINI_API_KEY;
  const blobToken = env.BLOB_READ_WRITE_TOKEN;

  if (apiKey) {
    process.env.GEMINI_API_KEY ??= apiKey;
    process.env.API_KEY ??= apiKey;
  }

  if (blobToken) {
    process.env.BLOB_READ_WRITE_TOKEN ??= blobToken;
  }

  return {
    server: {
      port: 5173,
      host: 'localhost',
      strictPort: false,
      cors: true,
      open: true,
    },
    plugins: [react(), analyzeApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  };
});
