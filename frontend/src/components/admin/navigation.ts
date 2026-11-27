import type { StatusTone } from '@/components/ui';
import type { SetupStage } from './types';

export type SectionKey =
  | 'platform_ops'
  | 'onboarding'
  | 'overview'
  | 'directory'
  | 'provisioning'
  | 'domains'
  | 'compliance'
  | 'billing_benefits'
  | 'erp_verifiers';

export interface NavItem {
  id: SectionKey;
  label: string;
  description: string;
  group: 'ops' | 'school';
  badge?: string;
}

export const STAGE_META: Record<SetupStage, { label: string; tone: StatusTone }> = {
  NOT_STARTED: { label: 'Por Iniciar', tone: 'neutral' },
  PENDING_DOCS: { label: 'Aguardando Docs', tone: 'warning' },
  SUBMITTED: { label: 'Em Revisão', tone: 'info' },
  APPROVED: { label: 'Ativo / Aprovado', tone: 'success' },
  ACTION_REQUIRED: { label: 'Ação Necessária', tone: 'error' },
  NOT_ELIGIBLE: { label: 'Plano IES (Pago)', tone: 'neutral' },
};
