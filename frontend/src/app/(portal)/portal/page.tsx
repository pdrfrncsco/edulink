'use client';

import React, { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { Button, Modal } from '@/components/ui';
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
const KEYCLOAK_ACCOUNT_URL =
  process.env.NEXT_PUBLIC_KEYCLOAK_ACCOUNT_URL ||
  'https://auth.edulink.ao/realms/edulink/account';

type PortalTab = 'card' | 'apps' | 'benefits' | 'account';
type PaymentChannel = 'MULTICAIXA_EXPRESS' | 'KWIK';

type ExtendedAuthUser = AuthUser & {
  school_primary_color?: string;
  school_logo_url?: string | null;
  institution_type?: 'MED_K12' | 'MESCTI_HIGHER_ED';
  enable_benefits_club?: boolean;
};

interface PassportData {
  fullName: string;
  role: string;
  institutionalEmail: string;
  schoolName: string;
  schoolDomain: string;
  schoolPrimaryColor: string;
  schoolLogoUrl?: string | null;
  institutionType: 'MED_K12' | 'MESCTI_HIGHER_ED';
  biNumber: string;
  gradeClass: string;
  academicYear: string;
  status: string;
  token: string;
  tokenExpiresAt: number | null;
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

class AuthSessionError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'AuthSessionError';
    this.status = status;
  }
}

function readCachedPassport(): PassportData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(OFFLINE_PASSPORT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PassportData>;
    if (!parsed.token || !parsed.verificationUrl || !parsed.fullName) return null;
    return parsed as PassportData;
  } catch {
    localStorage.removeItem(OFFLINE_PASSPORT_KEY);
    return null;
  }
}

function decodeJwtExp(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '='));
    const payload = JSON.parse(json) as { exp?: number };
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

async function copyTextSafely(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fallback abaixo para navegadores móveis sem permissão clipboard
  }
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

function isNetworkFailure(err: unknown): boolean {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
  if (err instanceof AuthSessionError) return false;
  return err instanceof TypeError;
}

export default function PortalStudentPage() {
  const [authUser, setAuthUser] = useState<ExtendedAuthUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [activeTab, setActiveTab] = useState<PortalTab>('card');

  const [passport, setPassport] = useState<PassportData | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [qrFullscreen, setQrFullscreen] = useState(false);
  const [isOfflineCache, setIsOfflineCache] = useState(false);
  const [error, setError] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [offers, setOffers] = useState<CatalogOffer[]>([]);
  const [benefitNotice, setBenefitNotice] = useState('');
  const [benefitError, setBenefitError] = useState('');
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [checkoutOffer, setCheckoutOffer] = useState<CatalogOffer | null>(null);
  const [payMethod, setPayMethod] = useState<PaymentChannel>('MULTICAIXA_EXPRESS');
  const [payPhone, setPayPhone] = useState('');

  const renderQrFromUrl = async (verifyUrl: string) => {
    try {
      const dataUrl = await QRCode.toDataURL(verifyUrl, {
        width: 280,
        margin: 1,
        color: { dark: '#1c1917', light: '#ffffff' },
      });
      setQrDataUrl(dataUrl);
    } catch {
      setQrDataUrl('');
    }
  };

  const loadBenefitCatalog = async () => {
    try {
      const res = await authFetch('/benefits/catalog/');
      if (!res.ok) return;
      const data = await res.json();
      setOffers(Array.isArray(data) ? data : data.results || []);
    } catch {
      // Offline: mantém catálogo vazio sem afetar o cartão
    }
  };

  const handleLogout = () => {
    clearAuthSession();
    if (typeof window !== 'undefined') {
      localStorage.removeItem(OFFLINE_PASSPORT_KEY);
    }
    setAuthUser(null);
    setPassport(null);
    setQrDataUrl('');
    setQrFullscreen(false);
    setIsOfflineCache(false);
    setError('');
  };

  const fetchRealPassport = async (user: ExtendedAuthUser) => {
    setError('');
    setIsOfflineCache(false);

    if (!user.academic_user) {
      setError('A sua conta não possui um registo académico (Estudante/Docente) associado.');
      return;
    }

    try {
      const issueRes = await authFetch('/passport/issue/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.academic_user.id }),
      });

      if (issueRes.status === 401 || issueRes.status === 403) {
        throw new AuthSessionError('A sua sessão ou matrícula foi revogada. Inicie sessão novamente.', issueRes.status);
      }

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
        schoolPrimaryColor: issueData.school_primary_color || user.school_primary_color || '#0D9488',
        schoolLogoUrl: issueData.school_logo_url ?? user.school_logo_url ?? null,
        institutionType: issueData.institution_type || user.institution_type || 'MED_K12',
        biNumber: user.academic_user.bi_or_student_id,
        gradeClass: user.academic_user.grade_class || 'Matrícula Ativa',
        academicYear: user.academic_user.academic_year || '2026/2027',
        status:
          user.academic_user.enrollment_status ||
          (user.academic_user.is_active ? 'ACTIVE' : 'SUSPENDED'),
        token: issueData.token,
        tokenExpiresAt: decodeJwtExp(issueData.token),
        verificationUrl: fullVerifyUrl,
      };

      setPassport(card);
      localStorage.setItem(OFFLINE_PASSPORT_KEY, JSON.stringify(card));
      await renderQrFromUrl(fullVerifyUrl);
      loadBenefitCatalog();
    } catch (err: any) {
      if (err instanceof AuthSessionError) {
        handleLogout();
        setError(err.message);
        return;
      }

      if (isNetworkFailure(err)) {
        const cachedCard = readCachedPassport();
        if (cachedCard) {
          setPassport(cachedCard);
          setIsOfflineCache(true);
          await renderQrFromUrl(cachedCard.verificationUrl);
          return;
        }
      }

      setError(err?.message || 'Erro ao emitir o Passaporte Académico.');
    }
  };

  const syncPortalSession = async () => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    const token = getAccessToken();
    const cachedUser = getStoredUser() as ExtendedAuthUser | null;
    if (!token) {
      setAuthReady(true);
      return;
    }

    if (cachedUser) setAuthUser(cachedUser);

    try {
      const meRes = await authFetch('/auth/me/');
      if (meRes.status === 401 || meRes.status === 403) {
        throw new AuthSessionError('Sessão expirada ou acesso suspenso.', meRes.status);
      }
      if (!meRes.ok) {
        throw new Error('Servidor temporariamente indisponível.');
      }

      const me = (await meRes.json()) as ExtendedAuthUser;
      setAuthUser(me);
      updateStoredUser(me);
      await fetchRealPassport(me);
    } catch (err: any) {
      if (err instanceof AuthSessionError) {
        // Segurança P0: 401/403 limpa sempre o cartão em cache e exige novo login
        handleLogout();
      } else if (isNetworkFailure(err)) {
        const cachedCard = readCachedPassport();
        if (cachedUser && cachedCard) {
          setPassport(cachedCard);
          setIsOfflineCache(true);
          await renderQrFromUrl(cachedCard.verificationUrl);
        } else {
          setError('Sem ligação à internet e sem cartão guardado neste dispositivo.');
        }
      } else {
        setError(err?.message || 'Não foi possível sincronizar a sua sessão.');
      }
    } finally {
      setAuthReady(true);
    }
  };

  useEffect(() => {
    syncPortalSession();
  }, []);

  const handleAuthenticated = async (user: AuthUser) => {
    const extended = user as ExtendedAuthUser;
    setAuthUser(extended);
    await fetchRealPassport(extended);
  };

  const handleCopy = async (key: string, value: string) => {
    const ok = await copyTextSafely(value);
    if (ok) {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

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
      setBenefitError('Indique o seu número de telemóvel associado ao Multicaixa Express ou KWiK.');
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
        `Referência ${payData.reference} gerada (${payMethod === 'KWIK' ? 'KWiK' : 'Multicaixa Express'} · ${parseFloat(checkoutOffer.price_aoa).toLocaleString('pt-AO')} Kz) para ${checkoutOffer.partner_name}.`
      );
      setCheckoutOffer(null);
    } catch (err: any) {
      setBenefitError(err.message || 'Falha ao iniciar pagamento.');
    } finally {
      setRedeemingId(null);
    }
  };

  const isTeacher = passport?.role === 'TEACHER';
  const isSuspended = passport?.status === 'SUSPENDED';
  const isCanvaFreeK12 = passport?.institutionType !== 'MESCTI_HIGHER_ED';
  const isTokenExpired = Boolean(passport?.tokenExpiresAt && Date.now() > passport.tokenExpiresAt);

  const cloudApps = useMemo(() => {
    if (!passport) return [];
    const email = encodeURIComponent(passport.institutionalEmail);
    return [
      {
        name: 'Webmail Institucional',
        subtitle: passport.institutionalEmail,
        href: `https://mail.google.com/a/${passport.schoolDomain}`,
        badge: 'E-mail Oficial',
        available: true,
      },
      {
        name: isTeacher ? 'Google Classroom (Docente)' : 'Google Classroom & Drive',
        subtitle: isTeacher ? 'Gerir turmas, tarefas e Google Docs' : 'Aulas, cadernos e armazenamento em nuvem',
        href: `https://classroom.google.com/u/0/?authuser=${email}`,
        badge: 'Google Workspace',
        available: true,
      },
      {
        name: isTeacher ? 'Microsoft 365 (Faculty)' : 'Microsoft 365 & Teams',
        subtitle: 'Word, Excel, PowerPoint Web, Teams e OneDrive',
        href: `https://www.office.com/?login_hint=${email}`,
        badge: 'Office 365 A1',
        available: true,
      },
      {
        name: isCanvaFreeK12 ? 'Canva para Educação' : 'Canva para Universidades',
        subtitle: isCanvaFreeK12
          ? isTeacher
            ? 'Gratuito para docentes K-12 via conta da escola'
            : 'Design educativo gratuito com conta da escola'
          : 'Disponível mediante plano Canva Campus da IES',
        href: 'https://www.canva.com/education/',
        badge: isCanvaFreeK12 ? '100% Gratuito (K-12)' : 'Ensino Superior',
        available: isCanvaFreeK12,
      },
    ];
  }, [passport, isTeacher, isCanvaFreeK12]);

  const globalPerks = useMemo(
    () =>
      isTeacher
        ? [
            {
              name: 'GitHub Global Campus (Docentes)',
              desc: 'Ferramentas gratuitas para ensino de programação e repositórios privados.',
              href: 'https://education.github.com/teachers',
            },
            {
              name: 'Figma for Education',
              desc: 'Plano Professional gratuito para salas de aula e projetos académicos.',
              href: 'https://www.figma.com/education/',
            },
            {
              name: 'JetBrains Educational Licenses',
              desc: 'IDEs profissionais gratuitas com o e-mail institucional.',
              href: 'https://www.jetbrains.com/community/education/',
            },
          ]
        : [
            {
              name: 'GitHub Student Developer Pack',
              desc: 'Créditos cloud, domínios e ferramentas de desenvolvimento gratuitas.',
              href: 'https://education.github.com/pack',
            },
            {
              name: 'Figma for Education',
              desc: 'Design UI/UX e FigJam gratuitos com verificação académica.',
              href: 'https://www.figma.com/education/',
            },
            {
              name: 'JetBrains & Spotify Estudante',
              desc: 'Use o seu e-mail institucional para solicitar elegibilidade académica.',
              href: 'https://www.jetbrains.com/community/education/',
            },
          ],
    [isTeacher]
  );

  if (!authReady) {
    return <p className="text-sm text-stone-500 py-12 text-center">A carregar Passaporte Digital...</p>;
  }

  if (!authUser) {
    return <AuthCard mode="academic" onAuthenticated={handleAuthenticated} />;
  }

  if (authUser.role === 'PLATFORM_ADMIN' || authUser.role === 'SCHOOL_SECRETARY') {
    return (
      <div className="w-full max-w-md bg-white border border-stone-200 rounded-2xl p-6 text-center space-y-4 shadow-sm">
        <span className="inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900">
          {authUser.role === 'PLATFORM_ADMIN' ? 'Administração da Plataforma' : 'Secretaria Escolar'}
        </span>
        <h1 className="text-lg font-bold text-stone-900">Acesso Administrativo</h1>
        <p className="text-sm text-stone-600">
          A conta <span className="font-mono">{authUser.email}</span> destina-se ao Painel Administrativo e não possui Passaporte de Estudante/Docente.
        </p>
        <div className="flex justify-center gap-3">
          <a href="/admin" className="px-4 py-2 rounded-xl bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800">
            Ir para Painel Administrativo
          </a>
          <button
            type="button"
            onClick={handleLogout}
            className="px-4 py-2 rounded-xl border border-stone-300 text-xs font-semibold text-stone-700 hover:bg-stone-50"
          >
            Sair
          </button>
        </div>
      </div>
    );
  }

  const cardBgStyle = isSuspended
    ? undefined
    : {
        background: `linear-gradient(135deg, ${passport?.schoolPrimaryColor || '#0D9488'} 0%, #111827 125%)`,
      };

  return (
    <div className="w-full max-w-md mx-auto pb-24 space-y-4">
      {/* Avisos de Estado */}
      {isOfflineCache && (
        <div role="status" className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 text-center font-medium">
          Modo offline ativo — a exibir o último cartão assinado neste dispositivo.
          {passport?.tokenExpiresAt && (
            <span className="block font-semibold">
              {isTokenExpired
                ? 'Atenção: o QR em cache expirou. Ligue-se à internet para renovar.'
                : `Válido até ${new Date(passport.tokenExpiresAt).toLocaleString('pt-AO')}.`}
            </span>
          )}
        </div>
      )}

      {error && (
        <div role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 font-semibold flex items-center justify-between gap-2">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => syncPortalSession()}
            className="shrink-0 underline font-bold"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* TAB 1: CARTÃO DIGITAL */}
      {passport && activeTab === 'card' && (
        <div className="space-y-4">
          <div
            style={cardBgStyle}
            className={`text-white rounded-3xl p-6 shadow-xl relative overflow-hidden border ${
              isSuspended
                ? 'bg-gradient-to-br from-stone-800 to-red-950 border-red-800/60'
                : 'border-white/15'
            }`}
          >
            <div className="flex items-center justify-between gap-2 border-b border-white/15 pb-4">
              <div className="flex items-center gap-2.5 min-w-0">
                {passport.schoolLogoUrl && (
                  <img
                    src={passport.schoolLogoUrl}
                    alt={`Logótipo ${passport.schoolName}`}
                    className="w-9 h-9 rounded-xl bg-white object-contain p-1 shrink-0"
                  />
                )}
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-white/80 block">
                    Passaporte Académico Digital
                  </span>
                  <h1 className="text-sm font-bold text-white truncate">{passport.schoolName}</h1>
                </div>
              </div>

              <span
                className={`shrink-0 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                  isSuspended
                    ? 'bg-red-500/20 text-red-100 border-red-300/40'
                    : 'bg-emerald-400/20 text-emerald-100 border-emerald-300/40'
                }`}
              >
                {isSuspended ? 'SUSPENSO' : 'ATIVO'}
              </span>
            </div>

            <div className="py-5 space-y-3">
              <div>
                <span className="text-[10px] uppercase font-semibold text-white/75 block">
                  {isTeacher ? 'Docente Verificado' : 'Estudante Verificado'}
                </span>
                <span className="text-lg font-extrabold tracking-tight text-white block">{passport.fullName}</span>
                <button
                  type="button"
                  onClick={() => handleCopy('email', passport.institutionalEmail)}
                  className="text-xs text-white/90 font-mono hover:underline text-left"
                  title="Toque para copiar o e-mail institucional"
                >
                  {passport.institutionalEmail} {copiedKey === 'email' ? '· Copiado!' : ''}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                <div>
                  <span className="text-[10px] uppercase text-white/75 block">N.º de BI / Processo</span>
                  <span className="font-semibold text-white font-mono">{passport.biNumber}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-white/75 block">Ano Lectivo</span>
                  <span className="font-semibold text-white">{passport.academicYear}</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase text-white/75 block">
                  {isTeacher ? 'Departamento / Disciplina' : 'Turma / Curso'}
                </span>
                <span className="text-xs font-semibold text-white">{passport.gradeClass}</span>
              </div>
            </div>

            <div className="mt-1 bg-white text-stone-900 rounded-2xl p-4 flex flex-col items-center justify-center space-y-2 shadow-inner">
              {qrDataUrl ? (
                <button
                  type="button"
                  onClick={() => setQrFullscreen(true)}
                  className="focus:outline-none group"
                  aria-label="Ampliar QR Code em ecrã inteiro"
                >
                  <img
                    src={qrDataUrl}
                    alt={`QR Code de verificação académica de ${passport.fullName}`}
                    width={160}
                    height={160}
                    className="rounded-lg group-hover:scale-[1.02] transition"
                  />
                  <span className="block text-[10px] font-semibold text-teal-800 mt-1">
                    Toque no QR para ampliar
                  </span>
                </button>
              ) : (
                <div className="w-36 h-36 bg-stone-100 rounded-xl flex items-center justify-center text-xs text-stone-500">
                  A gerar QR Code...
                </div>
              )}
              <span className="text-[10px] text-stone-500 font-medium text-center">
                Assinado via JWT · Apresente na portaria ou estabelecimentos parceiros
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <a
              href={`/verify?token=${encodeURIComponent(passport.token)}`}
              className="py-2.5 px-3 rounded-xl bg-white border border-stone-300 text-stone-800 text-xs font-semibold text-center hover:bg-stone-50 transition shadow-sm"
            >
              Validar Cartão
            </a>
            <button
              type="button"
              onClick={() => handleCopy('verify-link', passport.verificationUrl)}
              className="py-2.5 px-4 rounded-xl bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800 transition shadow-sm"
            >
              {copiedKey === 'verify-link' ? 'Link Copiado!' : 'Partilhar Link'}
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: APPS & E-MAIL (CORE DO MVP) */}
      {passport && activeTab === 'apps' && (
        <div className="space-y-4">
          <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-stone-900">O Seu E-mail Institucional</h2>
                <p className="text-xs font-mono text-teal-800 break-all">{passport.institutionalEmail}</p>
              </div>
              <button
                type="button"
                onClick={() => handleCopy('app-email', passport.institutionalEmail)}
                className="shrink-0 rounded-xl border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50"
              >
                {copiedKey === 'app-email' ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
            {isSuspended && (
              <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl p-2.5 font-medium">
                A sua matrícula está suspensa. Contacte a secretaria de {passport.schoolName} para reativar os acessos em nuvem.
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-700">
              Ferramentas da Escola (Login Único)
            </h2>
            <div className="space-y-2.5">
              {cloudApps.map((app) => (
                <a
                  key={app.name}
                  href={isSuspended ? undefined : app.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-disabled={isSuspended}
                  className={`block rounded-xl border p-3.5 transition ${
                    isSuspended
                      ? 'border-stone-200 bg-stone-50 opacity-50 pointer-events-none'
                      : 'border-stone-200 hover:border-teal-500 hover:bg-teal-50/30'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-stone-900">{app.name}</span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        app.available
                          ? 'bg-teal-50 text-teal-800 border border-teal-200'
                          : 'bg-stone-100 text-stone-600'
                      }`}
                    >
                      {app.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-600 mt-1">{app.subtitle}</p>
                </a>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-700">
              Benefícios Globais com o Domínio .{passport.schoolDomain.split('.').slice(-2).join('.')}
            </h2>
            <ul className="space-y-2">
              {globalPerks.map((perk) => (
                <li key={perk.name} className="rounded-xl border border-stone-200 p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-stone-900">{perk.name}</p>
                    <p className="text-[11px] text-stone-600">{perk.desc}</p>
                  </div>
                  <a
                    href={perk.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 rounded-lg border border-teal-700 px-2.5 py-1.5 text-[11px] font-semibold text-teal-800 hover:bg-teal-50"
                  >
                    Ativar
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}

      {/* TAB 3: CLUBE DE BENEFÍCIOS LOCAL */}
      {passport && activeTab === 'benefits' && (
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
            <div role="status" className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 font-medium">
              {benefitNotice}
            </div>
          )}
          {benefitError && (
            <div role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 font-medium">
              {benefitError}
            </div>
          )}

          {checkoutOffer && (
            <form onSubmit={handlePaidCheckout} className="rounded-xl border border-teal-300 bg-teal-50/50 p-3.5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-stone-900">{checkoutOffer.partner_name} — {checkoutOffer.title}</p>
                  <p className="text-[11px] text-stone-600">
                    Total: {parseFloat(checkoutOffer.price_aoa).toLocaleString('pt-AO')} Kz
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCheckoutOffer(null)}
                  className="text-xs font-semibold text-stone-500 hover:text-stone-800"
                >
                  Fechar
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <select
                  aria-label="Canal de pagamento"
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as PaymentChannel)}
                  className="rounded-lg border border-stone-300 bg-white px-2.5 py-2 text-xs"
                >
                  <option value="MULTICAIXA_EXPRESS">Multicaixa Express</option>
                  <option value="KWIK">KWiK Instantâneo</option>
                </select>
                <input
                  type="tel"
                  required
                  aria-label="Número de telemóvel para pagamento"
                  placeholder="+244 923 000 000"
                  value={payPhone}
                  onChange={(e) => setPayPhone(e.target.value)}
                  className="rounded-lg border border-stone-300 bg-white px-2.5 py-2 text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={redeemingId === checkoutOffer.id}
                className="w-full rounded-xl bg-teal-700 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
              >
                {redeemingId === checkoutOffer.id ? 'A gerar referência...' : 'Gerar Referência de Pagamento'}
              </button>
            </form>
          )}

          {offers.length === 0 ? (
            <div className="rounded-xl bg-stone-50 border border-stone-200 p-4 text-center space-y-2">
              <p className="text-xs font-semibold text-stone-800">
                Novos parceiros locais em ativação na sua província
              </p>
              <p className="text-[11px] text-stone-600">
                Entretanto, já pode aceder gratuitamente às ferramentas globais (Google, Microsoft, Canva, GitHub) no separador <strong>Apps</strong> ou apresentar o seu QR Code em estabelecimentos parceiros.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('apps')}
                className="mt-1 inline-block rounded-xl bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800"
              >
                Ver Apps &amp; Benefícios Globais
              </button>
            </div>
          ) : (
            <ul className="space-y-2">
              {offers.map((offer) => {
                const isPaid = parseFloat(offer.price_aoa || '0') > 0;
                return (
                  <li key={offer.id} className="rounded-xl border border-stone-200 p-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-stone-900 truncate">{offer.partner_name}</p>
                      <p className="text-[11px] text-stone-600 truncate">
                        {offer.title} · {offer.partner_discount}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={redeemingId === offer.id || isSuspended}
                      onClick={() => (isPaid ? setCheckoutOffer(offer) : handleRedeemFreeOffer(offer))}
                      className="shrink-0 rounded-lg bg-teal-700 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
                    >
                      {redeemingId === offer.id
                        ? 'A processar...'
                        : isPaid
                        ? `${parseFloat(offer.price_aoa).toLocaleString('pt-AO')} Kz`
                        : 'Resgatar'}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {/* TAB 4: CONTA & SEGURANÇA */}
      {activeTab === 'account' && (
        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm space-y-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700">
              {isTeacher ? 'Conta Docente' : 'Conta Estudantil'}
            </span>
            <h2 className="text-base font-bold text-stone-900">{passport?.fullName || authUser.email}</h2>
            <p className="text-xs font-mono text-stone-600">{passport?.institutionalEmail || authUser.email}</p>
          </div>

          {passport && (
            <dl className="grid grid-cols-2 gap-3 text-xs border-y border-stone-100 py-3">
              <div>
                <dt className="text-[10px] uppercase text-stone-500">Instituição</dt>
                <dd className="font-semibold text-stone-900">{passport.schoolName}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase text-stone-500">Estado da Matrícula</dt>
                <dd className={`font-bold ${isSuspended ? 'text-red-700' : 'text-emerald-700'}`}>
                  {isSuspended ? 'Suspensa' : 'Ativa'}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase text-stone-500">BI / Processo</dt>
                <dd className="font-mono font-semibold text-stone-900">{passport.biNumber}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase text-stone-500">Turma / Área</dt>
                <dd className="font-semibold text-stone-900">{passport.gradeClass}</dd>
              </div>
            </dl>
          )}

          <div className="space-y-2">
            <a
              href={KEYCLOAK_ACCOUNT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-2.5 px-4 rounded-xl bg-stone-900 text-white text-xs font-semibold text-center hover:bg-stone-800"
            >
              Alterar Palavra-passe Única (SSO)
            </a>
            <button
              type="button"
              onClick={() => syncPortalSession()}
              className="w-full py-2.5 px-4 rounded-xl border border-stone-300 bg-white text-stone-700 text-xs font-semibold hover:bg-stone-50"
            >
              Atualizar Cartão e Sincronizar
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full py-2.5 px-4 rounded-xl border border-red-200 bg-red-50 text-red-800 text-xs font-semibold hover:bg-red-100"
            >
              Terminar Sessão
            </button>
          </div>
        </section>
      )}

      {/* MODAL QR EM ECRÃ INTEIRO (ALTO CONTRASTE) */}
      <Modal
        open={Boolean(qrFullscreen && passport && qrDataUrl)}
        onClose={() => setQrFullscreen(false)}
        eyebrow={passport?.schoolName}
        title={passport?.fullName || 'QR Code do Passaporte Académico'}
        description={passport ? `BI / Processo: ${passport.biNumber}` : undefined}
        size="sm"
      >
        {passport && qrDataUrl && (
          <div className="text-center space-y-4">
            <img
              src={qrDataUrl}
              alt={`QR Code ampliado de ${passport.fullName}`}
              className="w-60 h-60 mx-auto rounded-xl border border-stone-200 p-2 bg-white"
            />
            <Button
              type="button"
              variant="secondary"
              fullWidth
              onClick={() => setQrFullscreen(false)}
            >
              Fechar
            </Button>
          </div>
        )}
      </Modal>

      {/* BOTTOM TAB BAR MOBILE-FIRST */}
      <nav
        aria-label="Navegação principal do portal"
        className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-stone-200"
      >
        <div className="max-w-md mx-auto grid grid-cols-4">
          {[
            { id: 'card' as PortalTab, label: 'Cartão' },
            { id: 'apps' as PortalTab, label: 'Apps' },
            { id: 'benefits' as PortalTab, label: 'Benefícios' },
            { id: 'account' as PortalTab, label: 'Conta' },
          ].map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 text-xs font-semibold border-t-2 transition ${
                  active
                    ? 'border-teal-700 text-teal-800 bg-teal-50/40'
                    : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}