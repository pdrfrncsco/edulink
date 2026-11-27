'use client';

import React from 'react';
import { ArrowRight, Building2 } from 'lucide-react';
import { Button, Card, EmptyState, StatusBadge } from '@/components/ui';
import { STAGE_META, type SectionKey } from './navigation';
import type { School, SetupStage } from './types';

interface SchoolOverviewPanelProps {
  activeSchool: School | null;
  isPlatformAdmin: boolean;
  onNavigate: (section: SectionKey) => void;
}

/** School activation overview metrics and 4-step turnkey pipeline panel. */
export default function SchoolOverviewPanel({
  activeSchool,
  isPlatformAdmin,
  onNavigate,
}: SchoolOverviewPanelProps) {
  if (!activeSchool) {
    return (
      <EmptyState
        icon={<Building2 className="h-5 w-5" aria-hidden="true" />}
        title="Nenhuma instituição selecionada"
        description="Selecione uma escola na barra superior ou crie uma nova instituição no Wizard de Onboarding."
        action={
          isPlatformAdmin ? (
            <Button type="button" size="sm" onClick={() => onNavigate('onboarding')}>
              Registar Nova Escola
            </Button>
          ) : undefined
        }
      />
    );
  }

  const pipelineCards: {
    title: string;
    stage: SetupStage;
    actionLabel: string;
    target: SectionKey;
  }[] = [
    {
      title: '1. Domínio .edu.ao & DNS',
      stage: (activeSchool.dns_status || (activeSchool.domain ? 'SUBMITTED' : 'PENDING_DOCS')) as SetupStage,
      actionLabel: 'Configurar DNS',
      target: 'domains',
    },
    {
      title: '2. Google Workspace',
      stage: (activeSchool.google_status || 'NOT_STARTED') as SetupStage,
      actionLabel: 'Provisionar Contas',
      target: 'provisioning',
    },
    {
      title: '3. Microsoft 365 (A1)',
      stage: (activeSchool.microsoft_status || 'NOT_STARTED') as SetupStage,
      actionLabel: 'Gerir Integração',
      target: 'provisioning',
    },
    {
      title: '4. Canva Educação',
      stage: (activeSchool.canva_status ||
        (activeSchool.institution_type === 'MESCTI_HIGHER_ED' ? 'NOT_ELIGIBLE' : 'NOT_STARTED')) as SetupStage,
      actionLabel: 'Ver Acessos SSO',
      target: 'provisioning',
    },
  ];

  return (
    <div className="space-y-5">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card padding="sm">
          <span className="text-[11px] font-semibold uppercase text-stone-500">Estudantes Ativos</span>
          <p className="text-2xl font-extrabold text-stone-900 mt-1">
            {activeSchool.total_students ?? 0}
          </p>
          <button
            type="button"
            onClick={() => onNavigate('directory')}
            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:underline"
          >
            Gerir ou importar CSV <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </button>
        </Card>

        <Card padding="sm">
          <span className="text-[11px] font-semibold uppercase text-stone-500">Docentes</span>
          <p className="text-2xl font-extrabold text-stone-900 mt-1">
            {activeSchool.total_teachers ?? 0}
          </p>
          <span className="mt-2 block text-[11px] text-stone-500">
            {activeSchool.institution_type === 'MESCTI_HIGHER_ED'
              ? 'Ensino Superior (MESCTI)'
              : 'Ensino Geral / Técnico (MED)'}
          </span>
        </Card>

        <Card padding="sm">
          <span className="text-[11px] font-semibold uppercase text-stone-500">Dossiê Documental</span>
          <p className="text-2xl font-extrabold text-stone-900 mt-1">
            {activeSchool.documents_uploaded_count ?? 0} / 4
          </p>
          <span className="mt-2 block text-[11px] font-mono text-stone-500 truncate">
            NIF {activeSchool.nif} · {activeSchool.alvara_med_mescti}
          </span>
        </Card>

        <Card padding="sm">
          <span className="text-[11px] font-semibold uppercase text-stone-500">Conformidade APD</span>
          <div className="mt-1.5">
            <StatusBadge tone={activeSchool.apd_notified ? 'success' : 'warning'} size="md" dot>
              {activeSchool.apd_notified ? 'Notificado' : 'Pendente'}
            </StatusBadge>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('compliance')}
            className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:underline"
          >
            {activeSchool.apd_dossier_number
              ? `Dossiê ${activeSchool.apd_dossier_number}`
              : 'Gerar dossiê Lei n.º 22/11'}
            {!activeSchool.apd_dossier_number && <ArrowRight className="h-3 w-3" aria-hidden="true" />}
          </button>
        </Card>
      </div>

      {/* Turnkey Digital Activation Pipeline */}
      <Card padding="md" className="space-y-4">
        <div>
          <h2 className="text-sm font-bold text-stone-900">
            Pipeline de Ativação Digital Chave-na-Mão
          </h2>
          <p className="text-xs text-stone-500">
            Acompanhamento das acreditações oficiais geridas em nome de {activeSchool.name}.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {pipelineCards.map((card) => {
            const meta = STAGE_META[card.stage] || STAGE_META.NOT_STARTED;
            return (
              <Card
                key={card.title}
                variant="muted"
                padding="sm"
                className="rounded-xl flex flex-col justify-between gap-3"
              >
                <div className="space-y-2">
                  <p className="text-xs font-bold text-stone-900">{card.title}</p>
                  <StatusBadge tone={meta.tone} dot>
                    {meta.label}
                  </StatusBadge>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate(card.target)}
                  className="inline-flex items-center gap-1 text-left text-xs font-semibold text-teal-800 hover:underline"
                >
                  {card.actionLabel} <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </button>
              </Card>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
