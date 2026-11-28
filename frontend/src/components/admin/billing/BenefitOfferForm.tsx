'use client';

import React from 'react';
import { Button, FormField, Input, Select } from '@/components/ui';
import type { BenefitPartner } from '../types';

interface BenefitOfferFormProps {
  partners: BenefitPartner[];
  offerPartnerId: string;
  offerTitle: string;
  offerPrice: string;
  offerPromo: string;
  busy: boolean;
  onChangePartnerId: (id: string) => void;
  onChangeTitle: (title: string) => void;
  onChangePrice: (price: string) => void;
  onChangePromo: (promo: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

/** Platform-admin form to publish a free QR voucher or Kwanza bundle offer for students/teachers. */
export default function BenefitOfferForm({
  partners,
  offerPartnerId,
  offerTitle,
  offerPrice,
  offerPromo,
  busy,
  onChangePartnerId,
  onChangeTitle,
  onChangePrice,
  onChangePromo,
  onSubmit,
}: BenefitOfferFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="space-y-3 bg-stone-50 p-4 rounded-xl border border-stone-200"
    >
      <h3 className="text-xs font-bold uppercase tracking-wide text-stone-700">
        Publicar Oferta / Pacote AOA
      </h3>
      <FormField id="offer-partner" label="Parceiro">
        {({ id, describedBy, invalid }) => (
          <Select
            id={id}
            invalid={invalid}
            aria-describedby={describedBy}
            value={offerPartnerId}
            onChange={(e) => onChangePartnerId(e.target.value)}
          >
            {partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        )}
      </FormField>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <FormField id="offer-title" label="Título" required className="sm:col-span-2">
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              required
              invalid={invalid}
              aria-describedby={describedBy}
              value={offerTitle}
              onChange={(e) => onChangeTitle(e.target.value)}
              placeholder="Ex.: Pacote Estudante 10GB"
            />
          )}
        </FormField>
        <FormField id="offer-price" label="Preço (AOA)">
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              type="number"
              step="0.01"
              min="0"
              invalid={invalid}
              aria-describedby={describedBy}
              value={offerPrice}
              onChange={(e) => onChangePrice(e.target.value)}
            />
          )}
        </FormField>
      </div>
      <FormField id="offer-promo" label="Código Base (opcional)">
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            mono
            invalid={invalid}
            aria-describedby={describedBy}
            value={offerPromo}
            onChange={(e) => onChangePromo(e.target.value)}
            placeholder="Ex.: UNITEL-EDU27"
          />
        )}
      </FormField>
      <Button type="submit" variant="secondary" disabled={busy || partners.length === 0}>
        Publicar Oferta
      </Button>
    </form>
  );
}
