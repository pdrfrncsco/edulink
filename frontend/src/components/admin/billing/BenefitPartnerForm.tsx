'use client';

import React from 'react';
import { Button, FormField, Input, Select } from '@/components/ui';
import type { BenefitPartner } from '../types';

interface BenefitPartnerFormProps {
  partnerName: string;
  partnerCategory: BenefitPartner['category'];
  partnerDiscount: string;
  busy: boolean;
  onChangeName: (name: string) => void;
  onChangeCategory: (category: BenefitPartner['category']) => void;
  onChangeDiscount: (discount: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

/** Platform-admin form to register a new Angola Benefits Club commercial partner. */
export default function BenefitPartnerForm({
  partnerName,
  partnerCategory,
  partnerDiscount,
  busy,
  onChangeName,
  onChangeCategory,
  onChangeDiscount,
  onSubmit,
}: BenefitPartnerFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="space-y-3 bg-stone-50 p-4 rounded-xl border border-stone-200"
    >
      <h3 className="text-xs font-bold uppercase tracking-wide text-stone-700">
        Novo Parceiro Comercial
      </h3>
      <FormField id="partner-name" label="Nome do Parceiro" required>
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            required
            invalid={invalid}
            aria-describedby={describedBy}
            value={partnerName}
            onChange={(e) => onChangeName(e.target.value)}
            placeholder="Ex.: Unitel Educação"
          />
        )}
      </FormField>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <FormField id="partner-category" label="Categoria">
          {({ id, describedBy, invalid }) => (
            <Select
              id={id}
              invalid={invalid}
              aria-describedby={describedBy}
              value={partnerCategory}
              onChange={(e) => onChangeCategory(e.target.value as BenefitPartner['category'])}
            >
              <option value="TELECOM">Telecom &amp; Dados</option>
              <option value="BOOKSTORE">Livrarias</option>
              <option value="SOFTWARE">Software &amp; Formação</option>
              <option value="BANKING">Banca</option>
              <option value="TRANSPORT_CULTURE">Transportes &amp; Cultura</option>
            </Select>
          )}
        </FormField>
        <FormField id="partner-discount" label="Destaque" required>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              required
              invalid={invalid}
              aria-describedby={describedBy}
              value={partnerDiscount}
              onChange={(e) => onChangeDiscount(e.target.value)}
              placeholder="Ex.: 50% Bónus Dados"
            />
          )}
        </FormField>
      </div>
      <Button type="submit" disabled={busy}>
        Registar Parceiro
      </Button>
    </form>
  );
}
