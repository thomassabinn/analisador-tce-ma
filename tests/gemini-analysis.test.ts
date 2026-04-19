import { describe, expect, it, vi } from 'vitest';

import { runGeminiAnalysis } from '../server/geminiAnalysis';

describe('runGeminiAnalysis', () => {
  it('falls back to gemini-2.5-flash when gemini-2.5-pro is quota-limited', async () => {
    const generateContent = vi
      .fn()
      .mockRejectedValueOnce(new Error('429 RESOURCE_EXHAUSTED quota exceeded for gemini-2.5-pro'))
      .mockResolvedValueOnce({ text: '{"ok":true}' });

    await expect(
      runGeminiAnalysis({
        generateContent,
        pdfBase64: 'base64-pdf',
        mimeType: 'application/pdf',
      })
    ).resolves.toBe('{"ok":true}');

    expect(generateContent).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ model: 'gemini-2.5-pro' })
    );
    expect(generateContent).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ model: 'gemini-2.5-flash' })
    );
  });

  it('surfaces a specific quota message when no fallback model succeeds', async () => {
    const generateContent = vi
      .fn()
      .mockRejectedValueOnce(new Error('429 RESOURCE_EXHAUSTED quota exceeded for gemini-2.5-pro'))
      .mockRejectedValueOnce(new Error('429 RESOURCE_EXHAUSTED quota exceeded for gemini-2.5-flash'));

    await expect(
      runGeminiAnalysis({
        generateContent,
        pdfBase64: 'base64-pdf',
        mimeType: 'application/pdf',
      })
    ).rejects.toThrow('A cota da API Gemini foi excedida');
  });
});
