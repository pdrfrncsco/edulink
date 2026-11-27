---
name: edulink-ui-ux
description: >-
  Cria e refatora interfaces, design system (components/ui), acessibilidade, fluxos mobile-first
  da PWA e separação visual entre /admin (Escola) e /ops (Backoffice EduLink).
  Usar em qualquer tarefa de UI/UX, estilização Tailwind, componentização ou usabilidade.
---

# EduLink UI/UX & Design System

Consulta `references/design-system.md` antes de criar novos componentes ou refatorar ecrãs existentes.

## Procedimento
1. **Reutilizar antes de duplicar:** Antes de escrever botões, badges, modais, alertas ou tabelas inline, verificar/criar o primitivo em `frontend/src/components/ui/`.
2. **Desmontar monolitos (> 400 linhas):**
   - `OnboardingTab.tsx` → `StepLegal`, `StepDocs`, `StepDomain`, `StepPreview`.
   - `BillingAndBenefitsTab.tsx` → `SubscriptionsPanel`, `AGTInvoicesPanel`, `BenefitsCatalogPanel`.
   - `(portal)/portal/page.tsx` → `PassportCard`, `CloudAppsTab`, `BenefitsTab`, `AccountTab`, `QrFullscreenModal`.
   - `(admin)/admin/page.tsx` → `AdminSidebar`, `SchoolOverviewPanel`, `AdminShell`.
   - `EduLinkLanding.tsx` → `HeroSimulator`, `PersonaTabs`, `RoiCalculator`, `PricingSection`, `FaqAccordion`, `DemoModal`.
3. **Separação de Personas:** Manter o ambiente da secretaria limpo e orientado a tarefas escolares; concentrar ferramentas multi-tenant (SAF-T XML, revisão documental, parceiros POS) no Backoffice (`/ops` ou grupo restrito a `PLATFORM_ADMIN`).
4. **Acessibilidade e `pt-AO`:** Todos os inputs com `htmlFor`/`id`, `placeholder` sem dados hardcoded no estado, valores em Kwanzas formatados via `Intl.NumberFormat('pt-AO')` e ações irreversíveis protegidas por confirmação.
