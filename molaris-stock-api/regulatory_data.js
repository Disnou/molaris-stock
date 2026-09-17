// =========================================================================
// MolarisStock - Módulo Regulatório Laboratorial & Tributário Brasileiro
// Compatível com Polícia Federal, Exército Brasileiro, Polícia Civil e ANVISA
// =========================================================================

const REGRAS_FEDERAIS = {
    policia_federal: {
        orgao: "Polícia Federal (PF)",
        legislacao: "Lei Federal nº 10.357/2001 e Portaria MJSP nº 204/2022",
        sistema: "SIPROQUIM 2 (Sistema de Controle de Produtos Químicos)",
        documentos_obrigatorios: [
            "CRC - Certificado de Registro Cadastral",
            "CLF - Certificado de Licença de Funcionamento",
            "AE - Autorização Especial (quando aplicável)"
        ],
        prazos: "Envio do Mapa Mensal de Atividades até o 10º dia útil de cada mês subsequente.",
        exigencias_compra: "O fornecedor só pode faturar a Nota Fiscal se o comprador tiver CLF ativo e com cota disponível para a substância. O número da licença deve constar nos dados adicionais da NF-e.",
        substancias_comuns: [
            "Ácido Clorídrico 37%",
            "Ácido Sulfúrico 98%",
            "Acetona P.A.",
            "Permanganato de Potássio",
            "Éter Etílico",
            "Tolueno",
            "Anidrido Acético",
            "Sulfato de Sódio"
        ]
    },
    exercito_brasileiro: {
        orgao: "Exército Brasileiro - DFPC (Diretoria de Fiscalização de Produtos Controlados)",
        legislacao: "Decreto nº 10.030/2019 e Portaria nº 118 - COLOG/2019",
        sistema: "SICOVAB / SisGCorp (Sistema de Gestão Corporativa do Exército)",
        documentos_obrigatorios: [
            "CR - Certificado de Registro no Exército",
            "Apostilamento de Atividades com PCE (Produtos Controlados pelo Exército)",
            "Guia de Tráfego (GT) para transporte interestadual"
        ],
        prazos: "Mapas trimestrais de estocagem e consumo de PCE.",
        exigencias_compra: "Exige autorização prévia de compra, vinculação do CR da empresa compradora ao fornecedor e emissão obrigatória de Guia de Tráfego.",
        substancias_comuns: [
            "Ácido Nítrico 65%",
            "Nitrato de Amônio",
            "Nitrato de Potássio",
            "Clorato de Potássio",
            "Pólvoras e Propelentes",
            "Nitrato de Prata"
        ]
    },
    anvisa: {
        orgao: "ANVISA (Agência Nacional de Vigilância Sanitária)",
        legislacao: "RDC nº 302/2005 e RDC nº 786/2023 (Laboratórios Clínicos) e RDC nº 658/2022 (BPF)",
        exigencias_principais: [
            "Rastreabilidade estrita de lotes (Entrada, Lote do fabricante, Validade, Baixas)",
            "Registro mandatório da Data de Abertura do frasco (validade reduzida após abertura)",
            "Controle de temperatura de armazenamento (Ambiente 15-25°C, Geladeira 2-8°C, Freezer -20°C)",
            "PGRSS - Plano de Gerenciamento de Resíduos Sólidos de Saúde (descarte químico rastreado)"
        ]
    }
};

const ESTADOS_BRASIL = [
    {
        uf: "SP",
        nome: "São Paulo",
        orgao_policia_civil: "Divisão de Produtos Controlados da Polícia Civil (DPC/SP)",
        base_legal: "Decreto Estadual nº 6.911/1935 e Portarias DPC",
        aliquota_icms_interna: "18%",
        aliquota_icms_interestadual: "12% / 4% (mercadorias importadas)",
        regras_difal: "Exige DIFAL na compra de outros estados para laboratórios não contribuintes ou optantes do Simples.",
        exigencias_documentais: "Alvará da Polícia Civil de SP anual obrigatório para posse e manipulação. Menção obrigatória da licença na NF-e."
    },
    {
        uf: "RJ",
        nome: "Rio de Janeiro",
        orgao_policia_civil: "DFAe - Divisão de Fiscalização de Armas e Explosivos (PCERJ)",
        base_legal: "Decreto Estadual nº 2.052/1978 e Resoluções SEPOL",
        aliquota_icms_interna: "20% (inclui 2% FECP)",
        aliquota_icms_interestadual: "12% / 4%",
        regras_difal: "Recolhimento obrigatório do DIFAL com adicional de FECP estadual.",
        exigencias_documentais: "Certificado de Vistoria da DFAe atualizado para armazenamento de produtos químicos controlados."
    },
    {
        uf: "MG",
        nome: "Minas Gerais",
        orgao_policia_civil: "DASP - Divisão de Armas, Munições e Explosivos (PCMG)",
        base_legal: "Resolução PCMG nº 7.020/2008 e Decreto Estadual nº 44.821",
        aliquota_icms_interna: "18%",
        aliquota_icms_interestadual: "12% / 4%",
        regras_difal: "DIFAL exigível na entrada de mercadoria destinada a uso/consumo ou ativo imobilizado.",
        exigencias_documentais: "Alvará da Polícia Civil de Minas Gerais para uso e depósito de reagentes controlados."
    },
    {
        uf: "PR",
        nome: "Paraná",
        orgao_policia_civil: "DPC - Delegacia de Explosivos, Armas e Munições (PCPR)",
        base_legal: "Decreto Estadual nº 2.479 e normativas PCPR",
        aliquota_icms_interna: "19.5%",
        aliquota_icms_interestadual: "12% / 4%",
        regras_difal: "Exigência de GNRE paga ou recolhimento antecipado em compras interestaduais.",
        exigencias_documentais: "Licença de Funcionamento PCPR com menção do Responsável Técnico (CRQ/CRF)."
    },
    {
        uf: "RS",
        nome: "Rio Grande do Sul",
        orgao_policia_civil: "DPCP - Divisão de Produtos Controlados (PCRS)",
        base_legal: "Lei Estadual nº 10.987 e Portarias PCRS",
        aliquota_icms_interna: "17%",
        aliquota_icms_interestadual: "12% / 4%",
        regras_difal: "DIFAL aplicado para consumidor final laboratorial.",
        exigencias_documentais: "Alvará de Produtos Controlados do RS com vistoria do Corpo de Bombeiros (PPCI)."
    },
    {
        uf: "SC",
        nome: "Santa Catarina",
        orgao_policia_civil: "Gerência de Jogos, Diversões e Produtos Controlados (PCSC)",
        base_legal: "Decreto Estadual nº 2.870/2001 e Portarias PCSC",
        aliquota_icms_interna: "17%",
        aliquota_icms_interestadual: "12% / 4%",
        regras_difal: "Verificação de barreiras fiscais via SEF/SC para reagentes químicos.",
        exigencias_documentais: "Licença da Polícia Civil de SC para aquisição e armazenamento de químicos."
    },
    {
        uf: "BA",
        nome: "Bahia",
        orgao_policia_civil: "Coordenação de Fiscalização de Produtos Controlados (PCBA)",
        base_legal: "Decreto Estadual nº 6.284/1997 e regulamentos SEFAZ/BA",
        aliquota_icms_interna: "20.5%",
        aliquota_icms_interestadual: "7% (comprando do Sul/Sudeste) / 4%",
        regras_difal: "Atenção ao impacto alto de DIFAL (20.5% - 7% = 13.5% a pagar na entrada).",
        exigencias_documentais: "Alvará da PCBA e comprovante de inscrição no SEFAZ Bahia para desembaraço fiscal."
    },
    {
        uf: "PE",
        nome: "Pernambuco",
        orgao_policia_civil: "DPCON - Delegacia de Produtos Controlados (PCPE)",
        base_legal: "Decreto Estadual nº 44.650/2017 e normas PCPE",
        aliquota_icms_interna: "20.5%",
        aliquota_icms_interestadual: "7% (origem Sul/Sudeste) / 4%",
        regras_difal: "DIFAL de 13.5% para mercadorias vindas do Centro-Sul.",
        exigencias_documentais: "Certidão de Regularidade de Produtos Controlados da Polícia Civil de PE."
    },
    {
        uf: "CE",
        nome: "Ceará",
        orgao_policia_civil: "Divisão de Armas e Munições e Produtos Controlados (PCCE)",
        base_legal: "Decreto Estadual nº 33.327/2019 e portarias PCCE",
        aliquota_icms_interna: "20%",
        aliquota_icms_interestadual: "7% / 4%",
        regras_difal: "DIFAL exigível de 13% na entrada no Estado do Ceará.",
        exigencias_documentais: "Alvará da PCCE exigido para liberação de notas fiscais em postos fiscais da SEFAZ/CE."
    },
    {
        uf: "GO",
        nome: "Goiás",
        orgao_policia_civil: "GELP - Gerência de Fiscalização de Produtos Controlados (PCGO)",
        base_legal: "Decreto Estadual nº 4.852/1997 e normas PCGO",
        aliquota_icms_interna: "19%",
        aliquota_icms_interestadual: "12% / 4%",
        regras_difal: "DIFAL aplicável de 7% a 15% conforme estado de origem.",
        exigencias_documentais: "Autorização de Produtos Controlados emitida pela Polícia Civil de Goiás."
    },
    {
        uf: "DF",
        nome: "Distrito Federal",
        orgao_policia_civil: "DPE - Divisão de Produtos Controlados (PCDF)",
        base_legal: "Decreto Distrital nº 18.955/1997 e portarias PCDF",
        aliquota_icms_interna: "20%",
        aliquota_icms_interestadual: "12% / 4%",
        regras_difal: "Recolhimento do diferencial de alíquota distrital.",
        exigencias_documentais: "Alvará de Funcionamento e Regularidade da PCDF para manuseio de químicos."
    },
    {
        uf: "ES",
        nome: "Espírito Santo",
        orgao_policia_civil: "DFPC - Divisão de Fiscalização de Produtos Controlados (PCES)",
        base_legal: "Decreto Estadual nº 1.090-R e normas PCES",
        aliquota_icms_interna: "17%",
        aliquota_icms_interestadual: "12% / 4%",
        regras_difal: "DIFAL de 5% sobre mercadorias vindas do Sudeste ou 13% de mercadorias importadas.",
        exigencias_documentais: "Certidão de vistoria da PCES e anotação do CRQ/CRF do responsável."
    },
    {
        uf: "MT",
        nome: "Mato Grosso",
        orgao_policia_civil: "Gerência de Fiscalização de Produtos Controlados (PCMT)",
        base_legal: "Decreto Estadual nº 2.212/2014 e portarias PCMT",
        aliquota_icms_interna: "17%",
        aliquota_icms_interestadual: "7% / 4%",
        regras_difal: "Forte fiscalização eletrônica de trânsito de mercadorias no SEFAZ/MT.",
        exigencias_documentais: "Alvará da PCMT e licença ambiental quando exigida pelo órgão estadual (SEMA)."
    },
    {
        uf: "MS",
        nome: "Mato Grosso do Sul",
        orgao_policia_civil: "Divisão de Fiscalização de Produtos Controlados (PCMS)",
        base_legal: "Decreto Estadual nº 9.203/1998 e normas PCMS",
        aliquota_icms_interna: "17%",
        aliquota_icms_interestadual: "7% / 4%",
        regras_difal: "DIFAL de 10% nas aquisições interestaduais.",
        exigencias_documentais: "Alvará de Produtos Controlados emitido pela PCMS."
    },
    {
        uf: "AM",
        nome: "Amazonas",
        orgao_policia_civil: "Delegacia Especializada de Produtos Controlados (PCAM)",
        base_legal: "Regulamento do ICMS do Amazonas e normas da Zona Franca de Manaus",
        aliquota_icms_interna: "20%",
        aliquota_icms_interestadual: "7% / 4%",
        regras_difal: "Empresas no Polo Industrial de Manaus podem ter incentivos de SUFRAMA, mas compras controladas exigem licença rigorosa da Polícia Federal.",
        exigencias_documentais: "Autorização da PCAM e cadastro no SUFRAMA (se aplicável)."
    },
    {
        uf: "PA",
        nome: "Pará",
        orgao_policia_civil: "Divisão de Polícia Administrativa - DPA (PCPA)",
        base_legal: "Decreto Estadual nº 4.676/2001 e normas PCPA",
        aliquota_icms_interna: "19%",
        aliquota_icms_interestadual: "7% / 4%",
        regras_difal: "DIFAL de 12% na entrada de produtos do Sul/Sudeste.",
        exigencias_documentais: "Alvará da DPA/PCPA e menção obrigatória do Responsável Técnico."
    },
    {
        uf: "MA",
        nome: "Maranhão",
        orgao_policia_civil: "Setor de Produtos Controlados da Polícia Civil do Maranhão",
        base_legal: "Decreto Estadual nº 19.714/2003",
        aliquota_icms_interna: "22%",
        aliquota_icms_interestadual: "7% / 4%",
        regras_difal: "Alíquota interna elevada: DIFAL atinge 15% na aquisição do Centro-Sul.",
        exigencias_documentais: "Licença da PCMA e guia de recolhimento prévio se exigido pela SEFAZ/MA."
    },
    {
        uf: "RN",
        nome: "Rio Grande do Norte",
        orgao_policia_civil: "Coordenação de Armas e Produtos Controlados (PCRN)",
        base_legal: "Decreto Estadual nº 13.640/1997 e normas PCRN",
        aliquota_icms_interna: "20%",
        aliquota_icms_interestadual: "7% / 4%",
        regras_difal: "DIFAL de 13% na entrada interestadual.",
        exigencias_documentais: "Certidão de Regularidade da PCRN para insumos químicos."
    },
    {
        uf: "PB",
        nome: "Paraíba",
        orgao_policia_civil: "Divisão de Fiscalização de Produtos Controlados (PCPB)",
        base_legal: "Decreto Estadual nº 18.930/1997",
        aliquota_icms_interna: "20%",
        aliquota_icms_interestadual: "7% / 4%",
        regras_difal: "DIFAL de 13% aplicável a compras interestaduais.",
        exigencias_documentais: "Alvará anual da PCPB."
    },
    {
        uf: "AL",
        nome: "Alagoas",
        orgao_policia_civil: "Divisão de Produtos Controlados (PCAL)",
        base_legal: "Decreto Estadual nº 35.245/1991 e normas PCAL",
        aliquota_icms_interna: "19%",
        aliquota_icms_interestadual: "7% / 4%",
        regras_difal: "DIFAL de 12% nas aquisições interestaduais.",
        exigencias_documentais: "Alvará de Funcionamento da PCAL para armazenamento químico."
    },
    {
        uf: "PI",
        nome: "Piauí",
        orgao_policia_civil: "Setor de Fiscalização da Polícia Civil do Piauí",
        base_legal: "Decreto Estadual nº 13.500/2008",
        aliquota_icms_interna: "21%",
        aliquota_icms_interestadual: "7% / 4%",
        regras_difal: "DIFAL de 14% para materiais provenientes do Sul/Sudeste.",
        exigencias_documentais: "Certidão de Vistoria da PCPI."
    },
    {
        uf: "SE",
        nome: "Sergipe",
        orgao_policia_civil: "Divisão de Fiscalização de Produtos Controlados (PCSE)",
        base_legal: "Decreto Estadual nº 21.400/2002",
        aliquota_icms_interna: "19%",
        aliquota_icms_interestadual: "7% / 4%",
        regras_difal: "DIFAL de 12% na entrada de mercadorias interestaduais.",
        exigencias_documentais: "Alvará de licença da PCSE."
    },
    {
        uf: "TO",
        nome: "Tocantins",
        orgao_policia_civil: "Delegacia de Polícia Fazendária e Produtos Controlados (PCTO)",
        base_legal: "Decreto Estadual nº 2.912/2006",
        aliquota_icms_interna: "20%",
        aliquota_icms_interestadual: "7% / 4%",
        regras_difal: "DIFAL de 13% nas compras com origem no Centro-Sul.",
        exigencias_documentais: "Licença de Operação da PCTO para reagentes."
    },
    {
        uf: "RO",
        nome: "Rondônia",
        orgao_policia_civil: "Departamento de Polícia Administrativa e Fiscalização (PCRO)",
        base_legal: "Decreto Estadual nº 22.721/2018",
        aliquota_icms_interna: "19.5%",
        aliquota_icms_interestadual: "7% / 4%",
        regras_difal: "DIFAL de 12.5% nas compras interestaduais.",
        exigencias_documentais: "Autorização de Produtos Controlados da PCRO."
    },
    {
        uf: "AC",
        nome: "Acre",
        orgao_policia_civil: "Setor de Fiscalização Administrativa (PCAC)",
        base_legal: "Decreto Estadual nº 008/1998",
        aliquota_icms_interna: "19%",
        aliquota_icms_interestadual: "7% / 4%",
        regras_difal: "DIFAL de 12% para insumos vindos de outros estados.",
        exigencias_documentais: "Alvará da PCAC e rigoroso controle de fronteira (PF)."
    },
    {
        uf: "AP",
        nome: "Amapá",
        orgao_policia_civil: "Divisão de Produtos Controlados (PCAP)",
        base_legal: "Decreto Estadual nº 2.269/1998",
        aliquota_icms_interna: "18%",
        aliquota_icms_interestadual: "7% / 4%",
        regras_difal: "DIFAL de 11% para remessas do Sul/Sudeste.",
        exigencias_documentais: "Alvará da PCAP."
    },
    {
        uf: "RR",
        nome: "Roraima",
        orgao_policia_civil: "Divisão de Fiscalização de Armas e Munições (PCRR)",
        base_legal: "Decreto Estadual nº 4.335-E/2001",
        aliquota_icms_interna: "20%",
        aliquota_icms_interestadual: "7% / 4%",
        regras_difal: "DIFAL de 13% em compras de outras regiões.",
        exigencias_documentais: "Alvará da PCRR e controle sanitário e federal reforçado."
    }
];

module.exports = {
    REGRAS_FEDERAIS,
    ESTADOS_BRASIL
};
