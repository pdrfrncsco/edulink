'use client';

import React from 'react';
import { Button, CheckboxField, FormField, Input, Select } from '@/components/ui';
import type { APDDossier } from '../types';

interface APDDossierFormProps {
  schoolId: string;
  dossier: APDDossier | null;
  directorName: string;
  directorBi: string;
  dpoName: string;
  dpoEmail: string;
  institutionType: 'PRIMARY_SECONDARY' | 'HIGHER_ED';
  hasMinors: boolean;
  loading: boolean;
  onChangeDirectorName: (value: string) => void;
  onChangeDirectorBi: (value: string) => void;
  onChangeDpoName: (value: string) => void;
  onChangeDpoEmail: (value: string) => void;
  onChangeInstitutionType: (value: 'PRIMARY_SECONDARY' | 'HIGHER_ED') => void;
  onChangeHasMinors: (checked: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
  onGenerateDossier: () => void;
  onOpenHtml: () => void;
}

/** Form for legal representative, privacy focal point, and APD Lei n.º 22/11 dossier generation. */
export default function APDDossierForm({
  schoolId,
  dossier,
  directorName,
  directorBi,
  dpoName,
  dpoEmail,
  institutionType,
  hasMinors,
  loading,
  onChangeDirectorName,
  onChangeDirectorBi,
  onChangeDpoName,
  onChangeDpoEmail,
  onChangeInstitutionType,
  onChangeHasMinors,
  onSubmit,
  onGenerateDossier,
  onOpenHtml,
}: APDDossierFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      aria-labelledby="apd-form-heading"
      className="grid grid-cols-1 md:grid-cols-2 gap-4"
    >
      <FormField id="apd-director-name" label="Nome do Diretor / Representante Legal" required>
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            name="director_full_name"
            type="text"
            required
            invalid={invalid}
            aria-describedby={describedBy}
            autoComplete="name"
            value={directorName}
            onChange={(e) => onChangeDirectorName(e.target.value)}
          />
        )}
      </FormField>

      <FormField id="apd-director-bi" label="BI do Diretor" required>
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            name="director_bi"
            type="text"
            required
            mono
            invalid={invalid}
            aria-describedby={describedBy}
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            value={directorBi}
            onChange={(e) => onChangeDirectorBi(e.target.value)}
          />
        )}
      </FormField>

      <FormField id="apd-dpo-name" label="Ponto Focal de Privacidade (opcional)">
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            name="dpo_name"
            type="text"
            invalid={invalid}
            aria-describedby={describedBy}
            value={dpoName}
            onChange={(e) => onChangeDpoName(e.target.value)}
          />
        )}
      </FormField>

      <FormField id="apd-dpo-email" label="E-mail de Privacidade / APD">
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            name="dpo_email"
            type="email"
            invalid={invalid}
            aria-describedby={describedBy}
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            value={dpoEmail}
            onChange={(e) => onChangeDpoEmail(e.target.value)}
          />
        )}
      </FormField>

      <FormField id="apd-inst-type" label="Nível de Ensino">
        {({ id, describedBy, invalid }) => (
          <Select
            id={id}
            name="institution_type"
            invalid={invalid}
            aria-describedby={describedBy}
            value={institutionType}
            onChange={(e) =>
              onChangeInstitutionType(e.target.value as 'PRIMARY_SECONDARY' | 'HIGHER_ED')
            }
          >
            <option value="PRIMARY_SECONDARY">Ensino Primário / Secundário (Menores)</option>
            <option value="HIGHER_ED">Ensino Superior / Técnico (IES)</option>
          </Select>
        )}
      </FormField>

      <div className="pt-6">
        <CheckboxField
          id="apd-has-minors"
          name="has_minors"
          checked={hasMinors}
          onChange={onChangeHasMinors}
          label="Trata dados de menores de idade (exige Consentimento Parental)"
        />
      </div>

      <div className="md:col-span-2 flex flex-wrap gap-2 justify-between items-center pt-2">
        <div className="flex flex-wrap gap-2">
          {dossier && (
            <>
              <Button type="button" variant="outline" disabled={loading} onClick={onGenerateDossier}>
                Gerar / Atualizar Dossiê APD
              </Button>
              <Button type="button" variant="outline" onClick={onOpenHtml}>
                Imprimir / Ver HTML Oficial
              </Button>
            </>
          )}
        </div>
        <Button type="submit" disabled={!schoolId} loading={loading}>
          {dossier ? 'Atualizar Dados APD' : 'Criar Dossiê APD'}
        </Button>
      </div>
    </form>
  );
}
