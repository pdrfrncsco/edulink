'use client';

import React, { useState } from 'react';
import { API_BASE, AuthUser, saveAuthSession } from '@/lib/auth';

interface AuthCardProps {
  mode: 'secretary' | 'academic';
  onAuthenticated: (user: AuthUser) => void;
}

export default function AuthCard({ mode, onAuthenticated }: AuthCardProps) {
  const [view, setView] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [biOrId, setBiOrId] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let endpoint = '/auth/login/';
      let body: Record<string, string> = { email, password };

      if (view === 'register') {
        if (mode === 'secretary') {
          endpoint = '/auth/register-secretary/';
          body = { full_name: fullName, email, password };
        } else {
          endpoint = '/auth/activate-academic/';
          body = { institutional_email: email, bi_or_student_id: biOrId, password };
        }
      }

      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg =
          data.detail ||
          (typeof data === 'object' ? Object.values(data).flat().join(' ') : null) ||
          'Falha na autenticação.';
        throw new Error(String(msg));
      }

      saveAuthSession(data);
      onAuthenticated(data.user);
    } catch (err: any) {
      setError(err.message || 'Não foi possível autenticar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
      <div className="space-y-1.5 border-b border-stone-100 pb-4">
        <span className="inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800">
          {mode === 'secretary' ? 'Portal da Secretaria • Acesso Restrito' : 'Passaporte Académico • PWA'}
        </span>
        <h1 className="text-xl font-bold text-stone-900">
          {view === 'login'
            ? mode === 'secretary'
              ? 'Entrar na Secretaria Escolar'
              : 'Aceder ao Cartão Digital'
            : mode === 'secretary'
            ? 'Criar Conta da Secretaria'
            : 'Ativar Conta Institucional (.edu.ao)'}
        </h1>
        <p className="text-xs text-stone-500">
          {view === 'login'
            ? 'Autentique-se com as suas credenciais para aceder aos dados isolados da sua instituição.'
            : mode === 'secretary'
            ? 'Crie a conta do responsável pela escola para iniciar o onboarding .edu.ao.'
            : 'Informe o e-mail .edu.ao gerado pela escola e o seu BI/Processo para definir a palavra-passe.'}
        </p>
      </div>

      {error && (
        <div role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 font-semibold">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {view === 'register' && mode === 'secretary' && (
          <div>
            <label htmlFor="auth-fullname" className="block text-xs font-semibold uppercase text-stone-700 mb-1">
              Nome Completo <span aria-hidden="true">*</span>
            </label>
            <input
              id="auth-fullname"
              name="fullname"
              type="text"
              required
              autoComplete="name"
              enterKeyHint="next"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="edulink-input w-full px-3.5 py-2 rounded-xl border border-stone-300 text-sm"
            />
          </div>
        )}

        <div>
          <label htmlFor="auth-email" className="block text-xs font-semibold uppercase text-stone-700 mb-1">
            {mode === 'academic' ? 'E-mail Institucional (.edu.ao)' : 'E-mail'} <span aria-hidden="true">*</span>
          </label>
          <input
            id="auth-email"
            name="email"
            type="email"
            required
            autoComplete="username"
            spellCheck={false}
            enterKeyHint="next"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="edulink-input w-full px-3.5 py-2 rounded-xl border border-stone-300 text-sm"
          />
        </div>

        {view === 'register' && mode === 'academic' && (
          <div>
            <label htmlFor="auth-bi" className="block text-xs font-semibold uppercase text-stone-700 mb-1">
              N.º de BI ou Processo de Matrícula <span aria-hidden="true">*</span>
            </label>
            <input
              id="auth-bi"
              name="bi_or_student_id"
              type="text"
              required
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              enterKeyHint="next"
              value={biOrId}
              onChange={(e) => setBiOrId(e.target.value)}
              className="edulink-input w-full px-3.5 py-2 rounded-xl border border-stone-300 text-sm font-mono"
            />
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="auth-password" className="block text-xs font-semibold uppercase text-stone-700">
              Palavra-passe <span aria-hidden="true">*</span>
            </label>
            <button
              type="button"
              aria-pressed={showPassword}
              onClick={() => setShowPassword((prev) => !prev)}
              className="text-xs font-semibold text-teal-700 hover:text-teal-800"
            >
              {showPassword ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
          <input
            id="auth-password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            required
            minLength={view === 'register' ? 8 : undefined}
            autoComplete={view === 'login' ? 'current-password' : 'new-password'}
            enterKeyHint="done"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="edulink-input w-full px-3.5 py-2 rounded-xl border border-stone-300 text-sm"
          />
          {view === 'register' && (
            <span className="block text-[11px] text-stone-500 mt-1">Mínimo de 8 caracteres.</span>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-teal-700 text-white font-semibold text-sm hover:bg-teal-800 disabled:opacity-50 transition shadow-sm"
        >
          {loading
            ? 'A processar...'
            : view === 'login'
            ? 'Entrar'
            : mode === 'secretary'
            ? 'Criar Conta da Secretaria'
            : 'Ativar Conta e Entrar'}
        </button>
      </form>

      <div className="border-t border-stone-100 pt-4 text-center text-xs text-stone-600">
        {view === 'login' ? (
          <button
            type="button"
            onClick={() => {
              setError('');
              setView('register');
            }}
            className="font-semibold text-teal-700 hover:underline"
          >
            {mode === 'secretary'
              ? 'Primeira vez? Criar conta de Secretaria Escolar'
              : 'Primeiro acesso? Ativar conta .edu.ao com o seu BI/Processo'}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setError('');
              setView('login');
            }}
            className="font-semibold text-teal-700 hover:underline"
          >
            Já tem palavra-passe? Voltar para Entrar
          </button>
        )}
      </div>
    </div>
  );
}
