'use client';

import React from 'react';
import { Button, FormField, Input, Select } from '@/components/ui';

export type GuardianRelationship = 'PAI_MAE' | 'TUTOR_LEGAL' | 'ENCARREGADO';

interface ConsentSignatureFormProps {
  guardianName: string;
  guardianBi: string;
  relationship: GuardianRelationship;
  phone: string;
  email: string;
  submitting: boolean;
  onChangeGuardianName: (v: string) => void;
  onChangeGuardianBi: (v: string) => void;
  onChangeRelationship: (v: GuardianRelationship) => void;
  onChangePhone: (v: string) => void;
  onChangeEmail: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

/** Accessible digital signature form for a parent or legal guardian under APD Lei n.º 22/11. */
export default function ConsentSignatureForm({
  guardianName,
  guardianBi,
  relationship,
  phone,
  email,
  submitting,
  onChangeGuardianName,
  onChangeGuardianBi,
  onChangeRelationship,
  onChangePhone,
  onChangeEmail,
  onSubmit,
}: ConsentSignatureFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <FormField id="consent-guardian-name" label="Nome Completo do Encarregado" required>
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            name="guardian_full_name"
            type="text"
            required
            invalid={invalid}
            aria-describedby={describedBy}
            autoComplete="name"
            enterKeyHint="next"
            value={guardianName}
            onChange={(e) => onChangeGuardianName(e.target.value)}
          />
        )}
      </FormField>

      <FormField id="consent-guardian-bi" label="N.º do Bilhete de Identidade (BI)" required>
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            name="guardian_bi"
            type="text"
            required
            mono
            invalid={invalid}
            aria-describedby={describedBy}
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            enterKeyHint="next"
            value={guardianBi}
            onChange={(e) => onChangeGuardianBi(e.target.value)}
          />
        )}
      </FormField>

      <FormField id="consent-rel" label="Qualidade / Parentesco">
        {({ id, describedBy, invalid }) => (
          <Select
            id={id}
            name="guardian_relationship"
            invalid={invalid}
            aria-describedby={describedBy}
            value={relationship}
            onChange={(e) => onChangeRelationship(e.target.value as GuardianRelationship)}
          >
            <option value="PAI_MAE">Pai / Mãe</option>
            <option value="TUTOR_LEGAL">Tutor Legal</option>
            <option value="ENCARREGADO">Encarregado de Educação</option>
          </Select>
        )}
      </FormField>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FormField id="consent-phone" label="Telefone">
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              name="guardian_phone"
              type="tel"
              invalid={invalid}
              aria-describedby={describedBy}
              autoComplete="tel"
              enterKeyHint="next"
              value={phone}
              onChange={(e) => onChangePhone(e.target.value)}
            />
          )}
        </FormField>

        <FormField id="consent-email" label="E-mail">
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              name="guardian_email"
              type="email"
              invalid={invalid}
              aria-describedby={describedBy}
              autoComplete="email"
              enterKeyHint="done"
              value={email}
              onChange={(e) => onChangeEmail(e.target.value)}
            />
          )}
        </FormField>
      </div>

      <Button type="submit" size="lg" fullWidth loading={submitting}>
        {submitting
          ? 'A Registar Assinatura...'
          : 'Autorizar e Assinar Termo Digitalmente'}
      </Button>
    </form>
  );
}
