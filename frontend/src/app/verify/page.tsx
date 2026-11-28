'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui';
import VerificationErrorCard from '@/components/verify/VerificationErrorCard';
import VerifiedIdentityCard, {
  type VerifiedStudentInfo,
} from '@/components/verify/VerifiedIdentityCard';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

interface VerifyResult {
  is_valid: boolean;
  network_error?: boolean;
  student_info?: VerifiedStudentInfo;
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
        error:
          'Não foi possível contactar o servidor de verificação EduLink. Verifique a ligação à internet e tente novamente.',
      });
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    checkToken();
  }, [checkToken]);

  return (
    <main className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
      <Card padding="lg" className="w-full max-w-md rounded-3xl shadow-md space-y-6">
        <div className="flex items-center justify-between border-b border-stone-100 pb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-teal-700 text-white font-bold flex items-center justify-center text-sm shadow">
              E
            </div>
            <div>
              <h1 className="font-bold text-stone-900 text-sm leading-tight">
                EduLink Verificador
              </h1>
              <span className="text-[11px] text-stone-500">
                Validador de Identidade Académica
              </span>
            </div>
          </div>
          <span className="text-xs font-mono text-stone-500">Angola</span>
        </div>

        {loading ? (
          <div className="py-12 text-center space-y-3" role="status" aria-live="polite">
            <div
              className="w-10 h-10 border-4 border-teal-700 border-t-transparent rounded-full animate-spin mx-auto"
              aria-hidden="true"
            />
            <p className="text-xs text-stone-500 font-medium">
              Validando assinatura criptográfica e matrícula...
            </p>
          </div>
        ) : result?.is_valid && result.student_info ? (
          <VerifiedIdentityCard studentInfo={result.student_info} />
        ) : (
          <VerificationErrorCard
            networkError={result?.network_error}
            error={result?.error}
            onRetry={checkToken}
          />
        )}
      </Card>
    </main>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs text-stone-500">A carregar validador...</div>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}
