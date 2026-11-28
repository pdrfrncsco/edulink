'use client';

import React, { useState } from 'react';
import {
  AlertBanner,
  Button,
  Card,
  EmptyState,
  FormField,
  Input,
  Select,
  StatusBadge,
} from '@/components/ui';
import { authFetch } from '@/lib/auth';
import { formatAOA } from '@/lib/formatters';
import type { CatalogOffer, PaymentChannel } from './types';

interface BenefitsTabProps {
  offers: CatalogOffer[];
  isSuspended: boolean;
  enableOnlinePayments: boolean;
  onGoToApps: () => void;
}

/** Angola Benefits Club offers and Kwanza (MCX / KWiK) checkout panel. */
export default function BenefitsTab({
  offers,
  isSuspended,
  enableOnlinePayments,
  onGoToApps,
}: BenefitsTabProps) {
  const [benefitNotice, setBenefitNotice] = useState('');
  const [benefitError, setBenefitError] = useState('');
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [checkoutOffer, setCheckoutOffer] = useState<CatalogOffer | null>(null);
  const [payMethod, setPayMethod] = useState<PaymentChannel>('MULTICAIXA_EXPRESS');
  const [payPhone, setPayPhone] = useState('');

  const handleRedeemFreeOffer = async (offer: CatalogOffer) => {
    setRedeemingId(offer.id);
    setBenefitError('');
    setBenefitNotice('');
    try {
      const redeemRes = await authFetch('/benefits/redeem/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offer_id: offer.id }),
      });
      const redeemData = await redeemRes.json();
      if (!redeemRes.ok) throw new Error(redeemData.detail || 'Erro ao resgatar benefício.');
      setBenefitNotice(
        `Voucher ${redeemData.voucher_code} emitido para ${offer.partner_name} (${offer.title}).`
      );
    } catch (err: any) {
      setBenefitError(err.message || 'Falha ao processar vantagem.');
    } finally {
      setRedeemingId(null);
    }
  };

  const handlePaidCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutOffer) return;
    if (!payPhone.trim()) {
      setBenefitError(
        'Indique o seu número de telemóvel associado ao Multicaixa Express ou KWiK.'
      );
      return;
    }

    setRedeemingId(checkoutOffer.id);
    setBenefitError('');
    setBenefitNotice('');
    try {
      const payRes = await authFetch('/billing/payments/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          benefit_offer: checkoutOffer.id,
          payment_method: payMethod,
          customer_phone: payPhone.trim(),
        }),
      });
      const payData = await payRes.json();
      if (!payRes.ok) throw new Error(payData.detail || 'Erro ao gerar referência de pagamento.');
      setBenefitNotice(
        `Referência ${payData.reference} gerada (${
          payMethod === 'KWIK' ? 'KWiK' : 'Multicaixa Express'
        } · ${formatAOA(checkoutOffer.price_aoa)}) para ${checkoutOffer.partner_name}.`
      );
      setCheckoutOffer(null);
      setPayPhone('');
    } catch (err: any) {
      setBenefitError(err.message || 'Falha ao iniciar pagamento.');
    } finally {
      setRedeemingId(null);
    }
  };

  return (
    <Card padding="sm" className="space-y-3" aria-labelledby="club-heading">
      <div className="flex items-center justify-between gap-2">
        <h2 id="club-heading" className="text-xs font-bold uppercase tracking-wider text-stone-700">
          Clube de Benefícios Angola
        </h2>
        <StatusBadge tone="brand">{offers.length} vantagem(ns)</StatusBadge>
      </div>

      {benefitNotice && (
        <AlertBanner tone="success" onDismiss={() => setBenefitNotice('')}>
          {benefitNotice}
        </AlertBanner>
      )}
      {benefitError && (
        <AlertBanner tone="error" onDismiss={() => setBenefitError('')}>
          {benefitError}
        </AlertBanner>
      )}

      {checkoutOffer && (
        <form
          onSubmit={handlePaidCheckout}
          className="rounded-xl border border-teal-300 bg-teal-50/50 p-4 space-y-3"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-bold text-stone-900">
                {checkoutOffer.partner_name} — {checkoutOffer.title}
              </p>
              <p className="text-xs font-mono text-teal-800 font-semibold">
                Total: {formatAOA(checkoutOffer.price_aoa)}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setCheckoutOffer(null)}
            >
              Fechar
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField id="portal-pay-method" label="Canal de Pagamento">
              {({ id, describedBy, invalid }) => (
                <Select
                  id={id}
                  invalid={invalid}
                  aria-describedby={describedBy}
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as PaymentChannel)}
                >
                  <option value="MULTICAIXA_EXPRESS">Multicaixa Express</option>
                  <option value="KWIK">KWiK Instantâneo</option>
                </Select>
              )}
            </FormField>

            <FormField id="portal-pay-phone" label="Telemóvel MCX / KWiK" required>
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  type="tel"
                  required
                  invalid={invalid}
                  aria-describedby={describedBy}
                  autoComplete="tel"
                  placeholder="+244 923 000 000"
                  value={payPhone}
                  onChange={(e) => setPayPhone(e.target.value)}
                />
              )}
            </FormField>
          </div>

          <Button
            type="submit"
            fullWidth
            loading={redeemingId === checkoutOffer.id}
          >
            Gerar Referência de Pagamento
          </Button>
        </form>
      )}

      {offers.length === 0 ? (
        <EmptyState
          compact
          title="Novos parceiros locais em ativação na sua província"
          description="Entretanto, já pode aceder gratuitamente às ferramentas globais (Google, Microsoft, Canva, GitHub) no separador Apps ou apresentar o seu QR Code em estabelecimentos parceiros."
          action={
            <Button type="button" size="sm" onClick={onGoToApps}>
              Ver Apps &amp; Benefícios Globais
            </Button>
          }
        />
      ) : (
        <ul className="space-y-2">
          {offers.map((offer) => {
            const isPaid = Number.parseFloat(offer.price_aoa || '0') > 0;
            const blockedOnlinePay = isPaid && !enableOnlinePayments;
            return (
              <li
                key={offer.id}
                className="rounded-xl border border-stone-200 p-3 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold text-stone-900 truncate">{offer.partner_name}</p>
                  <p className="text-[11px] text-stone-600 truncate">
                    {offer.title} · {offer.partner_discount}
                  </p>
                </div>
                {blockedOnlinePay ? (
                  <StatusBadge tone="neutral">Disponível no balcão QR</StatusBadge>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    loading={redeemingId === offer.id}
                    disabled={isSuspended}
                    onClick={() =>
                      isPaid ? setCheckoutOffer(offer) : handleRedeemFreeOffer(offer)
                    }
                    className="shrink-0"
                  >
                    {isPaid ? formatAOA(offer.price_aoa) : 'Resgatar'}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
