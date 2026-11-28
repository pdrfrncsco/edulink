'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ExternalLink } from 'lucide-react';
import { AlertBanner, Button, Card, FormField, Input, Select, StatusBadge } from '@/components/ui';
import { API_BASE, ParentalConsent } from '@/components/admin/types';

function ConsentContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [consent, setConsent] = useState<ParentalConsent | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [guardianName, setGuardianName] = useState('');
  const [guardianBi, setGuardianBi] = useState('');
  const [relationship, setRelationship] = useState<'PAI_MAE' | 'TUTOR_LEGAL' | 'ENCARREGADO'>(
    'PAI_MAE'
  );
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Token de consentimento não fornecido.');
      setLoading(false);
      return;
    }

    fetch(`${API_BASE}/compliance/consents/by-token/?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Termo não encontrado.');
        setConsent(data);
        if (data.guardian_full_name) setGuardianName(data.guardian_full_name);
        if (data.guardian_bi) setGuardianBi(data.guardian_bi);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSign = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/compliance/consents/sign/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          guardian_full_name: guardianName,
          guardian_bi: guardianBi,
          guardian_relationship: relationship,
          guardian_phone: phone,
          guardian_email: email,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Falha ao assinar termo.');
      setConsent(data.consent);
      setSuccessMessage(
        'Termo de Consentimento assinado e registado com sucesso ao abrigo da Lei n.º 22/11!'
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f8f7f4] flex items-center justify-center p-4">
      <Card padding="lg" className="w-full max-w-lg rounded-3xl space-y-6">
        <div className="border-b border-stone-100 pb-4 space-y-2">
          <StatusBadge tone="brand">APD Angola • Lei n.º 22/11</StatusBadge>
          <h1 className="text-xl font-bold text-stone-900">Termo de Consentimento Parental</h1>
          <p className="text-xs text-stone-500">
            Autorização do Encarregado de Educação para emissão de conta académica{' '}
            <code>.edu.ao</code> e Cartão Digital.
          </p>
        </div>

        {loading && (
          <p className="text-sm text-stone-500" role="status">
            A carregar dados do termo...
          </p>
        )}
        {error && <AlertBanner tone="error">{error}</AlertBanner>}
        {successMessage && <AlertBanner tone="success">{successMessage}</AlertBanner>}

        {consent && (
          <>
            <Card variant="muted" padding="sm" className="rounded-xl text-xs space-y-1">
              <p>
                <strong>Instituição:</strong> {consent.school_name}
              </p>
              <p>
                <strong>Estudante:</strong> {consent.student_name}
              </p>
              <p>
                <strong>E-mail Institucional:</strong>{' '}
                <span className="font-mono text-teal-800">{consent.student_email}</span>
              </p>
              <div className="pt-0.5 flex items-center gap-2">
                <strong>Estado Atual:</strong>
                <StatusBadge
                  tone={
                    consent.status === 'SIGNED'
                      ? 'success'
                      : consent.status === 'REVOKED'
                      ? 'error'
                      : 'warning'
                  }
                  dot
                >
                  {consent.status === 'SIGNED'
                    ? 'Assinado'
                    : consent.status === 'REVOKED'
                    ? 'Revogado'
                    : 'Pendente'}
                </StatusBadge>
              </div>
            </Card>

            {consent.status === 'REVOKED' ? (
              <AlertBanner tone="error" title="Consentimento Revogado">
                Este termo foi revogado junto da secretaria da escola. Contacte a direção caso
                pretenda emitir um novo termo de autorização.
              </AlertBanner>
            ) : consent.status === 'SIGNED' ? (
              <div className="space-y-3 text-xs text-stone-700">
                <p>
                  Assinado por <strong>{consent.guardian_full_name}</strong> (BI:{' '}
                  <span className="font-mono">{consent.guardian_bi}</span>).
                </p>
                <a
                  href={`${API_BASE}/compliance/consents/download-by-token/?token=${encodeURIComponent(
                    consent.consent_token
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-[44px] items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-700 text-white font-semibold hover:bg-teal-800 transition"
                >
                  <span>Descarregar Comprovativo (HTML / Imprimir)</span>
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              </div>
            ) : (
              <form onSubmit={handleSign} className="space-y-4">
                <FormField
                  id="consent-guardian-name"
                  label="Nome Completo do Encarregado"
                  required
                >
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
                      onChange={(e) => setGuardianName(e.target.value)}
                    />
                  )}
                </FormField>

                <FormField
                  id="consent-guardian-bi"
                  label="N.º do Bilhete de Identidade (BI)"
                  required
                >
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
                      onChange={(e) => setGuardianBi(e.target.value)}
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
                      onChange={(e) => setRelationship(e.target.value as typeof relationship)}
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
                        onChange={(e) => setPhone(e.target.value)}
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
                        onChange={(e) => setEmail(e.target.value)}
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
            )}
          </>
        )}
      </Card>
    </main>
  );
}

export default function ConsentPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs text-stone-500">A carregar formulário...</div>
      }
    >
      <ConsentContent />
    </Suspense>
  );
}
