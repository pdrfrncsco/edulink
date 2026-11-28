'use client';

import React, { useMemo, useState } from 'react';
import { AlertBanner, Button, FormField, Input, Modal, Select } from '@/components/ui';
import { slugifySchool } from '@/lib/formatters';
import { ADMIN_URL, PROVINCE_LIST, ROOT_DOMAIN, WHATSAPP_NUMBER } from './data';

interface DemoModalProps {
  open: boolean;
  initialSchool: string;
  onClose: () => void;
}

/** Accessible commercial demo request modal with iOS-zoom-safe form inputs and WhatsApp handoff. */
export default function DemoModal({ open, initialSchool, onClose }: DemoModalProps) {
  const [demoDirector, setDemoDirector] = useState('');
  const [demoSchool, setDemoSchool] = useState(initialSchool);
  const [demoPhone, setDemoPhone] = useState('');
  const [demoProvince, setDemoProvince] = useState('Luanda');
  const [demoSubmitted, setDemoSubmitted] = useState(false);

  React.useEffect(() => {
    if (open) {
      setDemoSchool(initialSchool);
      setDemoSubmitted(false);
    }
  }, [open, initialSchool]);

  const whatsappHref = useMemo(() => {
    const text = encodeURIComponent(
      `Olá equipa EduLink Angola! Sou ${demoDirector || 'da direção'} de "${demoSchool || initialSchool}" (${demoProvince}). Gostaria de agendar a demonstração do domínio .edu.ao, site automático e licenças Google/Microsoft/Canva. Contacto: ${demoPhone || 'a confirmar'}.`
    );
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`;
  }, [demoDirector, demoSchool, demoPhone, demoProvince, initialSchool]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDemoSubmitted(true);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow="Demonstração Comercial · Angola"
      title="Veja o site da sua escola pronto em 5 minutos"
      size="md"
    >
      {!demoSubmitted ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField id="demo-director" label="Seu Nome e Cargo" required>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                name="director"
                required
                autoFocus
                invalid={invalid}
                aria-describedby={describedBy}
                autoComplete="name"
                enterKeyHint="next"
                value={demoDirector}
                onChange={(e) => setDemoDirector(e.target.value)}
                placeholder="Ex.: Dr. Carlos Mendes — Diretor Pedagógico"
              />
            )}
          </FormField>

          <FormField id="demo-school" label="Nome do Colégio / IES" required>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                name="organization"
                required
                invalid={invalid}
                aria-describedby={describedBy}
                autoComplete="organization"
                enterKeyHint="next"
                value={demoSchool}
                onChange={(e) => setDemoSchool(e.target.value)}
                placeholder="Ex.: Colégio Esperança de Luanda"
              />
            )}
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField id="demo-phone" label="WhatsApp / Telefone" required>
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  name="tel"
                  type="tel"
                  required
                  invalid={invalid}
                  aria-describedby={describedBy}
                  autoComplete="tel"
                  enterKeyHint="done"
                  value={demoPhone}
                  onChange={(e) => setDemoPhone(e.target.value)}
                  placeholder="+244 923 000 000"
                />
              )}
            </FormField>

            <FormField id="demo-province" label="Província">
              {({ id, describedBy, invalid }) => (
                <Select
                  id={id}
                  name="province"
                  invalid={invalid}
                  aria-describedby={describedBy}
                  value={demoProvince}
                  onChange={(e) => setDemoProvince(e.target.value)}
                >
                  {PROVINCE_LIST.map((prov) => (
                    <option key={prov} value={prov}>
                      {prov}
                    </option>
                  ))}
                </Select>
              )}
            </FormField>
          </div>

          <Button type="submit" size="lg" fullWidth>
            Preparar Contacto e Demonstração
          </Button>
        </form>
      ) : (
        <div className="space-y-4">
          <AlertBanner tone="success" title="Resumo pronto para a equipa comercial EduLink!">
            <p>
              Instituição: <strong>{demoSchool}</strong> ({demoProvince})
            </p>
            <p>
              Pré-visualização sugerida:{' '}
              <strong className="font-mono">
                {slugifySchool(demoSchool, 'sua-escola')}.{ROOT_DOMAIN}
              </strong>
            </p>
          </AlertBanner>
          <div className="space-y-2">
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[44px] flex items-center justify-center w-full text-center py-3 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition"
            >
              Enviar Pedido via WhatsApp Agora
            </a>
            <a
              href={ADMIN_URL}
              className="min-h-[44px] flex items-center justify-center w-full text-center py-3 rounded-xl bg-stone-900 text-white text-xs font-bold hover:bg-stone-800 transition"
            >
              Ou Criar Conta e Iniciar Registo
            </a>
          </div>
        </div>
      )}
    </Modal>
  );
}
