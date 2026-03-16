import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, convertInchesToTwip, ImageRun } from 'docx';
import type { GroupedAnalysisResultTopic } from '../types';

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const base64ToFile = (base64: string, filename: string, mimeType: string): File => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });
    return new File([blob], filename, { type: mimeType });
};

export const normalizeString = (str: string): string => {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
};


const fileToArrayBuffer = (file: File): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsArrayBuffer(file);
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = (error) => reject(error);
    });
};

const getImageDimensions = (buffer: ArrayBuffer, mimeType: string): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
        const blob = new Blob([buffer], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
            resolve({ width: img.width, height: img.height });
            URL.revokeObjectURL(url);
        };
        img.onerror = (err) => {
            reject(new Error("Não foi possível determinar as dimensões da imagem. O arquivo pode estar corrompido."));
            URL.revokeObjectURL(url);
        };
        img.src = url;
    });
};

export const generateDocxBlob = async (
    data: GroupedAnalysisResultTopic[],
    validationText: string,
    entityLogoBase64: string | null,
    newScores: { essenciais: number; avaliacao: number } | null,
    entityName: string | null | undefined,
    reportTitle: string,
): Promise<Blob> => {
    const docChildren: Paragraph[] = [];

    if (entityLogoBase64) {
        try {
            const base64Data = entityLogoBase64.split(',')[1];
            const mimeType = entityLogoBase64.match(/data:(.*);base64,/)?.[1] || 'image/png';
            
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const logoBuffer = byteArray.buffer;
            
            const dims = await getImageDimensions(logoBuffer, mimeType);

            const maxWidthPixels = 150; // Logo size in header
            let newWidth = dims.width;
            let newHeight = dims.height;

            if (newWidth > maxWidthPixels) {
                const ratio = maxWidthPixels / newWidth;
                newWidth = maxWidthPixels;
                newHeight = Math.round(newHeight * ratio);
            }
            
            const mimeSubType = mimeType.split('/')[1];
            const imageType = (mimeSubType === 'jpeg' ? 'jpg' : mimeSubType) as "jpg" | "png" | "gif";

            docChildren.push(new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                    new ImageRun({
                        type: imageType,
                        data: logoBuffer,
                        transformation: {
                            width: newWidth,
                            height: newHeight,
                        },
                    }),
                ],
                spacing: { after: 300 },
            }));
        } catch (e) {
            console.error("Failed to process entity logo:", e);
        }
    }

    const topicParagraphs = await Promise.all(data.map(async (group, index) => {
        
        const criteriaParagraphs = await Promise.all(group.criteria.map(async (criterion) => {
            const imageParagraphs = await Promise.all(criterion.images.map(async (imageFile) => {
                const buffer = await fileToArrayBuffer(imageFile);
                const dims = await getImageDimensions(buffer, imageFile.type);

                const maxWidthPixels = 550;

                let newWidth = dims.width;
                let newHeight = dims.height;

                if (newWidth > maxWidthPixels) {
                    const ratio = maxWidthPixels / newWidth;
                    newWidth = maxWidthPixels;
                    newHeight = Math.round(newHeight * ratio);
                }
                
                const mimeSubType = imageFile.type.split('/')[1];
                const imageType = (mimeSubType === 'jpeg' ? 'jpg' : mimeSubType) as "jpg" | "png" | "gif";

                return new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                        new ImageRun({
                            type: imageType,
                            data: buffer,
                            transformation: {
                                width: newWidth,
                                height: newHeight,
                            },
                        }),
                    ],
                    spacing: { after: 200 },
                });
            }));

            const responseText = criterion.editedResposta || '';
            const responseLines = responseText.split('\n');

            const responseParagraphs = responseLines.map(line => 
                new Paragraph({
                    children: [new TextRun(line)],
                    style: "normal",
                    spacing: { after: 100 },
                })
            );
            if (responseParagraphs.length === 0) {
                responseParagraphs.push(new Paragraph({ children: [new TextRun("")], style: "normal" }));
            }

            const evidenceSection: Paragraph[] = [];
            if (imageParagraphs.length > 0) {
                evidenceSection.push(
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: "Evidências:",
                                bold: true,
                            }),
                        ],
                        style: "normal",
                        spacing: { after: 100, before: 200 },
                    }),
                    ...imageParagraphs
                );
            }

            return [
                new Paragraph({
                    children: [
                        new TextRun({ text: "Observação do Auditor: ", bold: true }),
                        new TextRun(criterion.observacao_auditor),
                    ],
                    style: "normal",
                    spacing: { after: 100, before: 200 },
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "Critério não Atendido: ", bold: true }),
                        new TextRun(criterion.criterio_nao_atendido),
                    ],
                    style: "normal",
                    spacing: { after: 100 },
                }),
                new Paragraph({
                    children: [
                        new TextRun({
                            text: "Defesa:",
                            bold: true,
                        }),
                    ],
                    style: "normal",
                    spacing: { after: 200 },
                }),
                ...responseParagraphs,
                ...evidenceSection,
                new Paragraph({ text: "", spacing: { after: 200 } }), // Spacer
            ];
        }));

        return [
            new Paragraph({
                children: [
                    new TextRun({
                        text: group.titulo,
                        bold: true,
                        size: 28, // 14pt
                    }),
                ],
                heading: HeadingLevel.HEADING_3,
                spacing: { before: index > 0 ? 400 : 200, after: 200 },
            }),
            ...criteriaParagraphs.flat(),
        ];
    }));

    const conclusionParagraphs: Paragraph[] = [];
    if (newScores && entityName && reportTitle.includes("REANÁLISE")) {
        const getRating = (score: number) => {
            if (score >= 75) return 'Elevado';
            if (score >= 50) return 'Intermediário';
            return 'Baixo';
        };

        const newRating = getRating(newScores.avaliacao);
        const currentDate = new Date().toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });

        conclusionParagraphs.push(
            new Paragraph({
// FIX: Moved `pageBreakBefore` from TextRun to Paragraph properties.
                pageBreakBefore: true,
                children: [ new TextRun({ text: "" })],
            }),
            new Paragraph({
                text: "3. CONCLUSÃO",
                heading: HeadingLevel.HEADING_3,
                alignment: AlignmentType.CENTER,
                spacing: { before: 200, after: 400 },
            }),
            new Paragraph({
                alignment: AlignmentType.JUSTIFIED,
                indent: { firstLine: 720 }, // 1.27 cm
                children: [
                    new TextRun("Em cumprimento à Instrução Normativa TCE/MA nº 81/2024, que dispõe sobre a fiscalização dos sítios eletrônicos dos Entes, o Portal da Transparência do(a) "),
                    new TextRun({ text: entityName, bold: true }),
                    new TextRun(" obteve, como resultado da verificação do portal, o índice de atendimento de "),
                    new TextRun({ text: `${newScores.essenciais.toFixed(2).replace('.',',')}% dos critérios essenciais`, bold: true }),
                    new TextRun(" e de "),
                    new TextRun({ text: `${newScores.avaliacao.toFixed(2).replace('.',',')}% da avaliação`, bold: true }),
                    new TextRun(", resultando em índice de transparência "),
                    new TextRun({ text: newRating, bold: true }),
                    new TextRun("."),
                ],
                spacing: { after: 800 },
            }),
            new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                    new TextRun(`São Luís, ${currentDate}`)
                ],
                spacing: { after: 200 },
            })
        );
    }


    const doc = new Document({
        styles: {
            paragraphStyles: [
                {
                    id: "normal",
                    name: "Normal",
                    basedOn: "Normal",
                    next: "Normal",
                    run: {
                        font: "Calibri",
                        size: 24, // 12pt
                    },
                },
                 {
                    id: "h3",
                    name: "Heading 3",
                    basedOn: "Normal",
                    next: "Normal",
                    run: {
                        font: "Calibri",
                        size: 24, // 12pt
                        bold: true,
                    },
                },
            ],
        },
        sections: [{
            properties: {
                page: {
                    margin: {
                        top: convertInchesToTwip(1),
                        right: convertInchesToTwip(1),
                        bottom: convertInchesToTwip(1),
                        left: convertInchesToTwip(1),
                    },
                },
            },
            children: [
                ...docChildren,
                new Paragraph({
                    text: reportTitle,
                    heading: HeadingLevel.TITLE,
                    alignment: AlignmentType.CENTER,
                }),
                new Paragraph({ text: "", spacing: { after: 300 } }),
                ...topicParagraphs.flat(),
                ...conclusionParagraphs,
                new Paragraph({
                    text: `Validação do Modelo: ${validationText}`,
                    style: "normal",
                    spacing: { before: 600 },
                    run: {
                        italics: true,
                        size: 20, // 10pt
                    }
                }),
            ],
        }],
    });

    return Packer.toBlob(doc);
};