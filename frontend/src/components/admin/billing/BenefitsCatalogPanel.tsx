'use client';

import React, { useEffect, useState } from 'react';
import { AlertBanner, Card, ConfirmModal, CopyButton, StatusBadge } from '@/components/ui';
import { apiJson, type BenefitOffer, type BenefitPartner, type FeedbackState } from '../types';
import BenefitOfferForm from './BenefitOfferForm';
import BenefitPartnerForm from './BenefitPartnerForm';
import BenefitsPartnersTable from './BenefitsPartnersTable';

interface BenefitsCatalogPanelProps {
  isPlatformAdmin: boolean;
  partners: BenefitPartner[];
  offers: BenefitOffer[];
  busy: boolean;
  fetching?: boolean;
  onSetBusy: (busy: boolean) => void;
  onReload: () => Promise<void>;
  onFeedback: (fb: FeedbackState | null) => void;
}

/** Angola Benefits Club catalog and Platform-Admin-restricted POS API key management. */
export default function BenefitsCatalogPanel({
  isPlatformAdmin,
  partners,
  offers,
  busy,
  fetching = false,
  onSetBusy,
  onReload,
  onFeedback,
}: BenefitsCatalogPanelProps) {
  const [partnerName, setPartnerName] = useState('');
  const [partnerCategory, setPartnerCategory] = useState<BenefitPartner['category']>('TELECOM');
  const [partnerDiscount, setPartnerDiscount] = useState('');
  const [generatedApiKey, setGeneratedApiKey] = useState<{
    partnerName: string;
    apiKey: string;
  } | null>(null);
  const [rotateTargetPartner, setRotateTargetPartner] = useState<BenefitPartner | null>(null);

  const [offerPartnerId, setOfferPartnerId] = useState('');
  const [offerTitle, setOfferTitle] = useState('');
  const [offerPromo, setOfferPromo] = useState('');
  const [offerPrice, setOfferPrice] = useState('0.00');

  useEffect(() => {
    if (partners.length > 0 && !offerPartnerId) {
      setOfferPartnerId(partners[0].id);
    }
  }, [partners, offerPartnerId]);

  const handleCreatePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    onSetBusy(true);
    onFeedback(null);
    try {
      const partner = await apiJson<BenefitPartner>('/benefits/partners/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: partnerName.trim(),
          category: partnerCategory,
          discount_label: partnerDiscount.trim(),
          eligible_roles: ['STUDENT', 'TEACHER'],
        }),
      });
      setPartnerName('');
      setPartnerDiscount('');
      setOfferPartnerId(partner.id);
      onFeedback({
        type: 'success',
        message: `Parceiro "${partner.name}" registado no Clube de Benefícios.`,
      });
      await onReload();
    } catch (err: any) {
      onFeedback({ type: 'error', message: err.message });
    } finally {
      onSetBusy(false);
    }
  };

  const executeRotatePartnerKey = async (partner: BenefitPartner) => {
    onSetBusy(true);
    onFeedback(null);
    try {
      const res = await apiJson<{ api_key: string }>(
        `/benefits/partners/${partner.id}/rotate-api-key/`,
        { method: 'POST' }
      );
      setGeneratedApiKey({ partnerName: partner.name, apiKey: res.api_key });
      setRotateTargetPartner(null);
      onFeedback({
        type: 'success',
        message: `Nova API Key POS gerada para ${partner.name}. Copie-a agora (não voltará a ser exibida).`,
      });
      await onReload();
    } catch (err: any) {
      onFeedback({ type: 'error', message: err.message });
    } finally {
      onSetBusy(false);
    }
  };

  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!offerPartnerId) return;
    onSetBusy(true);
    onFeedback(null);
    try {
      await apiJson('/benefits/offers/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partner: offerPartnerId,
          title: offerTitle.trim(),
          promo_code: offerPromo.trim(),
          price_aoa: offerPrice || '0.00',
          requires_active_enrollment: true,
        }),
      });
      setOfferTitle('');
      setOfferPromo('');
      setOfferPrice('0.00');
      onFeedback({
        type: 'success',
        message: 'Oferta publicada no catálogo do Portal do Estudante.',
      });
      await onReload();
    } catch (err: any) {
      onFeedback({ type: 'error', message: err.message });
    } finally {
      onSetBusy(false);
    }
  };

  return (
    <Card padding="md" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-stone-900">
            Clube de Benefícios Angola (Parceiros &amp; Ofertas)
          </h2>
          <p className="text-xs text-stone-600">
            {isPlatformAdmin
              ? 'Gestão global de operadoras (Unitel/Africell), livrarias e bancos com validação via Passaporte Digital QR.'
              : 'Catálogo nacional de vantagens ativas disponíveis aos estudantes e docentes da instituição no Portal PWA.'}
          </p>
        </div>
        {!isPlatformAdmin && (
          <StatusBadge tone="neutral">Gerido pela Administração EduLink</StatusBadge>
        )}
      </div>

      {isPlatformAdmin && generatedApiKey && (
        <AlertBanner
          tone="warning"
          title={`API Key POS — ${generatedApiKey.partnerName} (exibição única)`}
          onDismiss={() => setGeneratedApiKey(null)}
          dismissLabel="Fechar aviso da API Key"
          action={
            <CopyButton
              key={generatedApiKey.apiKey}
              value={generatedApiKey.apiKey}
              label="Copiar Key"
              copiedLabel="Copiada!"
              onCopyError={() =>
                onFeedback({
                  type: 'error',
                  message:
                    'Não foi possível copiar automaticamente. Selecione e copie a chave manualmente.',
                })
              }
            />
          }
        >
          <code className="font-mono bg-white px-2 py-1 rounded border border-amber-200 break-all inline-block text-xs">
            {generatedApiKey.apiKey}
          </code>
        </AlertBanner>
      )}

      {isPlatformAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <BenefitPartnerForm
            partnerName={partnerName}
            partnerCategory={partnerCategory}
            partnerDiscount={partnerDiscount}
            busy={busy}
            onChangeName={setPartnerName}
            onChangeCategory={setPartnerCategory}
            onChangeDiscount={setPartnerDiscount}
            onSubmit={handleCreatePartner}
          />
          <BenefitOfferForm
            partners={partners}
            offerPartnerId={offerPartnerId}
            offerTitle={offerTitle}
            offerPrice={offerPrice}
            offerPromo={offerPromo}
            busy={busy}
            onChangePartnerId={setOfferPartnerId}
            onChangeTitle={setOfferTitle}
            onChangePrice={setOfferPrice}
            onChangePromo={setOfferPromo}
            onSubmit={handleCreateOffer}
          />
        </div>
      )}

      <BenefitsPartnersTable
        partners={partners}
        offers={offers}
        isPlatformAdmin={isPlatformAdmin}
        busy={busy}
        fetching={fetching}
        onTriggerPosKeyAction={(partner) =>
          partner.has_api_key
            ? setRotateTargetPartner(partner)
            : executeRotatePartnerKey(partner)
        }
      />

      <ConfirmModal
        open={Boolean(rotateTargetPartner)}
        onClose={() => setRotateTargetPartner(null)}
        onConfirm={() => {
          if (rotateTargetPartner) executeRotatePartnerKey(rotateTargetPartner);
        }}
        destructive
        loading={busy}
        title="Rodar API Key POS do parceiro?"
        description={
          rotateTargetPartner
            ? `A chave atual de "${rotateTargetPartner.name}" será revogada imediatamente e os terminais POS terão de usar a nova chave.`
            : ''
        }
        confirmLabel="Gerar Nova API Key"
      />
    </Card>
  );
}
