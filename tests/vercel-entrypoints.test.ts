import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const readSource = (relativePath: string) => readFileSync(
  path.resolve(process.cwd(), relativePath),
  'utf8'
);

describe('Vercel serverless entrypoints', () => {
  it('uses explicit .js extensions for runtime ESM imports', () => {
    expect(readSource('api/upload.ts')).toContain("from '../server/uploadHandler.js'");
    expect(readSource('api/analyze.ts')).toContain("from '../server/analyzeHandler.js'");
    expect(readSource('server/analyzeHandler.ts')).toContain("from './geminiAnalysis.js'");
  });
});
