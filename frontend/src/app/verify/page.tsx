'use client';

import React, { useEffect, useState, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

interface VerifyResult {
  is_valid: boolean;
  network_error?: boolean;
  student_info?: {
    full_name: string;
    role: string;
    institutional_email: string;
    bi_or_student_id: string;
    school_name: string;
    school_domain: string;
    school_primary_color?: string;
    school_logo_url?: string | null;
    institution_type?: 'MED_K12' | 'MESCTI_HIGHER_ED';
    apd_notified?: boolean;
    apd_dossier_number?: string;
    academic_year: string;
    grade_class: string;
    status: string;
    verified_at: number;
  };
  error?: string;
}

function VerifyContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<VerifyResult | null>(null);

  const checkToken = useCallback(async () => {
    if (!token) {
      setLoading(false);
      setResult({
        is_valid: false,
        error: 'Nenhum token de verificação foi fornecido na leitura do QR Code.',
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/passport/verify/?token=${encodeURIComponent(token)}`);
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({
        is_valid: false,
        network_error: true,
        error: 'Não foi possível contactar o servidor de verificação EduLink. Verifique a ligação à internet e tente novamente.',
      });
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    checkToken();
  }, [checkToken]);

  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-stone-200 rounded-3xl p-6 sm:p-8 shadow-md space-y-6">
        <div className="flex items-center justify-between border-b border-stone-100 pb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-teal-700 text-white font-bold flex items-center justify-center text-sm shadow">
              E
            </div>
            <div>
              <h1 className="font-bold text-stone-900 text-sm leading-tight">EduLink Verificador</h1>
              <span className="text-[11px] text-stone-500">Validador de Identidade Académica</span>
            </div>
          </div>
          <span className="text-xs font-mono text-stone-400">Angola</span>
        </div>

        {loading ? (
          <div className="py-12 text-center space-y-3" role="status" aria-live="polite">
            <div className="w-10 h-10 border-4 border-teal-700 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs text-stone-500 font-medium">Validando assinatura criptográfica e matrícula...</p>
          </div>
        ) : result?.is_valid ? (
          <div className="space-y-5">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-lg flex-shrink-0">
                ✓
              </div>
              <div>
                <h2 className="text-sm font-bold text-emerald-950">Vínculo Académico Confirmado</h2>
                <p className="text-xs text-emerald-700">Matrícula ativa no ano lectivo {result.student_info?.academic_year}.</p>
              </div>
            </div>

            <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 space-y-3 text-xs">
              <div className="flex items-center gap-3 pb-2 border-b border-stone-200/80">
                {result.student_info?.school_logo_url ? (
                  <img
                    src={result.student_info.school_logo_url}
                    alt={`Logótipo de ${result.student_info.school_name}`}
                    className="w-10 h-10 rounded-xl bg-white border border-stone-200 object-contain p-1 shrink-0"
                  />
                ) : (
                  <div
                    className="w-10 h-10 rounded-xl text-white font-bold flex items-center justify-center text-sm shrink-0 shadow-sm"
                    style={{ backgroundColor: result.student_info?.school_primary_color || '#0f766e' }}
                  >
                    {(result.student_info?.school_name || 'E').slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <span className="font-bold text-stone-900 block truncate">
                    {result.student_info?.school_name}
                  </span>
                  <span className="text-[11px] font-mono text-stone-500 block truncate">
                    {result.student_info?.school_domain}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-stone-400 block">Titular</span>
                <span className="text-base font-bold text-stone-900 block">{result.student_info?.full_name}</span>
                <span className="font-mono text-teal-700 block">{result.student_info?.institutional_email}</span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-[10px] uppercase font-bold text-stone-400 block">Tutela</span>
                  <span className="font-semibold text-stone-800">
                    {result.student_info?.institution_type === 'MESCTI_HIGHER_ED'
                      ? 'Ensino Superior (MESCTI)'
                      : 'Ensino Geral / Técnico (MED)'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-stone-400 block">Papel</span>
                  <span className="font-semibold text-stone-800">
                    {result.student_info?.role === 'TEACHER' ? 'Professor / Docente' : 'Estudante'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-[10px] uppercase font-bold text-stone-400 block">N.º Identificação</span>
                  <span className="font-mono font-semibold text-stone-800">{result.student_info?.bi_or_student_id}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-stone-400 block">Classe / Turma</span>
                  <span className="font-semibold text-stone-800">{result.student_info?.grade_class}</span>
                </div>
              </div>

              {result.student_info?.apd_notified && (
                <div className="pt-1">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                    ✓ Conformidade APD {result.student_info.apd_dossier_number ? `· ${result.student_info.apd_dossier_number}` : 'Verificada'}
                  </span>
                </div>
              )}
            </div>

            <p className="text-[11px] text-stone-400 text-center">
              Autenticado em tempo real pelos servidores EduLink ao abrigo da Lei n.º 22/11.
            </p>
          </div>
        ) : (
          <div className="space-y-4" role="alert">
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-lg flex-shrink-0">
                ✕
              </div>
              <div>
                <h2 className="text-sm font-bold text-red-950">
                  {result?.network_error ? 'Erro de Ligação ao Servidor' : 'Validação Não Aprovada'}
                </h2>
                <p className="text-xs text-red-700">{result?.error || 'Cartão digital não reconhecido.'}</p>
              </div>
            </div>
            {result?.network_error ? (
              <button
                type="button"
                onClick={checkToken}
                className="w-full py-2.5 px-4 rounded-xl bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800 transition"
              >
                Tentar Novamente
              </button>
            ) : (
              <p className="text-xs text-stone-500 text-center">
                Se é estudante ou professor, dirija-se à secretaria da sua instituição de ensino para regularizar a sua situação.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-stone-500">A carregar validador...</div>}>
      <VerifyContent />
    </Suspense>
  );
}
