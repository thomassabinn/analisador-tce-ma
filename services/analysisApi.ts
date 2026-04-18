export const analyzeTcePdf = async (pdfBase64: string, mimeType: string): Promise<string> => {
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      pdfBase64,
      mimeType,
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
