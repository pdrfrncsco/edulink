'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertBanner, Card, SkeletonCard, StatusBadge } from '@/components/ui';
import { API_BASE, type ParentalConsent } from '@/components/admin/types';
import ConsentSignatureForm, {
  type GuardianRelationship,
} from '@/components/consent/ConsentSignatureForm';
import ConsentSummaryCard from '@/components/consent/ConsentSummaryCard';

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
  const [relationship, setRelationship] = useState<GuardianRelationship>('PAI_MAE');
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

        {loading && <SkeletonCard rows={4} />}
        {error && <AlertBanner tone="error">{error}</AlertBanner>}
        {successMessage && <AlertBanner tone="success">{successMessage}</AlertBanner>}

        {consent && (
          <>
            <ConsentSummaryCard consent={consent} />
            {consent.status === 'PENDING' && (
              <ConsentSignatureForm
                guardianName={guardianName}
                guardianBi={guardianBi}
                relationship={relationship}
                phone={phone}
                email={email}
                submitting={submitting}
                onChangeGuardianName={setGuardianName}
                onChangeGuardianBi={setGuardianBi}
                onChangeRelationship={setRelationship}
                onChangePhone={setPhone}
                onChangeEmail={setEmail}
                onSubmit={handleSign}
              />
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
