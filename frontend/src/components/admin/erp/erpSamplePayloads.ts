import type { ERPConnection } from '../types';

/** Builds a realistic webhook payload to test local Angolan ERP synchronization in sandbox. */
export function buildSampleErpPayload(provider: ERPConnection['provider']): Record<string, unknown> {
  const suffix = Date.now().toString().slice(-5);
  const stamp = Date.now();

  switch (provider) {
    case 'KLASSE':
      return {
        event_id: `sim-klasse-${stamp}`,
        evento: 'matricula.criada',
        aluno: {
          nome_completo: 'Simão Domingos Neto',
          bi: `SIM-${suffix}`,
          turma: '11ª Classe - A',
          ano_letivo: '2026/2027',
        },
      };
    case 'SYSPORTAL':
      return {
        event_id: `sim-sys-${stamp}`,
        event: 'enrollment.active',
        student: {
          name: 'Teresa Lukeni Simão',
          document_id: `SYS-${suffix}`,
          class_name: '10ª Classe - B',
          year: '2026/2027',
        },
      };
    case 'KACENNU':
      return {
        id_transacao: `sim-kac-${stamp}`,
        tipo_evento: 'INSCRICAO',
        dados: {
          nome: 'José Kandimba',
          numero_processo: `KAC-${suffix}`,
          classe: '12ª Classe',
          ano_academico: '2026/2027',
        },
      };
    default:
      return {
        event_id: `sim-gen-${stamp}`,
        event_type: 'STUDENT_ENROLLED',
        user: {
          full_name: 'Ana Paulo Teste',
          bi_or_student_id: `GEN-${suffix}`,
          grade_class: '1º Ano TI',
          academic_year: '2026/2027',
        },
      };
  }
}
