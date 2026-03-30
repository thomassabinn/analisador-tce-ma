

import { GoogleGenAI, Type } from "@google/genai";
import type { TceApiTopic } from '../types';

const getTceAnalysisSchema = () => ({
    type: Type.OBJECT,
    properties: {
        nome_entidade: {
            type: Type.STRING,
            description: "O nome completo da entidade fiscalizada (ex: 'Câmara Municipal de ...' ou 'Prefeitura Municipal de ...') extraído do cabeçalho ou das primeiras páginas do relatório."
        },
        indice_atendimento_essenciais: {
            type: Type.NUMBER,
            description: "O valor percentual EXATO do índice de atendimento dos critérios essenciais, extraído da seção 'CONCLUSÃO' do relatório. Ex: 81.82."
        },
        indice_atendimento_avaliacao: {
            type: Type.NUMBER,
            description: "O valor percentual EXATO do índice de avaliação geral, extraído da seção 'CONCLUSÃO' do relatório. Ex: 61.41."
        },
        classificacao_transparencia: {
            type: Type.STRING,
            description: "A classificação final do índice de transparência (ex: 'Intermediário', 'Elevado', 'Baixo'), extraída da seção 'CONCLUSÃO' do relatório."
        },
        topicos_nao_atendidos: {
            type: Type.ARRAY,
            description: "Uma lista de todos os tópicos que foram classificados como 'não atendido' no relatório do TCE.",
            items: {
                type: Type.OBJECT,
                description: "Representa um único apontamento de 'não atendido' encontrado no documento.",
                properties: {
                    titulo_principal: {
                        type: Type.STRING,
                        description: "O título da seção principal que agrupa este tópico. Ex: '2 - INFORMAÇÕES INSTITUCIONAIS'. Se o tópico não tiver um agrupador principal óbvio, use o próprio título do tópico aqui."
                    },
                    titulo: {
                        type: Type.STRING,
                        description: "O título da subseção numerada onde o apontamento foi encontrado. Ex: '2.6 - Divulga os atos normativos próprios?'"
                    },
                    observacao_auditor: {
                        type: Type.STRING,
                        description: "O texto exato da coluna 'JUSTIFICATIVA' para o item não atendido. Se não houver, deve conter 'Observação do auditor não disponível'."
                    },
                    criterio_nao_atendido: {
                        type: Type.STRING,
                        description: "O texto exato da coluna 'ITEM' que descreve o critério que não foi atendido. Ex: 'Disponibilidade'."
                    },
                    resposta: {
                        type: Type.STRING,
                        description: "A resposta/justificativa gerada, afirmando que o critério foi atendido, seguida por exatamente cinco quebras de linha (\\n\\n\\n\\n\\n)."
                    },
                    links_referencia: {
                        type: Type.ARRAY,
                        description: "Uma lista contendo AS URLs REAIS de destino dos hyperlinks da coluna 'LINK EVIDÊNCIA'. Extraia o endereço (href) do link, NÃO o texto âncora. Exemplo: se o link mostra 'Clique aqui' mas aponta para 'http://site.com', o valor deve ser 'http://site.com'. Se não houver link ou a URL não puder ser extraída, a lista DEVE ser vazia.",
                        items: {
                            type: Type.STRING
                        }
                    }
                },
                required: ["titulo_principal", "titulo", "observacao_auditor", "criterio_nao_atendido", "resposta", "links_referencia"]
            }
        },
        validacao: {
            type: Type.STRING,
            description: "Uma string curta confirmando que a validação dos campos e formato foi realizada pelo modelo."
        }
    },
    required: ["nome_entidade", "indice_atendimento_essenciais", "indice_atendimento_avaliacao", "classificacao_transparencia", "topicos_nao_atendidos", "validacao"]
});


const getPrompt = () => {
    return `
    Sua tarefa é analisar um relatório em PDF do TCE/MA e extrair rapidamente informações cruciais. Siga esta ordem para máxima eficiência.

    **Instruções de Execução Rápida:**
    1.  **Conclusão Primeiro**: Vá diretamente para a seção "3. CONCLUSÃO" do relatório. Extraia os seguintes valores para os campos correspondentes:
        *   \`indice_atendimento_essenciais\`: O valor percentual dos critérios essenciais (ex: 81.82).
        *   \`indice_atendimento_avaliacao\`: O valor percentual da avaliação geral (ex: 61.41).
        *   \`classificacao_transparencia\`: A palavra que classifica o índice (ex: "Intermediário").
    2.  **Nome da Entidade**: Em seguida, identifique e extraia o nome completo da entidade fiscalizada (ex: 'Câmara Municipal de ...') do cabeçalho ou da conclusão do documento para o campo \`nome_entidade\`.
    3.  **Ignore o resto do texto introdutório.** Vá para as seções de análise técnica.
    4.  **Foque exclusivamente nas tabelas** com o cabeçalho "AVALIAÇÃO DOS ITENS CRITÉRIOS".
    5.  Dentro de cada tabela, encontre **apenas as linhas** onde a coluna "ATENDE" contém a palavra **"Não"**. Ignore todas as outras.
    6.  Para cada linha "Não" encontrada, extraia imediatamente os seguintes dados:
        *   **\`titulo_principal\`**: O título da seção principal que agrupa este item (ex: "2 - INFORMAÇÕES INSTITUCIONAIS"). Muitas vezes, é o título que não tem um ponto decimal no número (ex: "2" vs "2.6").
        *   **\`titulo\`**: O título da subseção numerada específica que precede a tabela (ex: "2.6 - Divulga os atos normativos próprios?").
        *   **\`criterio_nao_atendido\`**: O texto exato da coluna "ITEM" na mesma linha do "Não".
        *   **\`observacao_auditor\`**: O texto exato da coluna "JUSTIFICATIVA" na mesma linha do "Não".
        *   **\`links_referencia\`**: **[TAREFA ESSENCIAL]** A coluna "LINK EVIDÊNCIA" contém textos que são hyperlinks. O PDF fornecido contém os dados do link (a URL de destino). Sua tarefa é extrair **apenas a URL de destino** de cada hyperlink, não o texto que aparece na tela.
            *   **COMO FAZER:** Para cada texto como "Acessar link", "Ver evidência", etc., você deve acessar o metadado do hyperlink e extrair a URL completa (ex: 'https://transparencia.pi.gov.br/...').
            *   **EXEMPLO DE EXTRAÇÃO:**
                *   Se o texto visível é \`Acessar link\`
                *   E o link real aponta para \`https://exemplo.com/pagina.html\`
                *   O valor extraído **DEVE SER**: \`["https://exemplo.com/pagina.html"]\`
            *   **MÚLTIPLOS LINKS:** Se uma célula contém "Acessar 1º link" e "Acessar 2º link", extraia a URL de ambos. O resultado seria uma lista com duas URLs.
            *   **FALHA:** Se a extração da URL for impossível, a lista deve ser vazia (\`[]\`). **Nunca** retorne o texto visível (como "Acessar link") no resultado.
    7.  **Gere a Resposta**: Com base na \`observacao_auditor\`, escreva uma \`resposta\` curta, formal e que afirme o oposto do apontamento. Ao final do texto da resposta, insira exatamente cinco quebras de linha ("\\n\\n\\n\\n\\n").

    Execute esta tarefa de forma eficiente para todo o documento e retorne um único objeto JSON com todos os resultados, conforme o schema solicitado.
    `;
};

export const analyzeTcePdf = async (pdfBase64: string, mimeType: string): Promise<string> => {
    const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("A chave da API Gemini não está configurada. Defina GEMINI_API_KEY nas variáveis de ambiente do Vercel e faça o redeploy.");
    }
    const ai = new GoogleGenAI({ apiKey });
    try {
        const response = await ai.models.generateContent({
            // FIX: Updated model from deprecated `gemini-pro` to `gemini-2.5-pro`.
            model: 'gemini-2.5-pro',
            contents: {
                parts: [
                    { text: getPrompt() },
                    { inlineData: { data: pdfBase64, mimeType: mimeType } },
                ],
            },
            config: {
                responseMimeType: 'application/json',
                responseSchema: getTceAnalysisSchema(),
            },
        });

        const resultText = response.text;
        if (!resultText) {
            throw new Error("A resposta da API está vazia.");
        }
        // O resultado é um JSON garantido, não precisa de limpeza.
        return resultText;
    } catch (error) {
        console.error("Erro ao chamar a API Gemini:", error);
        if (error instanceof Error && error.message.includes('SAFETY')) {
            throw new Error("A análise foi bloqueada por políticas de segurança. O conteúdo do PDF pode ter acionado os filtros.");
        }
        throw new Error("Falha na comunicação com a API Gemini. A resposta pode ser inválida ou o modelo falhou ao processar o PDF.");
    }
};
