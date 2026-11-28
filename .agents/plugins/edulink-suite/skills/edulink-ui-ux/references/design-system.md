# Design System EduLink (Tailwind CSS)

## Tokens Visuais
- **Superfícies:** `bg-stone-50` (página), `bg-white border border-stone-200 rounded-2xl shadow-sm` (cartões).
- **Tipografia:** `text-stone-900` (títulos), `text-stone-600` (corpo), `text-stone-500` (auxiliar), `font-mono` (NIF, domínios, e-mails, referências MCX/KWiK, n.º fatura).
- **Marca EduLink:** `bg-teal-700 hover:bg-teal-800` (primário), `bg-stone-900 hover:bg-stone-800` (secundário).
- **Marca Dinâmica da Escola:** Aplicar `school.primary_color` e `school.logo_url` em `/sites/[domain]`, na sidebar da escola, no Cartão Digital (`/portal`) e em `/verify`.
- **Estados Semânticos:**
  - Sucesso / Ativo / Aprovado: `bg-emerald-50 text-emerald-800 border-emerald-200`
  - Pendente / Demo: `bg-amber-50 text-amber-800 border-amber-200`
  - Em Revisão / Sync: `bg-sky-50 text-sky-800 border-sky-200`
  - Erro / Suspenso / Rejeitado: `bg-red-50 text-red-800 border-red-200`

## Primitivos Base (`frontend/src/components/ui/`)
- `Button.tsx`, `StatusBadge.tsx`, `Tabs.tsx`, `Card.tsx`, `AlertBanner.tsx`, `Modal.tsx`, `Skeleton.tsx`, `EmptyState.tsx`, `DataTable.tsx`, `FormField.tsx`, `CopyButton.tsx`.
- Navegação móvel responsiva (`/admin` e `/ops`): `components/admin/MobileNavDrawer.tsx` (`<dialog>` nativo com *scroll-snap* e `100svh`).
