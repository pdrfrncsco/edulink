'use client';

import React from 'react';
import { KeyRound } from 'lucide-react';
import { Button, DataTable, type DataTableColumn } from '@/components/ui';
import { formatAOA } from '@/lib/formatters';
import type { BenefitOffer, BenefitPartner } from '../types';

interface BenefitsPartnersTableProps {
  partners: BenefitPartner[];
  offers: BenefitOffer[];
  isPlatformAdmin: boolean;
  busy: boolean;
  fetching?: boolean;
  onTriggerPosKeyAction: (partner: BenefitPartner) => void;
}

/** Displays active Benefits Club partners, their offers, and POS API key rotation controls. */
export default function BenefitsPartnersTable({
  partners,
  offers,
  isPlatformAdmin,
  busy,
  fetching = false,
  onTriggerPosKeyAction,
}: BenefitsPartnersTableProps) {
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
                onClick={() => onTriggerPosKeyAction(partner)}
              >
                {partner.has_api_key ? 'Rodar API Key POS' : 'Gerar API Key POS'}
              </Button>
            ),
          },
        ]
      : []),
  ];

  return (
    <DataTable
      columns={columns}
      data={partners}
      getRowKey={(partner) => partner.id}
      caption="Parceiros e ofertas do Clube de Benefícios"
      loading={fetching}
      emptyTitle="Nenhum parceiro configurado ainda"
      emptyDescription="Os parceiros comerciais locais serão exibidos aqui assim que estiverem ativos."
    />
  );
}
