import { PROVINCE_LIST } from '@/components/admin/onboarding/types';
import { getDisplayRootDomain } from '@/lib/siteUrls';

export type TutelaType = 'MED_K12' | 'MESCTI_HIGHER_ED';
export type PersonaKey = 'direcao' | 'docentes' | 'estudantes';

export const ROOT_DOMAIN = getDisplayRootDomain();
export const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL || '/admin';
export const PORTAL_URL = process.env.NEXT_PUBLIC_PORTAL_URL || '/portal';
export const WHATSAPP_NUMBER = (process.env.NEXT_PUBLIC_SALES_WHATSAPP || '244923000000').replace(/\D/g, '');
export { PROVINCE_LIST };

export const SIMULATOR_COLORS = [
  { hex: '#0D9488', label: 'Verde EduLink' },
  { hex: '#1D4ED8', label: 'Azul Académico' },
  { hex: '#1E3A5F', label: 'Azul Marinho' },
  { hex: '#991B1B', label: 'Bordô Clássico' },
  { hex: '#B45309', label: 'Âmbar Dourado' },
];

export const PERSONA_DATA: Record<
  PersonaKey,
  {
    title: string;
    subtitle: string;
    highlight: string;
    items: { title: string; desc: string }[];
  }
> = {
  direcao: {
    title: 'Para Direções Escolares e Secretarias',
    subtitle:
      'Entregue os documentos uma única vez e receba a escola digital pronta a operar — sem depender de agências web nem de equipas técnicas internas.',
    highlight: 'Operação 100% em Kwanzas com Fatura Eletrónica AGT',
    items: [
      {
        title: 'Site Oficial + Domínio .edu.ao Chave-na-Mão',
        desc: 'Submetemos o pedido no DNS.AO, configuramos Cloudflare/SSL automaticamente e publicamos o site pronto para auditoria da Google e Microsoft.',
      },
      {
        title: 'Provisionamento em Lote via CSV',
        desc: 'Importe 500 ou 2.000 alunos numa só ação. Quando uma matrícula é suspensa, os acessos em nuvem e o QR Code são revogados automaticamente.',
      },
      {
        title: 'Conformidade Legal (APD, Lei n.º 22/11)',
        desc: 'Geração automática do dossiê de notificação à Agência de Proteção de Dados e termos digitais de consentimento parental para alunos menores.',
      },
      {
        title: 'Prestígio Imediato nas Matrículas',
        desc: 'Posicione o colégio ao nível das escolas internacionais com e-mail próprio, Classroom, Teams e Cartão Digital verificável.',
      },
    ],
  },
  docentes: {
    title: 'Para Professores e Coordenação Pedagógica',
    subtitle:
      'Ferramentas profissionais gratuitas para preparar aulas, colaborar com turmas e valorizar a carreira docente.',
    highlight: 'Licenças Faculty dedicadas + Canva Educação gratuito (K-12)',
    items: [
      {
        title: 'Canva para Educação 100% Gratuito (MED)',
        desc: 'Acesso imediato a apresentações, fichas, banco de imagens e salas colaborativas para professores do ensino primário, secundário e técnico.',
      },
      {
        title: 'Google Classroom & Microsoft Teams',
        desc: 'Distribua tarefas, corrija trabalhos, realize aulas híbridas e organize materiais no Drive e OneDrive com uma única palavra-passe.',
      },
      {
        title: 'Credencial Docente Verificada',
        desc: 'Cartão Digital oficial que comprova o vínculo docente ativo para acesso a programas académicos (GitHub Teachers, Figma, JetBrains).',
      },
      {
        title: 'Comunicação Institucional Segura',
        desc: 'Deixe de misturar contas pessoais de WhatsApp e Gmail nas comunicações oficiais com turmas e encarregados.',
      },
    ],
  },
  estudantes: {
    title: 'Para Estudantes e Encarregados de Educação',
    subtitle:
      'Um Passaporte Académico Digital no telemóvel que funciona mesmo offline e liga os estudantes às ferramentas educativas globais.',
    highlight: 'PWA leve otimizada para redes móveis 3G/4G em Angola',
    items: [
      {
        title: 'E-mail Institucional Próprio (@escola.edu.ao)',
        desc: 'Identidade digital profissional desde o ensino geral até à universidade, pronta para Google Workspace e Office 365 Web.',
      },
      {
        title: 'Cartão de Estudante Digital com QR Code',
        desc: 'Com assinatura digital segura para validação instantânea na portaria ou em parceiros, mantendo o último cartão acessível offline.',
      },
      {
        title: 'Acesso a Benefícios Globais',
        desc: 'Elegibilidade facilitada para GitHub Student Developer Pack, Figma for Education, JetBrains e programas universitários internacionais.',
      },
      {
        title: 'Privacidade Protegida para Menores',
        desc: 'Consentimento parental registado e verificação externa que devolve apenas ATIVO ou INATIVO, sem expor dados sensíveis do aluno.',
      },
    ],
  },
};

export const PLANS = [
  {
    code: 'ESSENCIAL',
    name: 'EduLink Essencial',
    badge: 'Colégios até 400 alunos',
    price: 240000,
    period: '/ ano',
    setupNote: 'Setup único: 150.000 Kz (50% a 100% isento nos pilotos)',
    featured: false,
    features: [
      'Até 500 contas institucionais (.edu.ao)',
      'Site institucional automático com SSL',
      'Aprovação e provisionamento Google Workspace + Canva K-12',
      'Passaporte Académico Digital (PWA + QR Code)',
      'Dossiê base APD (Lei n.º 22/11) e consentimento parental',
      'Fatura Eletrónica AGT em Kwanzas (MCX / KWiK / IBAN)',
    ],
  },
  {
    code: 'PRO',
    name: 'EduLink Pro',
    badge: 'Mais Escolhido · Médios e Grandes Colégios',
    price: 480000,
    period: '/ ano',
    setupNote: 'Setup único: 150.000 Kz · ~550 Kz/aluno em 900 alunos',
    featured: true,
    features: [
      'Contas institucionais ilimitadas (Alunos + Docentes)',
      'Google Workspace + Microsoft 365 Education (A1) em simultâneo',
      'Login Único (SSO Keycloak) + Canva para Educação',
      'Importação CSV em lote e revogação automática de matrículas',
      'Dossiê completo APD + página pública de Privacidade',
      'Pronto para integração ERP local (Fase 2) + Suporte Prioritário',
    ],
  },
  {
    code: 'CAMPUS',
    name: 'EduLink Campus',
    badge: 'Universidades & Institutos Superiores (IES)',
    price: 1200000,
    period: '/ ano',
    setupNote: 'Implementação dedicada sob projeto MESCTI',
    featured: false,
    features: [
      'Multi-faculdade e departamentos ilimitados',
      'Início de Sessão Único (Google e Microsoft)',
      'Dossiê público e submissão a SheerID, UNiDAYS e GitHub Campus',
      'API de integração com ERP Académico + Verificação POS/Portaria',
      'Acompanhamento dedicado de conformidade APD e AGT',
      'Clube de Benefícios institucional e marca personalizada',
    ],
  },
];

export const FAQ_ITEMS = [
  {
    q: 'O nosso colégio ainda não tem site nem domínio .edu.ao. Podemos aderir na mesma?',
    a: 'Sim — esse é exatamente o foco da EduLink. Durante a demonstração geramos em minutos um endereço provisório (escola.edulink.ao) e, assim que validam o Alvará MED/MESCTI, NIF e BI do diretor, tratamos do registo do domínio .edu.ao, DNS automático e site institucional incluídos no setup.',
  },
  {
    q: 'E se a escola já tiver um site em .co.ao ou .com?',
    a: 'Pode escolher duas vias sem perder o endereço atual: manter o site comercial atual e criar o .edu.ao dedicado para os e-mails e plataformas académicas, ou aprovar o Google Workspace e Microsoft 365 diretamente no domínio .co.ao/.com que já utiliza.',
  },
  {
    q: 'O Canva para Educação é gratuito para todas as instituições?',
    a: 'O Canva para Educação é 100% gratuito para escolas acreditadas pelo MED (ensino primário, secundário e técnico-profissional — K-12). Para universidades e institutos superiores (MESCTI), o Canva disponibiliza o plano Canva para Universidades com desconto institucional, mantendo-se 100% gratuitos o Google Workspace Fundamentals, Microsoft 365 A1 e GitHub Education.',
  },
  {
    q: 'As contas e o domínio ficam em nome da EduLink ou da escola?',
    a: 'A titularidade legal do domínio .edu.ao, do ambiente Google/Microsoft e dos dados académicos pertence 100% à instituição de ensino. A EduLink atua como intermediária e administradora técnica autorizada mediante Mandato Técnico assinado pela direção.',
  },
  {
    q: 'Como é que a EduLink ajuda a evitar coimas da APD (Lei n.º 22/11)?',
    a: 'A plataforma aplica minimização de dados, disponibiliza uma página pública de Política de Privacidade no domínio da escola, gera o dossiê estruturado de notificação à APD e oferece fluxo digital de recolha de consentimento parental para alunos menores.',
  },
  {
    q: 'Os pagamentos são feitos em Dólares ou em Kwanzas?',
    a: '100% em Kwanzas (AOA), via Multicaixa Express, KWiK ou transferência IBAN, com emissão automática de Fatura Eletrónica com IVA e estrutura SAF-T (AO) conforme as exigências da AGT.',
  },
];

export const PROBLEM_HIGHLIGHTS = [
  {
    tag: 'DNS.AO + Site',
    title: 'Fim da barreira técnica',
    desc: 'Registo .edu.ao assistido, DNS automático na Cloudflare e site institucional incluído sem custos de agência.',
  },
  {
    tag: 'Google · MS · Canva',
    title: 'Acreditação chave-na-mão',
    desc: 'Preparamos e acompanhamos a aprovação oficial usando o Alvará MED/MESCTI em nome da sua instituição.',
  },
  {
    tag: 'APD · Lei n.º 22/11',
    title: 'Conformidade sem coimas',
    desc: 'Dossiê pronto para notificação à APD, política pública de privacidade e consentimentos parentais digitais.',
  },
  {
    tag: 'AOA · AGT 2027',
    title: 'Faturação 100% em Kwanzas',
    desc: 'Sem cartões em dólares: pague via MCX, KWiK ou IBAN com Fatura Eletrónica certificável e SAF-T (AO).',
  },
];

export const HOW_IT_WORKS_STEPS = [
  {
    step: 'Dia 1',
    title: 'Onboarding & Site Demo',
    desc: 'A secretaria envia Alvará MED/MESCTI, NIF, BI do diretor e Mandato Técnico. O site de demonstração fica online em minutos.',
  },
  {
    step: 'Dias 2–4',
    title: 'Domínio .edu.ao & DNS',
    desc: 'Submetemos o domínio via Registrar DNS.AO, configuramos Cloudflare com TXT, MX, SPF, DKIM, DMARC e SSL automático.',
  },
  {
    step: 'Dias 5–14',
    title: 'Aprovação Google, MS & Canva',
    desc: 'Acompanhamos a revisão académica no Google Workspace, Microsoft 365 A1 e Canva Educação + geramos o dossiê APD.',
  },
  {
    step: 'Go-Live',
    title: 'CSV, SSO & Cartão QR',
    desc: 'Importação em lote das turmas, criação automática de e-mails e distribuição do Passaporte Académico Digital aos alunos.',
  },
];
