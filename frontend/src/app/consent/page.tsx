'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
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
  const [relationship, setRelationship] = useState<'PAI_MAE' | 'TUTOR_LEGAL' | 'ENCARREGADO'>('PAI_MAE');
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
      setSuccessMessage('Termo de Consentimento assinado e registado com sucesso ao abrigo da Lei n.º 22/11!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f7f4] flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white border border-stone-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="border-b border-stone-100 pb-4">
          <span className="inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 mb-2">
            APD Angola • Lei n.º 22/11
          </span>
          <h1 className="text-xl font-bold text-stone-900">Termo de Consentimento Parental</h1>
          <p className="text-xs text-stone-500 mt-1">
            Autorização do Encarregado de Educação para emissão de conta académica <code>.edu.ao</code> e Cartão Digital.
          </p>
        </div>

        {loading && <p className="text-sm text-stone-500">A carregar dados do termo...</p>}
        {error && (
          <div role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 font-semibold">
            {error}
          </div>
        )}
        {successMessage && (
          <div role="status" className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 font-semibold">
            {successMessage}
          </div>
        )}

        {consent && (
          <>
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 text-xs space-y-1">
              <p><strong>Instituição:</strong> {consent.school_name}</p>
              <p><strong>Estudante:</strong> {consent.student_name}</p>
              <p><strong>E-mail Institucional:</strong> <span className="font-mono text-teal-800">{consent.student_email}</span></p>
              <p><strong>Estado Atual:</strong> {consent.status}</p>
            </div>

            {consent.status === 'SIGNED' ? (
              <div className="space-y-3 text-xs text-stone-700">
                <p>
                  Assinado por <strong>{consent.guardian_full_name}</strong> (BI: {consent.guardian_bi}).
                </p>
                <a
                  href={`${API_BASE}/compliance/consents/download-by-token/?token=${encodeURIComponent(consent.consent_token)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block px-4 py-2.5 rounded-xl bg-teal-700 text-white font-semibold hover:bg-teal-800"
                >
                  Descarregar Comprovativo (HTML / Imprimir)
                </a>
              </div>
            ) : (
              <form onSubmit={handleSign} className="space-y-4">
                <div>
                  <label htmlFor="consent-guardian-name" className="block text-xs font-semibold uppercase text-stone-700 mb-1">
                    Nome Completo do Encarregado <span aria-hidden="true">*</span>
                  </label>
                  <input
                    id="consent-guardian-name"
                    name="guardian_full_name"
                    type="text"
                    required
                    autoComplete="name"
                    value={guardianName}
                    onChange={(e) => setGuardianName(e.target.value)}
                    className="edulink-input w-full px-3.5 py-2 rounded-xl border border-stone-300 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="consent-guardian-bi" className="block text-xs font-semibold uppercase text-stone-700 mb-1">
                    N.º do Bilhete de Identidade (BI) <span aria-hidden="true">*</span>
                  </label>
                  <input
                    id="consent-guardian-bi"
                    name="guardian_bi"
                    type="text"
                    required
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    value={guardianBi}
                    onChange={(e) => setGuardianBi(e.target.value)}
                    className="edulink-input w-full px-3.5 py-2 rounded-xl border border-stone-300 text-sm font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="consent-rel" className="block text-xs font-semibold uppercase text-stone-700 mb-1">
                    Qualidade / Parentesco
                  </label>
                  <select
                    id="consent-rel"
                    name="guardian_relationship"
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value as any)}
                    className="edulink-input w-full px-3.5 py-2 rounded-xl border border-stone-300 text-sm bg-white"
                  >
                    <option value="PAI_MAE">Pai / Mãe</option>
                    <option value="TUTOR_LEGAL">Tutor Legal</option>
                    <option value="ENCARREGADO">Encarregado de Educação</option>
                  </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="consent-phone" className="block text-xs font-semibold uppercase text-stone-700 mb-1">
                      Telefone
                    </label>
                    <input
                      id="consent-phone"
                      name="guardian_phone"
                      type="tel"
                      autoComplete="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="edulink-input w-full px-3.5 py-2 rounded-xl border border-stone-300 text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="consent-email" className="block text-xs font-semibold uppercase text-stone-700 mb-1">
                      E-mail
                    </label>
                    <input
                      id="consent-email"
                      name="guardian_email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="edulink-input w-full px-3.5 py-2 rounded-xl border border-stone-300 text-sm"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 rounded-xl bg-teal-700 text-white font-semibold text-sm hover:bg-teal-800 disabled:opacity-50"
                >
                  {submitting ? 'A Registar Assinatura...' : 'Autorizar e Assinar Termo Digitalmente'}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function ConsentPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-stone-500">A carregar formulário...</div>}>
      <ConsentContent />
    </Suspense>
  );
}
