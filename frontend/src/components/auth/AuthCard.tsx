'use client';

import React, { useState } from 'react';
import { AlertBanner, Button, Card, FormField, Input, StatusBadge } from '@/components/ui';
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
    <Card padding="lg" className="w-full max-w-md mx-auto space-y-6">
      <div className="space-y-1.5 border-b border-stone-100 pb-4">
        <StatusBadge tone="brand">
          {mode === 'secretary' ? 'Portal da Secretaria • Acesso Restrito' : 'Passaporte Académico • PWA'}
        </StatusBadge>
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

      {error && <AlertBanner tone="error">{error}</AlertBanner>}

      <form onSubmit={handleSubmit} className="space-y-4">
        {view === 'register' && mode === 'secretary' && (
          <FormField id="auth-fullname" label="Nome Completo" required>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                name="fullname"
                type="text"
                required
                invalid={invalid}
                aria-describedby={describedBy}
                autoComplete="name"
                enterKeyHint="next"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            )}
          </FormField>
        )}

        <FormField
          id="auth-email"
          label={mode === 'academic' ? 'E-mail Institucional (.edu.ao)' : 'E-mail'}
          required
        >
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              name="email"
              type="email"
              required
              invalid={invalid}
              aria-describedby={describedBy}
              autoComplete="username"
              spellCheck={false}
              enterKeyHint="next"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          )}
        </FormField>

        {view === 'register' && mode === 'academic' && (
          <FormField id="auth-bi" label="N.º de BI ou Processo de Matrícula" required>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                name="bi_or_student_id"
                type="text"
                required
                mono
                invalid={invalid}
                aria-describedby={describedBy}
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                enterKeyHint="next"
                value={biOrId}
                onChange={(e) => setBiOrId(e.target.value)}
              />
            )}
          </FormField>
        )}

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label htmlFor="auth-password" className="block text-xs font-semibold uppercase text-stone-700">
              Palavra-passe <span aria-hidden="true" className="text-red-600">*</span>
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
          {view === 'register' && (
            <p id="auth-password-hint" className="text-xs text-stone-500">
              Mínimo de 8 caracteres.
            </p>
          )}
          <Input
            id="auth-password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            required
            minLength={view === 'register' ? 8 : undefined}
            aria-describedby={view === 'register' ? 'auth-password-hint' : undefined}
            autoComplete={view === 'login' ? 'current-password' : 'new-password'}
            enterKeyHint="done"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <Button type="submit" size="lg" fullWidth loading={loading}>
          {loading
            ? 'A processar...'
            : view === 'login'
            ? 'Entrar'
            : mode === 'secretary'
            ? 'Criar Conta da Secretaria'
            : 'Ativar Conta e Entrar'}
        </Button>
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
    </Card>
  );
}
