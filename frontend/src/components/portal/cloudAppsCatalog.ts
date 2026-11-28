import { getDisplayRootDomain } from '@/lib/siteUrls';
import type { CloudAppItem, GlobalPerkItem, PassportData } from './types';

export interface PersonaContextMeta {
  personaLabel: string;
  tutelaBadge: string;
  summary: string;
  appsSectionTitle: string;
  perksSectionTitle: string;
}

const PERSONA_CONTEXT_MAP: Record<
  'MED_STUDENT' | 'MED_TEACHER' | 'MESCTI_STUDENT' | 'MESCTI_TEACHER',
  PersonaContextMeta
> = {
  MED_STUDENT: {
    personaLabel: 'Estudante · MED (K-12)',
    tutelaBadge: 'Ensino Geral / Técnico',
    summary: 'Contas gratuitas da escola para aulas, cadernos digitais e Canva Educação.',
    appsSectionTitle: 'Ferramentas Escolares (Login Único)',
    perksSectionTitle: 'Programas Académicos (Ensino Secundário e Técnico)',
  },
  MED_TEACHER: {
    personaLabel: 'Docente · MED (K-12)',
    tutelaBadge: 'Corpo Docente MED',
    summary: 'Ferramentas gratuitas para gerir turmas, preparar fichas e lecionar no Classroom, Teams e Canva.',
    appsSectionTitle: 'Ferramentas para Docentes (Login Único)',
    perksSectionTitle: 'Licenças Gratuitas para Professores',
  },
  MESCTI_STUDENT: {
    personaLabel: 'Estudante · MESCTI (IES)',
    tutelaBadge: 'Ensino Superior',
    summary: 'Contas universitárias para investigação, trabalhos em equipa e verificação académica internacional.',
    appsSectionTitle: 'Ferramentas Académicas da IES',
    perksSectionTitle: 'Benefícios Universitários (SheerID & GitHub Campus)',
  },
  MESCTI_TEACHER: {
    personaLabel: 'Docente · MESCTI (IES)',
    tutelaBadge: 'Corpo Docente IES',
    summary: 'Licenças Faculty para docência universitária, investigação e projetos académicos.',
    appsSectionTitle: 'Ferramentas Faculty da IES',
    perksSectionTitle: 'Programas Globais para Docentes Universitários',
  },
};

/** Detects whether the school domain is still an `.edulink.ao` commercial preview host. */
export function isPreviewDemoDomain(domain?: string | null): boolean {
  if (!domain) return true;
  const clean = domain.trim().toLowerCase();
  const rootDomain = getDisplayRootDomain();
  return clean === rootDomain || clean.endsWith(`.${rootDomain}`);
}

/** Returns concrete `pt-AO` labels and guidance tailored to role and MED vs. MESCTI accreditation. */
export function getPersonaContextMeta(isTeacher: boolean, isHigherEd: boolean): PersonaContextMeta {
  if (isHigherEd) {
    return isTeacher ? PERSONA_CONTEXT_MAP.MESCTI_TEACHER : PERSONA_CONTEXT_MAP.MESCTI_STUDENT;
  }
  return isTeacher ? PERSONA_CONTEXT_MAP.MED_TEACHER : PERSONA_CONTEXT_MAP.MED_STUDENT;
}

/** Builds school-scoped cloud workspace apps respecting MED K-12 vs. MESCTI Canva eligibility. */
export function buildCloudApps(
  passport: PassportData | null,
  isTeacher: boolean,
  isCanvaFreeK12: boolean
): CloudAppItem[] {
  if (!passport) return [];
  const email = encodeURIComponent(passport.institutionalEmail);
  const isHigherEd = passport.institutionType === 'MESCTI_HIGHER_ED';

  return [
    {
      name: 'Webmail Institucional',
      subtitle: passport.institutionalEmail,
      href: `https://mail.google.com/a/${passport.schoolDomain}`,
      badge: 'E-mail Oficial',
      available: true,
    },
    {
      name: isTeacher ? 'Google Classroom (Docente)' : 'Google Classroom & Drive',
      subtitle: isTeacher
        ? isHigherEd
          ? 'Gerir cadeiras, trabalhos, Google Docs e Drive da IES'
          : 'Gerir turmas, fichas, tarefas e Drive escolar'
        : isHigherEd
        ? 'Cadeiras, materiais de estudo e Drive universitário'
        : 'Turmas, cadernos digitais e tarefas escolares',
      href: `https://classroom.google.com/u/0/?authuser=${email}`,
      badge: 'Google Workspace',
      available: true,
    },
    {
      name: isTeacher ? 'Microsoft 365 (Faculty)' : 'Microsoft 365 & Teams',
      subtitle: isTeacher
        ? 'Word, Excel, PowerPoint Web, OneDrive e aulas no Teams'
        : 'Word, Excel, PowerPoint Web, OneDrive e Microsoft Teams',
      href: `https://www.office.com/?login_hint=${email}`,
      badge: isTeacher ? 'Office A1 Faculty' : 'Office 365 A1',
      available: true,
    },
    {
      name: isCanvaFreeK12 ? 'Canva para Educação' : 'Canva para Universidades',
      subtitle: isCanvaFreeK12
        ? isTeacher
          ? 'Apresentações, fichas e salas de aula gratuitas (MED)'
          : 'Design educativo e trabalhos escolares gratuitos (MED)'
        : 'Disponível apenas se a IES contratar o plano pago Canva Campus',
      href: 'https://www.canva.com/education/',
      badge: isCanvaFreeK12 ? 'Gratuito (MED)' : 'Plano Pago IES',
      available: isCanvaFreeK12,
    },
  ];
}

/** Builds global academic perks tailored to Student vs. Teacher and MED vs. MESCTI. */
export function buildGlobalPerks(
  isTeacher: boolean,
  institutionType: PassportData['institutionType'] = 'MED_K12'
): GlobalPerkItem[] {
  const isHigherEd = institutionType === 'MESCTI_HIGHER_ED';

  if (isTeacher) {
    return [
      {
        name: 'GitHub Global Campus (Docentes)',
        desc: isHigherEd
          ? 'Repositórios privados e ferramentas gratuitas para docência universitária.'
          : 'Recursos gratuitos para ensinar programação no ensino geral e técnico.',
        href: 'https://education.github.com/teachers',
        badge: 'Gratuito',
      },
      {
        name: 'Figma for Education',
        desc: 'Plano Professional gratuito para salas de aula e projetos académicos.',
        href: 'https://www.figma.com/education/',
        badge: 'Gratuito',
      },
      {
        name: 'JetBrains Educational (Docentes)',
        desc: 'IDEs profissionais gratuitas para departamentos de informática e TI.',
        href: 'https://www.jetbrains.com/community/education/',
        badge: 'Gratuito',
      },
    ];
  }

  if (isHigherEd) {
    return [
      {
        name: 'GitHub Student Developer Pack',
        desc: 'Créditos na nuvem, Copilot e ferramentas profissionais gratuitas para universitários.',
        href: 'https://education.github.com/pack',
        badge: 'GitHub Campus',
      },
      {
        name: 'Spotify & Google AI Estudante',
        desc: 'Elegibilidade universitária via verificação académica SheerID com o e-mail da IES.',
        href: 'https://www.spotify.com/student/',
        badge: 'SheerID',
      },
      {
        name: 'Figma & JetBrains Académico',
        desc: 'Licenças profissionais gratuitas para engenharia, arquitetura e design.',
        href: 'https://www.figma.com/education/',
        badge: 'Gratuito',
      },
    ];
  }

  return [
    {
      name: 'GitHub Education (Ensino Técnico/Secundário)',
      desc: 'Ferramentas gratuitas de programação para estudantes do ensino secundário e técnico (≥ 13 anos).',
      href: 'https://education.github.com/pack',
      badge: 'Ensino Técnico',
    },
    {
      name: 'Figma for Education',
      desc: 'Design e quadros colaborativos gratuitos para projetos da escola.',
      href: 'https://www.figma.com/education/',
      badge: 'Gratuito',
    },
    {
      name: 'JetBrains Educational',
      desc: 'Ambientes de programação gratuitos para cursos médios de informática.',
      href: 'https://www.jetbrains.com/community/education/',
      badge: 'Gratuito',
    },
  ];
}
