'use client';

import React from 'react';
import { Button, FormField, Input, Select } from '@/components/ui';
import { formatAOA } from '@/lib/formatters';
import type { CommercialPlan } from '../types';
import type { ExtendedPlan, PayMethod } from './types';

interface SubscriptionFormProps {
  schoolId: string;
  plans: ExtendedPlan[];
  selectedPlan: CommercialPlan['code'];
  payMethod: PayMethod;
  customerPhone: string;
  busy: boolean;
  onChangePlan: (plan: CommercialPlan['code']) => void;
  onChangePayMethod: (method: PayMethod) => void;
  onChangePhone: (phone: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

/** Form for creating a new school commercial plan subscription and selecting payment method. */
export default function SubscriptionForm({
  schoolId,
  plans,
  selectedPlan,
  payMethod,
  customerPhone,
  busy,
  onChangePlan,
  onChangePayMethod,
  onChangePhone,
  onSubmit,
}: SubscriptionFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end bg-stone-50 p-4 rounded-xl border border-stone-200"
    >
      <FormField id="edulink-plan-select" label="Plano EduLink (AOA)">
        {({ id, describedBy, invalid }) => (
          <Select
            id={id}
            invalid={invalid}
            aria-describedby={describedBy}
            value={selectedPlan}
            onChange={(e) => onChangePlan(e.target.value as CommercialPlan['code'])}
          >
            {plans.length > 0 ? (
              plans.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.label} (
                  {p.billing_type === 'ONE_TIME' || p.code === 'SETUP_DIGITAL'
                    ? 'Taxa Única'
                    : 'Anual'}
                  ) — {formatAOA(p.price_aoa)}
                </option>
              ))
            ) : (
              <>
                <option value="SETUP_DIGITAL">
                  Setup Escola Digital (Taxa Única) — 150.000,00 Kz
                </option>
                <option value="ESSENCIAL">EduLink Essencial (Anual) — 240.000,00 Kz</option>
                <option value="PRO">EduLink Pro (Anual) — 480.000,00 Kz</option>
                <option value="CAMPUS">EduLink Campus (Anual) — 1.200.000,00 Kz</option>
              </>
            )}
          </Select>
        )}
      </FormField>

      <FormField id="edulink-pay-method" label="Canal de Pagamento">
        {({ id, describedBy, invalid }) => (
          <Select
            id={id}
            invalid={invalid}
            aria-describedby={describedBy}
            value={payMethod}
            onChange={(e) => onChangePayMethod(e.target.value as PayMethod)}
          >
            <option value="MULTICAIXA_EXPRESS">Multicaixa Express</option>
            <option value="KWIK">KWiK (Transferência Instantânea)</option>
            <option value="BANK_TRANSFER">Transferência IBAN</option>
          </Select>
        )}
      </FormField>

      <FormField
        id="edulink-pay-phone"
        label={
          payMethod === 'BANK_TRANSFER' ? 'Telemóvel (Opcional para IBAN)' : 'Telemóvel MCX / KWiK'
        }
      >
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            type="tel"
            invalid={invalid}
            aria-describedby={describedBy}
            disabled={payMethod === 'BANK_TRANSFER'}
            autoComplete="tel"
            value={customerPhone}
            onChange={(e) => onChangePhone(e.target.value)}
            placeholder={payMethod === 'BANK_TRANSFER' ? 'Não aplicável a IBAN' : '+244 923 000 000'}
            className="disabled:bg-stone-100 disabled:text-stone-400"
          />
        )}
      </FormField>

      <Button type="submit" loading={busy} disabled={!schoolId} size="lg">
        Contratar Plano
      </Button>
    </form>
  );
}
