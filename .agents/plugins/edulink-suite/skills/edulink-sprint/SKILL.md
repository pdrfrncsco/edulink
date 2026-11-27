---
name: edulink-sprint
description: >-
  Executa entregas de sprint, correções P0 de repositório/build, configuração local fora do Docker,
  auditoria de módulos Django/Next.js e criação de testes/CI na plataforma EduLink Angola.
  Usar quando o utilizador pedir para continuar o desenvolvimento, corrigir bugs pendentes,
  configurar ambiente local ou avançar nas sprints do backlog.
---

# EduLink Sprint Execution

Lê sempre `references/backlog-and-audit.md` antes de planear ou alterar ficheiros para respeitar a ordem de prioridades real do projeto.

## Fluxo de Execução
1. **Inspecionar estado atual:** Confirmar `git status`, `.gitignore` e os ficheiros alvo antes de editar.
2. **Priorizar bloqueios P0 antes de novas features:** Garantir que `frontend/src/lib/` está versionado, os ícones PWA existem, não há hydration mismatch e `npm run build` + `manage.py test` passam num clone limpo.
3. **Implementar de ponta a ponta:** Se alterar um modelo ou endpoint Django, atualizar o serializer, as permissões multi-tenant, os tipos em `frontend/src/components/admin/types.ts` e os testes respetivos.
4. **Validar:**
   - Backend: `python manage.py check && python manage.py test` (com `DJANGO_SETTINGS_MODULE=config.settings_local` se fora do Docker).
   - Frontend: `cd frontend && npm run build`.
5. **Relatar de forma objetiva:** Listar ficheiros alterados, resultados dos testes/build e o próximo item do backlog em `references/backlog-and-audit.md`.
