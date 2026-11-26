'use client';

import React, { useState } from 'react';
import { apiJson, FeedbackState } from './types';

interface OnboardingTabProps {
  onSchoolCreated: (schoolId: string) => void;
  onFeedback: (fb: FeedbackState | null) => void;
}

export default function OnboardingTab({ onSchoolCreated, onFeedback }: OnboardingTabProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: 'Colégio Esperança de Luanda',
    nif: '5412345678',
    alvara_med_mescti: 'Alvará MED n.º 432/2024',
    domain: 'colegio-esperanca.edu.ao',
    contact_email: 'secretaria@colegio-esperanca.edu.ao',
    phone: '+244 923 000 111',
    province: 'Luanda',
    municipality: 'Talatona',
    address: 'Via AL14, Bairro Camama, Talatona',
    about_text:
      'Instituição de ensino primário e secundário de referência focada na excelência académica e literacia digital.',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    onFeedback(null);

    try {
      const data = await apiJson('/tenants/onboard/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      onFeedback({
        type: 'success',
        message: `Escola ${formData.name} cadastrada com sucesso!`,
        details: data,
      });
      if (data.school_id) {
        onSchoolCreated(data.school_id);
      }
    } catch (err: any) {
      onFeedback({
        type: 'error',
        message: err.message || 'Erro ao submeter cadastro da escola.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      aria-labelledby="onboarding-form-heading"
      className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm"
    >
      <div className="border-b border-stone-100 pb-4">
        <h2 id="onboarding-form-heading" className="text-lg font-bold text-stone-900">
          Dados Oficiais da Instituição de Ensino
        </h2>
        <p className="text-xs sm:text-sm text-stone-500">
          Informações necessárias para o registo no DNS.AO, dossiê da APD (Lei n.º 22/11) e acreditação Google/Microsoft.
        </p>
      </div>

      <fieldset className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <legend className="sr-only">Identificação e Domínio Institucional</legend>

        <div>
          <label htmlFor="school-name" className="block text-xs font-semibold uppercase text-stone-700 mb-1.5">
            Nome Completo do Colégio / IES <span aria-hidden="true">*</span>
          </label>
          <input
            id="school-name"
            name="name"
            type="text"
            required
            autoComplete="organization"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="edulink-input w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm"
          />
        </div>

        <div>
          <label htmlFor="school-nif" className="block text-xs font-semibold uppercase text-stone-700 mb-1.5">
            NIF Institucional (Angola) <span aria-hidden="true">*</span>
          </label>
          <input
            id="school-nif"
            name="nif"
            type="text"
            required
            inputMode="numeric"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            value={formData.nif}
            onChange={(e) => setFormData({ ...formData, nif: e.target.value })}
            className="edulink-input w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm font-mono"
          />
        </div>

        <div>
          <label htmlFor="school-alvara" className="block text-xs font-semibold uppercase text-stone-700 mb-1.5">
            Alvará MED / MESCTI <span aria-hidden="true">*</span>
          </label>
          <input
            id="school-alvara"
            name="alvara_med_mescti"
            type="text"
            required
            value={formData.alvara_med_mescti}
            onChange={(e) => setFormData({ ...formData, alvara_med_mescti: e.target.value })}
            className="edulink-input w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm"
          />
        </div>

        <div>
          <label htmlFor="school-domain" className="block text-xs font-semibold uppercase text-stone-700 mb-1.5">
            Domínio Pretendido (.edu.ao) <span aria-hidden="true">*</span>
          </label>
          <input
            id="school-domain"
            name="domain"
            type="text"
            required
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            value={formData.domain}
            onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
            className="edulink-input w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm font-mono text-teal-800"
          />
        </div>

        <div>
          <label htmlFor="school-email" className="block text-xs font-semibold uppercase text-stone-700 mb-1.5">
            E-mail Institucional de Contacto <span aria-hidden="true">*</span>
          </label>
          <input
            id="school-email"
            name="contact_email"
            type="email"
            required
            autoComplete="email"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            value={formData.contact_email}
            onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
            className="edulink-input w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm"
          />
        </div>

        <div>
          <label htmlFor="school-phone" className="block text-xs font-semibold uppercase text-stone-700 mb-1.5">
            Telefone da Secretaria
          </label>
          <input
            id="school-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="edulink-input w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm"
          />
        </div>

        <div>
          <label htmlFor="school-province" className="block text-xs font-semibold uppercase text-stone-700 mb-1.5">
            Província
          </label>
          <input
            id="school-province"
            name="province"
            type="text"
            value={formData.province}
            onChange={(e) => setFormData({ ...formData, province: e.target.value })}
            className="edulink-input w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm"
          />
        </div>

        <div>
          <label htmlFor="school-municipality" className="block text-xs font-semibold uppercase text-stone-700 mb-1.5">
            Município
          </label>
          <input
            id="school-municipality"
            name="municipality"
            type="text"
            value={formData.municipality}
            onChange={(e) => setFormData({ ...formData, municipality: e.target.value })}
            className="edulink-input w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm"
          />
        </div>
      </fieldset>

      <div>
        <label htmlFor="school-address" className="block text-xs font-semibold uppercase text-stone-700 mb-1.5">
          Endereço Físico
        </label>
        <input
          id="school-address"
          name="address"
          type="text"
          autoComplete="street-address"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          className="edulink-input w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm"
        />
      </div>

      <div>
        <label htmlFor="school-about" className="block text-xs font-semibold uppercase text-stone-700 mb-1.5">
          Apresentação Institucional (Para o Site Automático)
        </label>
        <textarea
          id="school-about"
          name="about_text"
          rows={3}
          value={formData.about_text}
          onChange={(e) => setFormData({ ...formData, about_text: e.target.value })}
          className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm"
        />
      </div>

      <div className="pt-2 flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 rounded-xl bg-teal-700 text-white font-semibold text-sm hover:bg-teal-800 disabled:opacity-50 transition shadow-sm"
        >
          {loading ? 'A Registar Escola...' : 'Submeter e Iniciar Setup Digital'}
        </button>
      </div>
    </form>
  );
}
