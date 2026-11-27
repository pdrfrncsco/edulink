'use client';

import React, { useMemo, useState } from 'react';
import { getDisplayRootDomain } from '@/lib/siteUrls';

type TutelaType = 'MED_K12' | 'MESCTI_HIGHER_ED';
type PersonaKey = 'direcao' | 'docentes' | 'estudantes';

const ROOT_DOMAIN = getDisplayRootDomain();

const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL || '/admin';
const PORTAL_URL = process.env.NEXT_PUBLIC_PORTAL_URL || '/portal';
const WHATSAPP_NUMBER = (process.env.NEXT_PUBLIC_SALES_WHATSAPP || '244923000000').replace(/\D/g, '');

function slugifySchool(input: string): string {
  const cleaned = input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
  return cleaned || 'colegio-horizonte';
}

function formatKz(value: number): string {
  return (
    new Intl.NumberFormat('pt-AO', {
      maximumFractionDigits: 0,
    }).format(Math.round(value)) + ' Kz'
  );
}

const PERSONA_DATA: Record<
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
        title: 'Blindagem Regulatória (APD — Lei n.º 22/11)',
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
      'Um Passaporte Académico Digital no telemóvel que funciona mesmo offline e abre portas para o ecossistema educativo global.',
    highlight: 'PWA leve otimizada para redes móveis 3G/4G em Angola',
    items: [
      {
        title: 'E-mail Institucional Próprio (@escola.edu.ao)',
        desc: 'Identidade digital profissional desde o ensino geral até à universidade, pronta para Google Workspace e Office 365 Web.',
      },
      {
        title: 'Cartão de Estudante Digital com QR Code',
        desc: 'Assinado criptograficamente via JWT com validação instantânea na portaria ou em parceiros, mantendo o último cartão acessível offline.',
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

const PLANS = [
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
      'SSO Institucional (SAML 2.0 / OIDC) Google + Microsoft Entra ID',
      'Dossiê público e submissão a SheerID, UNiDAYS e GitHub Campus',
      'API de integração com ERP Académico + Verificação POS/Portaria',
      'Acompanhamento dedicado de conformidade APD e AGT',
      'Clube de Benefícios institucional e marca personalizada',
    ],
  },
];

const FAQ_ITEMS = [
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

export default function EduLinkLanding() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Simulador Interativo (Hero)
  const [simSchoolName, setSimSchoolName] = useState('Colégio Horizonte de Luanda');
  const [simTutela, setSimTutela] = useState<TutelaType>('MED_K12');
  const [simColor, setSimColor] = useState('#0D9488');

  // Alternador de Personas
  const [activePersona, setActivePersona] = useState<PersonaKey>('direcao');

  // Calculadora ROI / "Custo Zero"
  const [calcStudents, setCalcStudents] = useState(450);
  const [calcTutela, setCalcTutela] = useState<TutelaType>('MED_K12');
  const [cardFeeAoa, setCardFeeAoa] = useState(1500);

  // FAQ Acordeão
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);

  // Modal de Pedido de Demo
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [demoDirector, setDemoDirector] = useState('');
  const [demoSchool, setDemoSchool] = useState('');
  const [demoPhone, setDemoPhone] = useState('');
  const [demoProvince, setDemoProvince] = useState('Luanda');
  const [demoSubmitted, setDemoSubmitted] = useState(false);

  const simSlug = useMemo(() => slugifySchool(simSchoolName), [simSchoolName]);
  const simEduDomain = `${simSlug}.edu.ao`;
  const simPreviewDomain = `${simSlug}.${ROOT_DOMAIN}`;

  const roiMetrics = useMemo(() => {
    let planName = 'EduLink Essencial';
    let annualPrice = 240000;
    if (calcTutela === 'MESCTI_HIGHER_ED' || calcStudents > 1500) {
      planName = 'EduLink Campus';
      annualPrice = 1200000;
    } else if (calcStudents > 400) {
      planName = 'EduLink Pro';
      annualPrice = 480000;
    }

    const costPerStudentYear = annualPrice / Math.max(calcStudents, 1);
    const totalCardRevenue = calcStudents * cardFeeAoa;
    const netSurplus = totalCardRevenue - annualPrice;
    const agencySavingsMin = 500000; // Custo médio site institucional + configuração e-mails numa agência em Luanda

    return {
      planName,
      annualPrice,
      costPerStudentYear,
      totalCardRevenue,
      netSurplus,
      agencySavingsMin,
    };
  }, [calcStudents, calcTutela, cardFeeAoa]);

  const openDemoWithContext = (prefillSchool?: string) => {
    setDemoSchool(prefillSchool || simSchoolName);
    setDemoSubmitted(false);
    setDemoModalOpen(true);
  };

  const handleDemoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDemoSubmitted(true);
  };

  const whatsappHref = useMemo(() => {
    const text = encodeURIComponent(
      `Olá equipa EduLink Angola! Sou ${demoDirector || 'da direção'} de "${demoSchool || simSchoolName}" (${demoProvince}). Gostaria de agendar a demonstração do domínio .edu.ao, site automático e licenças Google/Microsoft/Canva. Contacto: ${demoPhone || 'a confirmar'}.`
    );
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`;
  }, [demoDirector, demoSchool, demoPhone, demoProvince, simSchoolName]);

  const persona = PERSONA_DATA[activePersona];

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col">
      {/* NAVBAR STICKY */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <a href="#" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-700 text-white font-extrabold text-lg flex items-center justify-center shadow-sm">
              E
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight text-stone-900 block leading-none">
                EduLink
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-teal-700">
                Angola · .edu.ao
              </span>
            </div>
          </a>

          <nav aria-label="Navegação principal" className="hidden lg:flex items-center gap-7 text-xs font-semibold text-stone-600">
            <a href="#simulador" className="hover:text-teal-800 transition">Simulador</a>
            <a href="#ecossistema" className="hover:text-teal-800 transition">Benefícios</a>
            <a href="#como-funciona" className="hover:text-teal-800 transition">Como Funciona</a>
            <a href="#calculadora" className="hover:text-teal-800 transition">Calculadora AOA</a>
            <a href="#planos" className="hover:text-teal-800 transition">Planos</a>
            <a href="#faq" className="hover:text-teal-800 transition">FAQ</a>
          </nav>

          <div className="hidden sm:flex items-center gap-2.5">
            <a
              href={PORTAL_URL}
              className="px-3.5 py-2 rounded-xl border border-stone-300 bg-white text-xs font-semibold text-stone-700 hover:bg-stone-50 transition"
            >
              Portal Aluno / Docente
            </a>
            <a
              href={ADMIN_URL}
              className="px-4 py-2 rounded-xl bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800 transition shadow-sm"
            >
              Entrar na Secretaria
            </a>
          </div>

          <button
            type="button"
            aria-expanded={mobileMenuOpen}
            aria-label="Abrir menu"
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="lg:hidden rounded-xl border border-stone-300 px-3 py-2 text-xs font-semibold text-stone-800"
          >
            {mobileMenuOpen ? 'Fechar' : 'Menu'}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-stone-200 bg-white px-4 py-4 space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-stone-700">
              <a href="#simulador" onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-lg hover:bg-stone-50">Simulador</a>
              <a href="#ecossistema" onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-lg hover:bg-stone-50">Benefícios</a>
              <a href="#como-funciona" onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-lg hover:bg-stone-50">Como Funciona</a>
              <a href="#calculadora" onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-lg hover:bg-stone-50">Calculadora AOA</a>
              <a href="#planos" onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-lg hover:bg-stone-50">Planos</a>
              <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-lg hover:bg-stone-50">FAQ</a>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-100">
              <a href={PORTAL_URL} className="text-center py-2.5 rounded-xl border border-stone-300 text-xs font-semibold text-stone-800">
                Portal PWA
              </a>
              <a href={ADMIN_URL} className="text-center py-2.5 rounded-xl bg-teal-700 text-white text-xs font-semibold">
                Secretaria
              </a>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        {/* HERO + SIMULADOR INTERATIVO IMEDIATO */}
        <section id="simulador" className="relative overflow-hidden border-b border-stone-200 bg-gradient-to-b from-white via-stone-50 to-teal-50/40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Coluna Esquerda: Proposta de Valor */}
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3.5 py-1 text-xs font-semibold text-teal-900">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
                Programa Piloto Luanda 2026/2027 · Faturação AGT &amp; APD
              </div>

              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-stone-900 leading-[1.1]">
                A sua escola em Angola com{' '}
                <span className="text-teal-700">.edu.ao</span>, Google, Microsoft e Canva —{' '}
                <span className="underline decoration-amber-400 decoration-4 underline-offset-4">
                  sem burocracia
                </span>
                .
              </h1>

              <p className="text-base sm:text-lg text-stone-600 leading-relaxed max-w-xl">
                A <strong>EduLink</strong> entrega num único pacote em Kwanzas o registo do domínio educacional, o site oficial automático, contas institucionais para alunos e professores, Passaporte Digital QR e blindagem perante a <strong>APD (Lei n.º 22/11)</strong>.
              </p>

              <div className="flex flex-wrap gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => openDemoWithContext()}
                  className="px-6 py-3.5 rounded-xl bg-teal-700 text-white text-sm font-bold hover:bg-teal-800 transition shadow-md"
                >
                  Solicitar Demonstração Gratuita
                </button>
                <a
                  href={ADMIN_URL}
                  className="px-6 py-3.5 rounded-xl border border-stone-300 bg-white text-stone-800 text-sm font-bold hover:bg-stone-50 transition"
                >
                  Criar Conta da Secretaria →
                </a>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-stone-200/80 text-xs">
                <div>
                  <p className="text-lg sm:text-xl font-extrabold text-stone-900">5 min</p>
                  <p className="text-stone-500">Para gerar o site de demonstração</p>
                </div>
                <div>
                  <p className="text-lg sm:text-xl font-extrabold text-stone-900">100% AOA</p>
                  <p className="text-stone-500">MCX, KWiK, IBAN e Fatura AGT</p>
                </div>
                <div>
                  <p className="text-lg sm:text-xl font-extrabold text-stone-900">Lei 22/11</p>
                  <p className="text-stone-500">Dossiê APD e termos parentais</p>
                </div>
              </div>
            </div>

            {/* Coluna Direita: Simulador Ao Vivo */}
            <div className="lg:col-span-6">
              <div className="rounded-3xl border border-stone-200 bg-white p-5 sm:p-6 shadow-xl space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 block">
                      Simulador Instantâneo
                    </span>
                    <h2 className="text-sm font-bold text-stone-900">
                      Veja como fica a identidade digital da sua escola
                    </h2>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {['#0D9488', '#1D4ED8', '#1E3A5F', '#991B1B', '#B45309'].map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        aria-label={`Selecionar cor ${hex}`}
                        onClick={() => setSimColor(hex)}
                        className={`w-5 h-5 rounded-full border-2 transition ${
                          simColor === hex ? 'border-stone-900 scale-110' : 'border-white shadow-sm'
                        }`}
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </div>
                </div>

                {/* Controlos do Simulador */}
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                  <div className="sm:col-span-3">
                    <label htmlFor="sim-school-name" className="block text-[11px] font-semibold text-stone-600 mb-1">
                      Nome da Instituição
                    </label>
                    <input
                      id="sim-school-name"
                      type="text"
                      value={simSchoolName}
                      onChange={(e) => setSimSchoolName(e.target.value)}
                      placeholder="Ex.: Colégio Esperança de Luanda"
                      className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs font-medium text-stone-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <span className="block text-[11px] font-semibold text-stone-600 mb-1">Tutela</span>
                    <div className="grid grid-cols-2 rounded-xl bg-stone-100 p-1 text-[11px] font-semibold">
                      <button
                        type="button"
                        onClick={() => setSimTutela('MED_K12')}
                        className={`py-1.5 rounded-lg transition ${
                          simTutela === 'MED_K12' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'
                        }`}
                      >
                        MED (K-12)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSimTutela('MESCTI_HIGHER_ED')}
                        className={`py-1.5 rounded-lg transition ${
                          simTutela === 'MESCTI_HIGHER_ED' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'
                        }`}
                      >
                        MESCTI (IES)
                      </button>
                    </div>
                  </div>
                </div>

                {/* Pré-visualização combinada: Site + Cartão Digital */}
                <div className="rounded-2xl border border-stone-200 overflow-hidden bg-stone-50">
                  <div className="bg-stone-100 border-b border-stone-200 px-3 py-2 flex items-center justify-between text-[11px] font-mono text-stone-600">
                    <span className="truncate">https://{simEduDomain}</span>
                    <span className="shrink-0 rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-sans font-bold">
                      SSL Automático
                    </span>
                  </div>

                  <div className="p-4 grid grid-cols-1 sm:grid-cols-12 gap-4 items-stretch">
                    {/* Cartão Digital da Escola */}
                    <div
                      className="sm:col-span-7 rounded-2xl p-4 text-white flex flex-col justify-between space-y-3 shadow-md"
                      style={{
                        background: `linear-gradient(135deg, ${simColor} 0%, #111827 130%)`,
                      }}
                    >
                      <div className="flex items-start justify-between gap-2 border-b border-white/15 pb-2.5">
                        <div className="min-w-0">
                          <span className="text-[9px] uppercase tracking-wider text-white/75 block">
                            Passaporte Académico Digital
                          </span>
                          <p className="text-xs font-extrabold truncate">
                            {simSchoolName.trim() || 'Sua Instituição'}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full bg-emerald-400/20 border border-emerald-300/40 px-2 py-0.5 text-[9px] font-bold text-emerald-100">
                          ATIVO
                        </span>
                      </div>

                      <div className="space-y-1">
                        <p className="text-[10px] text-white/75 uppercase">E-mail Gerado Automaticamente</p>
                        <p className="text-xs font-bold">Ana Luísa Domingos · 11.ª Classe</p>
                        <p className="text-[11px] font-mono text-white/90 break-all">
                          ana.domingos@{simEduDomain}
                        </p>
                      </div>

                      <div className="flex items-center justify-between gap-2 bg-white/10 rounded-xl p-2 text-[10px]">
                        <span>Demo imediata: <strong className="font-mono">{simPreviewDomain}</strong></span>
                      </div>
                    </div>

                    {/* Licenças Desbloqueadas */}
                    <div className="sm:col-span-5 bg-white rounded-2xl border border-stone-200 p-3.5 space-y-2.5 flex flex-col justify-between">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                        Ecossistema Desbloqueado
                      </p>
                      <ul className="space-y-1.5 text-[11px] text-stone-700">
                        <li className="flex items-center justify-between gap-1">
                          <span>Google Workspace</span>
                          <span className="font-bold text-emerald-700">Grátis</span>
                        </li>
                        <li className="flex items-center justify-between gap-1">
                          <span>Microsoft 365 A1</span>
                          <span className="font-bold text-emerald-700">Grátis</span>
                        </li>
                        <li className="flex items-center justify-between gap-1">
                          <span>Canva Educação</span>
                          <span
                            className={`font-bold ${
                              simTutela === 'MED_K12' ? 'text-emerald-700' : 'text-amber-700'
                            }`}
                          >
                            {simTutela === 'MED_K12' ? 'Grátis (K-12)' : 'Plano Campus'}
                          </span>
                        </li>
                        <li className="flex items-center justify-between gap-1">
                          <span>GitHub &amp; Figma Edu</span>
                          <span className="font-bold text-emerald-700">Elegível</span>
                        </li>
                        <li className="flex items-center justify-between gap-1">
                          <span>Cartão QR Offline</span>
                          <span className="font-bold text-teal-800">Incluído</span>
                        </li>
                      </ul>
                      <button
                        type="button"
                        onClick={() => openDemoWithContext(simSchoolName)}
                        className="w-full mt-1 rounded-xl bg-stone-900 py-2 text-[11px] font-semibold text-white hover:bg-stone-800 transition"
                      >
                        Reservar {simEduDomain}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAIXA DOS 4 BLOQUEIOS QUE A EDULINK ELIMINA */}
        <section className="bg-stone-900 text-stone-100 py-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
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
                  title: 'Blindagem contra coimas',
                  desc: 'Dossiê pronto para notificação à APD, política pública de privacidade e consentimentos parentais digitais.',
                },
                {
                  tag: 'AOA · AGT 2027',
                  title: 'Faturação 100% em Kwanzas',
                  desc: 'Sem cartões em dólares: pague via MCX, KWiK ou IBAN com Fatura Eletrónica certificável e SAF-T (AO).',
                },
              ].map((item) => (
                <div key={item.tag} className="space-y-1.5 border-l-2 border-teal-500 pl-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400">
                    {item.tag}
                  </span>
                  <h3 className="text-sm font-bold text-white">{item.title}</h3>
                  <p className="text-xs text-stone-300 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* BENEFÍCIOS INTERATIVOS POR PERSONA */}
        <section id="ecossistema" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2 max-w-2xl">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-700">
                Uma Plataforma, Três Públicos Beneficiados
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
                Valor imediato para a direção, professores e estudantes
              </h2>
            </div>

            <div role="tablist" aria-label="Selecionar perfil" className="inline-flex rounded-2xl bg-stone-200/80 p-1 gap-1 self-start">
              {[
                { id: 'direcao' as PersonaKey, label: 'Direção & Secretaria' },
                { id: 'docentes' as PersonaKey, label: 'Docentes' },
                { id: 'estudantes' as PersonaKey, label: 'Estudantes' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={activePersona === tab.id}
                  onClick={() => setActivePersona(tab.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                    activePersona === tab.id
                      ? 'bg-white text-teal-900 shadow-sm'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-stone-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-4">
              <div className="space-y-1 max-w-2xl">
                <h3 className="text-lg font-bold text-stone-900">{persona.title}</h3>
                <p className="text-sm text-stone-600">{persona.subtitle}</p>
              </div>
              <span className="rounded-full bg-teal-50 border border-teal-200 px-3.5 py-1.5 text-xs font-semibold text-teal-900">
                {persona.highlight}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {persona.items.map((feat, idx) => (
                <div key={feat.title} className="rounded-2xl border border-stone-200 bg-stone-50/60 p-5 space-y-2">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-lg bg-teal-700 text-white text-xs font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <h4 className="text-sm font-bold text-stone-900">{feat.title}</h4>
                  </div>
                  <p className="text-xs text-stone-600 leading-relaxed">{feat.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* COMO FUNCIONA (CHAVE-NA-MÃO EM 4 ETAPAS) */}
        <section id="como-funciona" className="bg-white border-y border-stone-200 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
            <div className="max-w-2xl space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-700">
                Processo Assistido de Ponta a Ponta
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
                Da entrega do Alvará à escola digital ativa em 4 passos
              </h2>
              <p className="text-sm text-stone-600">
                A titularidade do domínio e das contas permanece sempre em nome da instituição. A equipa EduLink executa toda a parte técnica e documental.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
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
              ].map((item, idx) => (
                <div key={item.title} className="rounded-2xl border border-stone-200 bg-stone-50 p-5 flex flex-col justify-between space-y-4">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-teal-100 text-teal-900">
                        {item.step}
                      </span>
                      <span className="text-xs font-mono font-bold text-stone-400">0{idx + 1}</span>
                    </div>
                    <h3 className="text-base font-bold text-stone-900">{item.title}</h3>
                    <p className="text-xs text-stone-600 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CALCULADORA INTERATIVA DE CUSTO ZERO (AOA) */}
        <section id="calculadora" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="rounded-3xl border border-stone-200 bg-white p-6 sm:p-10 shadow-sm grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-6 space-y-6">
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-teal-700">
                  Simulador Financeiro em Kwanzas (AOA)
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
                  Como transformar a EduLink em investimento de “Custo Zero”
                </h2>
                <p className="text-sm text-stone-600">
                  Ao incluir o Passaporte Digital e o e-mail institucional na taxa de matrícula ou emissão do cartão escolar, a escola paga a subscrição anual sem retirar liquidez do caixa.
                </p>
              </div>

              <div className="space-y-5 bg-stone-50 rounded-2xl p-5 border border-stone-200">
                <div>
                  <div className="flex justify-between text-xs font-bold text-stone-800 mb-2">
                    <label htmlFor="calc-students">Número de Estudantes Ativos</label>
                    <span className="font-mono text-teal-800">{calcStudents.toLocaleString('pt-AO')} alunos</span>
                  </div>
                  <input
                    id="calc-students"
                    type="range"
                    min={100}
                    max={3000}
                    step={50}
                    value={calcStudents}
                    onChange={(e) => setCalcStudents(Number(e.target.value))}
                    className="w-full accent-teal-700 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-stone-400 mt-1">
                    <span>100</span>
                    <span>500</span>
                    <span>1.500</span>
                    <span>3.000</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-stone-800 mb-2">
                    <label htmlFor="calc-card-fee">Taxa anual de Cartão Digital / Matrícula (opcional)</label>
                    <span className="font-mono text-teal-800">{formatKz(cardFeeAoa)} / aluno</span>
                  </div>
                  <input
                    id="calc-card-fee"
                    type="range"
                    min={0}
                    max={3500}
                    step={250}
                    value={cardFeeAoa}
                    onChange={(e) => setCardFeeAoa(Number(e.target.value))}
                    className="w-full accent-teal-700 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-stone-400 mt-1">
                    <span>0 Kz (absorvido pela escola)</span>
                    <span>1.500 Kz</span>
                    <span>3.500 Kz</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="text-xs font-bold text-stone-700">Tipo de Instituição:</span>
                  <div className="inline-flex rounded-xl bg-white border border-stone-200 p-1 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setCalcTutela('MED_K12')}
                      className={`px-3 py-1 rounded-lg ${
                        calcTutela === 'MED_K12' ? 'bg-teal-700 text-white' : 'text-stone-600'
                      }`}
                    >
                      Colégio / Instituto (MED)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCalcTutela('MESCTI_HIGHER_ED')}
                      className={`px-3 py-1 rounded-lg ${
                        calcTutela === 'MESCTI_HIGHER_ED' ? 'bg-teal-700 text-white' : 'text-stone-600'
                      }`}
                    >
                      Universidade / IES
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="rounded-3xl bg-stone-900 text-white p-6 sm:p-8 space-y-5 shadow-lg">
                <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-4">
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-teal-300 font-bold block">
                      Plano Recomendado
                    </span>
                    <p className="text-xl font-extrabold">{roiMetrics.planName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-extrabold text-teal-300">{formatKz(roiMetrics.annualPrice)}</p>
                    <span className="text-[11px] text-stone-400">por ano letivo</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                    <span className="text-stone-400 block">Custo diluído por aluno/ano</span>
                    <p className="text-lg font-extrabold text-white mt-1">
                      {formatKz(roiMetrics.costPerStudentYear)}
                    </p>
                    <span className="text-[10px] text-teal-300">
                      ≈ {formatKz(roiMetrics.costPerStudentYear / 12)} / mês
                    </span>
                  </div>

                  <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                    <span className="text-stone-400 block">Poupança face a agência web</span>
                    <p className="text-lg font-extrabold text-emerald-300 mt-1">
                      +{formatKz(roiMetrics.agencySavingsMin)}
                    </p>
                    <span className="text-[10px] text-stone-400">Site + SSL + DNS incluídos</span>
                  </div>
                </div>

                <div className="rounded-2xl bg-teal-950/80 border border-teal-700/60 p-4 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-teal-200">Arrecadação anual do Cartão Digital:</span>
                    <span className="font-mono font-bold text-white">{formatKz(roiMetrics.totalCardRevenue)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm pt-1 border-t border-teal-800/70">
                    <span className="font-bold text-white">
                      {roiMetrics.netSurplus >= 0 ? 'Saldo Líquido Positivo para a Escola:' : 'Investimento Líquido Anual:'}
                    </span>
                    <span
                      className={`font-mono font-extrabold ${
                        roiMetrics.netSurplus >= 0 ? 'text-emerald-300' : 'text-amber-300'
                      }`}
                    >
                      {roiMetrics.netSurplus >= 0 ? '+' : ''}
                      {formatKz(Math.abs(roiMetrics.netSurplus))}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => openDemoWithContext()}
                  className="w-full py-3.5 rounded-xl bg-teal-500 text-stone-950 font-extrabold text-xs sm:text-sm hover:bg-teal-400 transition"
                >
                  Pedir Proposta Personalizada para {calcStudents.toLocaleString('pt-AO')} Alunos
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* PLANOS COMERCIAIS EM KWANZAS */}
        <section id="planos" className="bg-white border-y border-stone-200 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="space-y-2 max-w-2xl">
                <span className="text-xs font-bold uppercase tracking-wider text-teal-700">
                  Preços Transparentes em Kwanzas (AOA)
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
                  Planos desenhados para o ciclo letivo das escolas em Angola
                </h2>
              </div>
              <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs text-amber-950 font-semibold">
                Condições especiais para os 10 primeiros colégios piloto em Luanda
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
              {PLANS.map((plan) => (
                <div
                  key={plan.code}
                  className={`rounded-3xl p-6 sm:p-7 flex flex-col justify-between space-y-6 border transition ${
                    plan.featured
                      ? 'border-teal-600 bg-teal-50/40 shadow-lg ring-1 ring-teal-600/20'
                      : 'border-stone-200 bg-white shadow-sm'
                  }`}
                >
                  <div className="space-y-4">
                    <span
                      className={`inline-block rounded-full px-3 py-1 text-[11px] font-bold ${
                        plan.featured
                          ? 'bg-teal-700 text-white'
                          : 'bg-stone-100 text-stone-700'
                      }`}
                    >
                      {plan.badge}
                    </span>

                    <div>
                      <h3 className="text-xl font-extrabold text-stone-900">{plan.name}</h3>
                      <div className="mt-2 flex items-baseline gap-1.5">
                        <span className="text-3xl font-extrabold text-stone-900">
                          {formatKz(plan.price)}
                        </span>
                        <span className="text-xs font-semibold text-stone-500">{plan.period}</span>
                      </div>
                      <p className="text-[11px] text-stone-500 mt-1">{plan.setupNote}</p>
                    </div>

                    <ul className="space-y-2.5 pt-3 border-t border-stone-200/80 text-xs text-stone-700">
                      {plan.features.map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <span className="text-teal-700 font-bold mt-0.5" aria-hidden="true">✓</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-2 pt-2">
                    <a
                      href={ADMIN_URL}
                      className={`block w-full text-center py-3 rounded-xl text-xs font-bold transition ${
                        plan.featured
                          ? 'bg-teal-700 text-white hover:bg-teal-800 shadow-sm'
                          : 'bg-stone-900 text-white hover:bg-stone-800'
                      }`}
                    >
                      Começar com {plan.name}
                    </a>
                    <button
                      type="button"
                      onClick={() => openDemoWithContext()}
                      className="w-full py-2.5 rounded-xl border border-stone-300 bg-white text-xs font-semibold text-stone-700 hover:bg-stone-50 transition"
                    >
                      Falar com Especialista
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ INTERATIVO */}
        <section id="faq" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-700">
              Perguntas Frequentes
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
              Tudo o que a direção escolar precisa de saber
            </h2>
          </div>

          <div className="space-y-3">
            {FAQ_ITEMS.map((item, idx) => {
              const isOpen = openFaqIdx === idx;
              return (
                <div key={item.q} className="rounded-2xl border border-stone-200 bg-white overflow-hidden shadow-sm">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                    className="w-full text-left px-5 py-4 flex items-center justify-between gap-4 hover:bg-stone-50 transition"
                  >
                    <span className="text-sm font-bold text-stone-900">{item.q}</span>
                    <span className="shrink-0 w-6 h-6 rounded-full bg-stone-100 text-stone-700 font-bold text-sm flex items-center justify-center">
                      {isOpen ? '−' : '+'}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-4 pt-1 text-xs sm:text-sm text-stone-600 leading-relaxed border-t border-stone-100">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <div className="rounded-3xl bg-gradient-to-br from-teal-800 to-stone-900 text-white p-8 sm:p-12 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 shadow-xl">
            <div className="space-y-2 max-w-2xl">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-300">
                Pronto para o Ano Lectivo 2026/2027
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Coloque a sua instituição online em .edu.ao esta semana
              </h2>
              <p className="text-sm text-teal-100/90">
                Crie a conta da secretaria para testar o Onboarding Wizard ou agende uma demonstração presencial/online em Luanda com o site da sua escola já pré-montado.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 shrink-0">
              <button
                type="button"
                onClick={() => openDemoWithContext()}
                className="px-6 py-3.5 rounded-xl bg-white text-stone-950 font-extrabold text-sm hover:bg-stone-100 transition"
              >
                Agendar Demonstração
              </button>
              <a
                href={ADMIN_URL}
                className="px-6 py-3.5 rounded-xl border border-white/30 bg-white/10 text-white font-bold text-sm hover:bg-white/20 transition"
              >
                Abrir Portal da Secretaria
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* RODAPÉ */}
      <footer className="border-t border-stone-200 bg-white py-10 text-xs text-stone-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-teal-700 text-white font-bold flex items-center justify-center">
              E
            </span>
            <p>
              <strong>EduLink Angola</strong> © {new Date().getFullYear()} · Infraestrutura de Identidade Académica &amp; Nuvem Escolar.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-5 font-semibold text-stone-600">
            <a href={ADMIN_URL} className="hover:text-teal-800">Secretaria Escolar</a>
            <a href={PORTAL_URL} className="hover:text-teal-800">Portal PWA</a>
            <a href="/verify" className="hover:text-teal-800">Verificar Cartão QR</a>
            <a href="#faq" className="hover:text-teal-800">Conformidade APD</a>
          </div>
        </div>
      </footer>

      {/* MODAL DE PEDIDO DE DEMONSTRAÇÃO */}
      {demoModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="demo-modal-title"
          className="fixed inset-0 z-50 bg-stone-950/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setDemoModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700">
                  Demonstração Comercial · Angola
                </span>
                <h3 id="demo-modal-title" className="text-lg font-extrabold text-stone-900">
                  Veja o site da sua escola pronto em 5 minutos
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDemoModalOpen(false)}
                className="rounded-lg border border-stone-200 px-2.5 py-1 text-xs font-semibold text-stone-500 hover:text-stone-900"
              >
                Fechar
              </button>
            </div>

            {!demoSubmitted ? (
              <form onSubmit={handleDemoSubmit} className="space-y-3.5">
                <div>
                  <label htmlFor="demo-director" className="block text-xs font-semibold text-stone-700 mb-1">
                    Seu Nome e Cargo *
                  </label>
                  <input
                    id="demo-director"
                    required
                    value={demoDirector}
                    onChange={(e) => setDemoDirector(e.target.value)}
                    placeholder="Ex.: Dr. Carlos Mendes — Diretor Pedagógico"
                    className="w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-xs"
                  />
                </div>
                <div>
                  <label htmlFor="demo-school" className="block text-xs font-semibold text-stone-700 mb-1">
                    Nome do Colégio / IES *
                  </label>
                  <input
                    id="demo-school"
                    required
                    value={demoSchool}
                    onChange={(e) => setDemoSchool(e.target.value)}
                    placeholder="Ex.: Colégio Esperança de Luanda"
                    className="w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="demo-phone" className="block text-xs font-semibold text-stone-700 mb-1">
                      WhatsApp / Telefone *
                    </label>
                    <input
                      id="demo-phone"
                      type="tel"
                      required
                      value={demoPhone}
                      onChange={(e) => setDemoPhone(e.target.value)}
                      placeholder="+244 923 000 000"
                      className="w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-xs"
                    />
                  </div>
                  <div>
                    <label htmlFor="demo-province" className="block text-xs font-semibold text-stone-700 mb-1">
                      Província
                    </label>
                    <select
                      id="demo-province"
                      value={demoProvince}
                      onChange={(e) => setDemoProvince(e.target.value)}
                      className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-xs bg-white"
                    >
                      <option value="Luanda">Luanda</option>
                      <option value="Benguela">Benguela</option>
                      <option value="Huíla">Huíla</option>
                      <option value="Huambo">Huambo</option>
                      <option value="Cabinda">Cabinda</option>
                      <option value="Outra Província">Outra Província</option>
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-teal-700 text-white text-xs font-bold hover:bg-teal-800 transition"
                >
                  Preparar Contacto e Demonstração
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-xs text-emerald-950 space-y-1">
                  <p className="font-bold">Resumo pronto para a equipa comercial EduLink!</p>
                  <p>
                    Instituição: <strong>{demoSchool}</strong> ({demoProvince})
                  </p>
                  <p>
                    Pré-visualização sugerida: <strong className="font-mono">{slugifySchool(demoSchool)}.{ROOT_DOMAIN}</strong>
                  </p>
                </div>
                <div className="space-y-2">
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-center py-3 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition"
                  >
                    Enviar Pedido via WhatsApp Agora
                  </a>
                  <a
                    href={ADMIN_URL}
                    className="block w-full text-center py-3 rounded-xl bg-stone-900 text-white text-xs font-bold hover:bg-stone-800 transition"
                  >
                    Ou Criar Conta e Testar Já o Onboarding →
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}