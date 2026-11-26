'use client';

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import AuthCard from '@/components/auth/AuthCard';
import {
  authFetch,
  AuthUser,
  clearAuthSession,
  getAccessToken,
  getStoredUser,
  updateStoredUser,
} from '@/lib/auth';

const OFFLINE_PASSPORT_KEY = 'edulink_offline_passport_cache';

interface PassportData {
  fullName: string;
  role: string;
  institutionalEmail: string;
  schoolName: string;
  schoolDomain: string;
  biNumber: string;
  gradeClass: string;
  academicYear: string;
  status: string;
  token: string;
  verificationUrl: string;
}

interface CatalogOffer {
  id: string;
  partner_name: string;
  partner_category: string;
  partner_discount: string;
  title: string;
  promo_code: string;
  price_aoa: string;
}

export default function PortalStudentPage() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [passport, setPassport] = useState<PassportData | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isOfflineCache, setIsOfflineCache] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [offers, setOffers] = useState<CatalogOffer[]>([]);
  const [benefitNotice, setBenefitNotice] = useState('');
  const [benefitError, setBenefitError] = useState('');
  const [redeemingId, setRedeemingId] = useState<string | null>(null);

  const renderQrFromUrl = async (verifyUrl: string) => {
    try {
      const dataUrl = await QRCode.toDataURL(verifyUrl, {
        width: 240,
        margin: 1,
        color: { dark: '#1c1917', light: '#ffffff' },
      });
      setQrDataUrl(dataUrl);
    } catch {
      setQrDataUrl('');
    }
  };

  const fetchRealPassport = async (user: AuthUser) => {
    setError('');
    setIsOfflineCache(false);

    if (!user.academic_user) {
      setError('A sua conta não possui um registo académico (Estudante/Professor) associado.');
      return;
    }

    try {
      const issueRes = await authFetch('/passport/issue/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.academic_user.id }),
      });
      const issueData = await issueRes.json();
      if (!issueRes.ok) {
        throw new Error(issueData.detail || 'Falha ao emitir Passaporte Digital.');
      }

      const verifyPath = `/verify?token=${encodeURIComponent(issueData.token)}`;
      const fullVerifyUrl =
        typeof window !== 'undefined' ? `${window.location.origin}${verifyPath}` : verifyPath;

      const card: PassportData = {
        fullName: user.academic_user.full_name,
        role: user.academic_user.role,
        institutionalEmail: user.academic_user.institutional_email,
        schoolName: issueData.school_name || user.school_name || 'Instituição EduLink',
        schoolDomain: issueData.school_domain || user.school_domain || 'edulink.ao',
        biNumber: user.academic_user.bi_or_student_id,
        gradeClass: user.academic_user.grade_class || 'Matrícula Ativa',
        academicYear: user.academic_user.academic_year || '2026/2027',
        status: user.academic_user.enrollment_status || (user.academic_user.is_active ? 'ACTIVE' : 'SUSPENDED'),
        token: issueData.token,
        verificationUrl: fullVerifyUrl,
      };

      setPassport(card);
      localStorage.setItem(OFFLINE_PASSPORT_KEY, JSON.stringify(card));
      await renderQrFromUrl(fullVerifyUrl);
      loadBenefitCatalog();
    } catch (err: any) {
      const cachedRaw = localStorage.getItem(OFFLINE_PASSPORT_KEY);
      if (cachedRaw) {
        const cachedCard = JSON.parse(cachedRaw) as PassportData;
        setPassport(cachedCard);
        setIsOfflineCache(true);
        await renderQrFromUrl(cachedCard.verificationUrl);
      } else {
        setError(err.message || 'Erro ao emitir o Passaporte Académico.');
      }
    }
  };

  const syncPortalSession = async () => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    const token = getAccessToken();
    const cachedUser = getStoredUser();
    if (!token) {
      setAuthReady(true);
      return;
    }

    if (cachedUser) setAuthUser(cachedUser);

    try {
      const meRes = await authFetch('/auth/me/');
      if (!meRes.ok) throw new Error('Sessão expirada');
      const me = (await meRes.json()) as AuthUser;
      setAuthUser(me);
      updateStoredUser(me);
      await fetchRealPassport(me);
    } catch {
      const cachedCardRaw = localStorage.getItem(OFFLINE_PASSPORT_KEY);
      if (cachedUser && cachedCardRaw) {
        const cachedCard = JSON.parse(cachedCardRaw) as PassportData;
        setPassport(cachedCard);
        setIsOfflineCache(true);
        await renderQrFromUrl(cachedCard.verificationUrl);
      } else {
        clearAuthSession();
        setAuthUser(null);
      }
    } finally {
      setAuthReady(true);
    }
  };

  useEffect(() => {
    syncPortalSession();
  }, []);

  const handleAuthenticated = async (user: AuthUser) => {
    setAuthUser(user);
    await fetchRealPassport(user);
  };

  const handleLogout = () => {
    clearAuthSession();
    localStorage.removeItem(OFFLINE_PASSPORT_KEY);
    setAuthUser(null);
    setPassport(null);
    setQrDataUrl('');
  };

  const loadBenefitCatalog = async () => {
    try {
      const res = await authFetch('/benefits/catalog/');
      if (!res.ok) return;
      const data = await res.json();
      setOffers(Array.isArray(data) ? data : data.results || []);
    } catch {
      // Offline mode: manter catálogo vazio sem quebrar o cartão
    }
  };

  const handleRedeemOffer = async (offer: CatalogOffer) => {
    setRedeemingId(offer.id);
    setBenefitError('');
    setBenefitNotice('');
    try {
      const price = parseFloat(offer.price_aoa || '0');
      if (price > 0) {
        const payRes = await authFetch('/billing/payments/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            benefit_offer: offer.id,
            payment_method: 'MULTICAIXA_EXPRESS',
          }),
        });
        const payData = await payRes.json();
        if (!payRes.ok) throw new Error(payData.detail || 'Erro ao iniciar pagamento Multicaixa.');
        setBenefitNotice(
          `Referência Multicaixa Express ${payData.reference} gerada (${offer.price_aoa} AOA) para ${offer.partner_name}.`
        );
      } else {
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
      }
    } catch (err: any) {
      setBenefitError(err.message || 'Falha ao processar vantagem.');
    } finally {
      setRedeemingId(null);
    }
  };

  const handleCopyLink = () => {
    if (!passport) return;
    navigator.clipboard.writeText(passport.verificationUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!authReady) {
    return <p className="text-sm text-stone-500 py-12">A carregar Passaporte Digital...</p>;
  }

  if (!authUser) {
    return <AuthCard mode="academic" onAuthenticated={handleAuthenticated} />;
  }

  const isSuspended = passport?.status === 'SUSPENDED';

  return (
    <div className="w-full max-w-sm space-y-4">
      {isOfflineCache && (
        <div role="status" className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 text-center font-medium">
          Modo offline PWA ativo — apresentando o último cartão assinado guardado no dispositivo.
        </div>
      )}

      {error && (
        <div role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 font-semibold">
          {error}
        </div>
      )}

      {passport && (
        <>
          <div
            className={`text-white rounded-3xl p-6 shadow-xl relative overflow-hidden border ${
              isSuspended
                ? 'bg-gradient-to-br from-stone-800 to-red-950 border-red-800/60'
                : 'bg-gradient-to-br from-teal-800 to-teal-950 border-teal-700/50'
            }`}
          >
            <div className="flex items-center justify-between border-b border-white/15 pb-4">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-teal-200">
                  Passaporte Académico Digital
                </span>
                <h1 className="text-sm font-bold text-white truncate max-w-[190px]">{passport.schoolName}</h1>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  isSuspended
                    ? 'bg-red-500/20 text-red-200 border-red-400/40'
                    : 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40'
                }`}
              >
                {isSuspended ? 'MATRÍCULA SUSPENSA' : 'MATRÍCULA ACTIVA'}
              </span>
            </div>

            <div className="py-5 space-y-3">
              <div>
                <span className="text-[10px] uppercase font-semibold text-teal-200 block">
                  {passport.role === 'TEACHER' ? 'Docente' : 'Estudante'}
                </span>
                <span className="text-lg font-extrabold tracking-tight text-white block">{passport.fullName}</span>
                <span className="text-xs text-teal-100 font-mono block">{passport.institutionalEmail}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                <div>
                  <span className="text-[10px] uppercase text-teal-200 block">N.º de BI / Processo</span>
                  <span className="font-semibold text-white font-mono">{passport.biNumber}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-teal-200 block">Ano Lectivo</span>
                  <span className="font-semibold text-white">{passport.academicYear}</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase text-teal-200 block">Turma / Departamento</span>
                <span className="text-xs font-semibold text-white">{passport.gradeClass}</span>
              </div>
            </div>

            <div className="mt-2 bg-white text-stone-900 rounded-2xl p-4 flex flex-col items-center justify-center space-y-2 shadow-inner">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR Code de verificação académica de ${passport.fullName}`}
                  width={152}
                  height={152}
                  className="rounded-lg"
                />
              ) : (
                <div className="w-36 h-36 bg-stone-100 rounded-xl flex items-center justify-center text-xs text-stone-500">
                  A gerar QR Code...
                </div>
              )}
              <span className="text-[10px] text-stone-500 font-medium text-center">
                Assinado criptograficamente via JWT • Apresente na portaria ou parceiros
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <a
              href={`/verify?token=${encodeURIComponent(passport.token)}`}
              className="flex-1 py-2.5 px-3 rounded-xl bg-white border border-stone-300 text-stone-700 text-xs font-semibold text-center hover:bg-stone-50 transition shadow-sm"
            >
              Validar Cartão
            </a>
            <button
              type="button"
              onClick={handleCopyLink}
              className="py-2.5 px-4 rounded-xl bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800 transition shadow-sm"
            >
              {copied ? 'Copiado!' : 'Copiar Link'}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="py-2.5 px-3 rounded-xl border border-stone-300 bg-white text-stone-700 text-xs font-semibold hover:bg-stone-50"
            >
              Sair
            </button>
          </div>

          <section aria-labelledby="club-heading" className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h2 id="club-heading" className="text-xs font-bold uppercase tracking-wider text-stone-700">
                Clube de Benefícios Angola
              </h2>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                {offers.length} vantagem(ns)
              </span>
            </div>

            {benefitNotice && (
              <div role="status" className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 font-medium">
                {benefitNotice}
              </div>
            )}
            {benefitError && (
              <div role="alert" className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 font-medium">
                {benefitError}
              </div>
            )}

            {offers.length === 0 ? (
              <p className="text-xs text-stone-500">
                Sem ofertas ativas de parceiros neste momento. Apresente o QR Code acima em estabelecimentos parceiros.
              </p>
            ) : (
              <ul className="space-y-2">
                {offers.map((offer) => {
                  const isPaid = parseFloat(offer.price_aoa || '0') > 0;
                  return (
                    <li key={offer.id} className="rounded-xl border border-stone-200 p-3 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-stone-900 truncate">{offer.partner_name}</p>
                        <p className="text-[11px] text-stone-600 truncate">{offer.title} · {offer.partner_discount}</p>
                      </div>
                      <button
                        type="button"
                        disabled={redeemingId === offer.id || isSuspended}
                        onClick={() => handleRedeemOffer(offer)}
                        className="shrink-0 rounded-lg bg-teal-700 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
                      >
                        {redeemingId === offer.id
                          ? 'A processar...'
                          : isPaid
                          ? `MCX ${parseFloat(offer.price_aoa).toLocaleString('pt-AO')} Kz`
                          : 'Resgatar Voucher'}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}

      {!passport && (
        <button
          type="button"
          onClick={handleLogout}
          className="w-full py-2.5 rounded-xl border border-stone-300 bg-white text-xs font-semibold text-stone-700"
        >
          Terminar Sessão
        </button>
      )}
    </div>
  );
}
