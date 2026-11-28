'use client';

import React, { useState } from 'react';
import { Check, Copy, ExternalLink, Maximize2 } from 'lucide-react';
import { CopyButton, StatusBadge, cn } from '@/components/ui';
import { copyTextSafely, type PassportData } from './types';

interface PassportCardProps {
  passport: PassportData;
  qrDataUrl: string;
  isTeacher: boolean;
  isSuspended: boolean;
  onOpenQrFullscreen: () => void;
}

/** Mobile-first verifiable Digital Academic Passport card with dynamic school branding. */
export default function PassportCard({
  passport,
  qrDataUrl,
  isTeacher,
  isSuspended,
  onOpenQrFullscreen,
}: PassportCardProps) {
  const [emailCopied, setEmailCopied] = useState(false);

  const handleCopyEmail = async () => {
    const ok = await copyTextSafely(passport.institutionalEmail);
    if (ok) {
      setEmailCopied(true);
      setTimeout(() => setEmailCopied(false), 2000);
    }
  };

  // Overlay a subtle dark scrim over dynamic school colors so white text always keeps WCAG AA contrast.
  const cardBgStyle = isSuspended
    ? undefined
    : {
        background: `linear-gradient(145deg, rgba(17, 24, 39, 0.35) 0%, rgba(17, 24, 39, 0.85) 100%), ${passport.schoolPrimaryColor || '#0D9488'}`,
      };

  return (
    <div className="space-y-4">
      <div
        style={cardBgStyle}
        className={cn(
          'text-white rounded-3xl p-6 shadow-xl relative overflow-hidden border',
          isSuspended
            ? 'bg-gradient-to-br from-stone-800 to-red-950 border-red-800/60'
            : 'border-white/15'
        )}
      >
        <div className="flex items-center justify-between gap-2 border-b border-white/15 pb-4">
          <div className="flex items-center gap-2.5 min-w-0">
            {passport.schoolLogoUrl && (
              <img
                src={passport.schoolLogoUrl}
                alt={`Logótipo de ${passport.schoolName}`}
                className="w-9 h-9 rounded-xl bg-white object-contain p-1 shrink-0"
              />
            )}
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold tracking-wider text-white/85 block">
                Passaporte Académico Digital
              </span>
              <h1 className="text-sm font-bold text-white truncate">{passport.schoolName}</h1>
            </div>
          </div>

          <StatusBadge
            tone={isSuspended ? 'error' : 'success'}
            size="sm"
            className={cn(
              'shrink-0 text-[10px]',
              isSuspended
                ? 'bg-red-500/25 text-red-100 border-red-300/40'
                : 'bg-emerald-400/20 text-emerald-100 border-emerald-300/40'
            )}
          >
            {isSuspended ? 'SUSPENSO' : 'ATIVO'}
          </StatusBadge>
        </div>

        <div className="py-5 space-y-3">
          <div>
            <span className="text-[10px] uppercase font-semibold text-white/80 block">
              {isTeacher ? 'Docente Verificado' : 'Estudante Verificado'}
            </span>
            <span className="text-lg font-extrabold tracking-tight text-white block">
              {passport.fullName}
            </span>
            <button
              type="button"
              onClick={handleCopyEmail}
              aria-label={`Copiar e-mail institucional ${passport.institutionalEmail}`}
              className="mt-0.5 inline-flex items-center gap-1.5 min-h-[32px] text-xs text-white/95 font-mono hover:underline text-left break-all"
            >
              <span>{passport.institutionalEmail}</span>
              {emailCopied ? (
                <Check className="h-3.5 w-3.5 text-emerald-300 shrink-0" aria-hidden="true" />
              ) : (
                <Copy className="h-3 w-3 text-white/75 shrink-0" aria-hidden="true" />
              )}
              <span className="sr-only" aria-live="polite">
                {emailCopied ? 'E-mail copiado para a área de transferência.' : ''}
              </span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
            <div>
              <span className="text-[10px] uppercase text-white/80 block">N.º de BI / Processo</span>
              <span className="font-semibold text-white font-mono">{passport.biNumber}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase text-white/80 block">Ano Lectivo</span>
              <span className="font-semibold text-white">{passport.academicYear}</span>
            </div>
          </div>

          <div>
            <span className="text-[10px] uppercase text-white/80 block">
              {isTeacher ? 'Departamento / Disciplina' : 'Turma / Curso'}
            </span>
            <span className="text-xs font-semibold text-white">{passport.gradeClass}</span>
          </div>
        </div>

        <div className="mt-1 bg-white text-stone-900 rounded-2xl p-4 flex flex-col items-center justify-center space-y-2 shadow-inner">
          {qrDataUrl ? (
            <button
              type="button"
              onClick={onOpenQrFullscreen}
              className="group rounded-xl p-1 focus-visible:outline-2 focus-visible:outline-teal-700"
              aria-label="Ampliar QR Code em ecrã inteiro"
            >
              <img
                src={qrDataUrl}
                alt={`QR Code de verificação académica de ${passport.fullName}`}
                width={160}
                height={160}
                className="rounded-lg group-hover:scale-[1.02] transition"
              />
              <span className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-teal-800">
                <Maximize2 className="h-3 w-3" aria-hidden="true" />
                Toque no QR para ampliar
              </span>
            </button>
          ) : (
            <div className="w-40 h-40 bg-stone-100 rounded-xl flex items-center justify-center text-xs text-stone-500">
              A gerar QR Code...
            </div>
          )}
          <span className="text-[10px] text-stone-600 font-medium text-center">
            Assinado via JWT · Apresente na portaria ou estabelecimentos parceiros
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <a
          href={`/verify?token=${encodeURIComponent(passport.token)}`}
          className="min-h-[44px] inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-white border border-stone-300 text-stone-800 text-xs font-semibold text-center hover:bg-stone-50 transition shadow-sm"
        >
          <span>Validar Cartão</span>
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
        <CopyButton
          value={passport.verificationUrl}
          label="Partilhar Link"
          copiedLabel="Link Copiado!"
          variant="primary"
          size="lg"
          className="w-full"
        />
      </div>
    </div>
  );
}
