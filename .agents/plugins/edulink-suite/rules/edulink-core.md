---
trigger: always_on
description: "Invariantes globais de negócio, marca e conformidade da plataforma EduLink Angola."
---

# EduLink Angola — Invariantes de Produto

1. **Marca Única:** Usar exclusivamente **EduLink** (`edulink.ao`). Eliminar qualquer referência residual a `YetuEdu`, `AcadID` ou série fiscal `FT YE2026`.
2. **Core Business:** SaaS multi-tenant de identidade educacional em Angola (registo `.edu.ao` + site institucional + Google Workspace + Microsoft 365 A1 + Canva Educação + Passaporte QR/JWT + APD + AGT). Não transformar em ERP escolar de notas/propinas.
3. **Domínios & Acreditação:**
   - `{preview_slug}.edulink.ao` serve apenas para demonstração comercial; nunca submeter subdomínios SaaS ao Google, Microsoft, SheerID, UNiDAYS ou GitHub.
   - `MED_K12`: elegível para Canva Educação gratuito (`is_canva_k12_eligible = True`).
   - `MESCTI_HIGHER_ED`: elegível para Google, Microsoft A1 e GitHub/SheerID; Canva é plano pago (*Canva for Campus*).
4. **Fases via Feature Flags:** Manter `enable_erp_sync`, `enable_benefits_club` e `enable_online_payments` em `False` por omissão nas novas escolas piloto. Nunca apagar o código das Fases 2/3, apenas ocultá-lo para secretarias sem flag ativa.
5. **Idioma e Moeda:** Interface, erros e documentos em português de Angola (`pt-AO`), moeda em Kwanzas (`150.000,00 Kz`), IVA 14%.
6. **Higiene Git:** Nunca commitar `.env`, `.env.local`, `db.sqlite3`, `media/`, `__pycache__/` ou `tsconfig.tsbuildinfo`. Manter `frontend/src/lib/` sempre rastreado no Git.
