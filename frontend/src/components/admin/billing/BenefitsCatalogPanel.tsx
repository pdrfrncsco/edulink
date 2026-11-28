'use client';

import React, { useEffect, useState } from 'react';
import { KeyRound } from 'lucide-react';
import {
  AlertBanner,
  Button,
  Card,
  ConfirmModal,
  CopyButton,
  DataTable,
  FormField,
  Input,
  Select,
  StatusBadge,
  type DataTableColumn,
} from '@/components/ui';
import { formatAOA } from '@/lib/formatters';
import { apiJson, type BenefitOffer, type BenefitPartner, type FeedbackState } from '../types';

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

  const columns: DataTableColumn<BenefitPartner>[] = [
    {
      key: 'name',
      header: 'Parceiro',
      isRowHeader: true,
      render: (partner) => partner.name,
    },
    {
      key: 'discount',
      header: 'Vantagem',
      render: (partner) => partner.discount_label,
    },
    {
      key: 'offers',
      header: 'Ofertas Ativas',
      render: (partner) => {
        const partnerOffers = offers.filter((o) => o.partner === partner.id);
        return partnerOffers.length > 0
          ? partnerOffers
              .map(
                (o) =>
                  `${o.title} (${
                    Number.parseFloat(o.price_aoa) > 0 ? formatAOA(o.price_aoa) : 'QR Grátis'
                  })`
              )
              .join(', ')
          : 'Sem ofertas';
      },
    },
    ...(isPlatformAdmin
      ? [
          {
            key: 'pos',
            header: 'Integração POS',
            render: (partner: BenefitPartner) => (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
                leftIcon={<KeyRound className="h-3.5 w-3.5" aria-hidden="true" />}
                onClick={() =>
                  partner.has_api_key
                    ? setRotateTargetPartner(partner)
                    : executeRotatePartnerKey(partner)
                }
              >
                {partner.has_api_key ? 'Rodar API Key POS' : 'Gerar API Key POS'}
              </Button>
            ),
          },
        ]
      : []),
  ];

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
          <form onSubmit={handleCreatePartner} className="space-y-3 bg-stone-50 p-4 rounded-xl border border-stone-200">
            <h3 className="text-xs font-bold uppercase tracking-wide text-stone-700">Novo Parceiro Comercial</h3>
            <FormField id="partner-name" label="Nome do Parceiro" required>
              {({ id, describedBy, invalid }) => (
                <Input id={id} required invalid={invalid} aria-describedby={describedBy} value={partnerName} onChange={(e) => setPartnerName(e.target.value)} placeholder="Ex.: Unitel Educação" />
              )}
            </FormField>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <FormField id="partner-category" label="Categoria">
                {({ id, describedBy, invalid }) => (
                  <Select id={id} invalid={invalid} aria-describedby={describedBy} value={partnerCategory} onChange={(e) => setPartnerCategory(e.target.value as BenefitPartner['category'])}>
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
                  <Input id={id} required invalid={invalid} aria-describedby={describedBy} value={partnerDiscount} onChange={(e) => setPartnerDiscount(e.target.value)} placeholder="Ex.: 50% Bónus Dados" />
                )}
              </FormField>
            </div>
            <Button type="submit" disabled={busy}>Registar Parceiro</Button>
          </form>

          <form onSubmit={handleCreateOffer} className="space-y-3 bg-stone-50 p-4 rounded-xl border border-stone-200">
            <h3 className="text-xs font-bold uppercase tracking-wide text-stone-700">Publicar Oferta / Pacote AOA</h3>
            <FormField id="offer-partner" label="Parceiro">
              {({ id, describedBy, invalid }) => (
                <Select id={id} invalid={invalid} aria-describedby={describedBy} value={offerPartnerId} onChange={(e) => setOfferPartnerId(e.target.value)}>
                  {partners.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
                </Select>
              )}
            </FormField>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <FormField id="offer-title" label="Título" required className="sm:col-span-2">
                {({ id, describedBy, invalid }) => (
                  <Input id={id} required invalid={invalid} aria-describedby={describedBy} value={offerTitle} onChange={(e) => setOfferTitle(e.target.value)} placeholder="Ex.: Pacote Estudante 10GB" />
                )}
              </FormField>
              <FormField id="offer-price" label="Preço (AOA)">
                {({ id, describedBy, invalid }) => (
                  <Input id={id} type="number" step="0.01" min="0" invalid={invalid} aria-describedby={describedBy} value={offerPrice} onChange={(e) => setOfferPrice(e.target.value)} />
                )}
              </FormField>
            </div>
            <FormField id="offer-promo" label="Código Base (opcional)">
              {({ id, describedBy, invalid }) => (
                <Input id={id} mono invalid={invalid} aria-describedby={describedBy} value={offerPromo} onChange={(e) => setOfferPromo(e.target.value)} placeholder="Ex.: UNITEL-EDU27" />
              )}
            </FormField>
            <Button type="submit" variant="secondary" disabled={busy || partners.length === 0}>Publicar Oferta</Button>
          </form>
        </div>
      )}

      <DataTable
        columns={columns}
        data={partners}
        getRowKey={(partner) => partner.id}
        caption="Parceiros e ofertas do Clube de Benefícios"
        loading={fetching}
        emptyTitle="Nenhum parceiro configurado ainda"
        emptyDescription="Os parceiros comerciais locais serão exibidos aqui assim que estiverem ativos."
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
