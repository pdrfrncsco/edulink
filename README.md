# YetuEdu — Plataforma de Identidade Académica & Benefícios Digitais (Angola)

A **YetuEdu** é a infraestrutura nacional de identidade digital (`.edu.ao`), aprovação de licenças em nuvem (**Google Workspace for Education**, **Microsoft 365 A1** e **Canva**) e **Passaporte Académico Digital (QR Code/JWT)** com blindagem regulatória da **Agência de Protecção de Dados (APD - Lei n.º 22/11)** para instituições de ensino em Angola.

---

## 1. Arquitetura da Solução (Monorepo)

```text
yetuedu/
├── docker-compose.yml          # Orquestração: PostgreSQL 16, Redis 7, Django 5, Celery e Next.js 15
├── .env.example                # Variáveis de ambiente e chaves de encriptação
├── backend/                    # Python + Django + Django REST Framework + Celery
│   ├── config/                 # Settings, URLs, Celery App
│   ├── apps/
│   │   ├── core/               # Modelos base UUID, timestamps e módulo Fernet AES-256
│   │   ├── tenants/            # Modelos School e CloudIntegration (Google / Microsoft)
│   │   ├── directory/          # AcademicUser, Enrollment, importador CSV e sinais de ciclo de vida
│   │   ├── provisioning/       # Workers Celery (Google Admin SDK e Microsoft Graph API)
│   │   └── passport/           # Emissor de Passaporte JWT e endpoint público de validação
│   ├── requirements.txt
│   └── Dockerfile              # Multi-stage build com utilizador não-root
├── frontend/                   # Next.js 15 (App Router + TypeScript + Tailwind CSS)
│   ├── src/
│   │   ├── middleware.ts       # Roteamento multi-domínio por cabeçalho Host (.edu.ao vs admin vs portal)
│   │   └── app/
│   │       ├── (admin)/        # Portal da Secretaria: Onboarding da escola e importador CSV
│   │       ├── (portal)/       # PWA do Aluno/Professor com Cartão Académico Digital (QR Code)
│   │       ├── (sites)/[domain]# Gerador dinâmico de sites .edu.ao para auditoria do Google/Microsoft
│   │       └── verify/         # Validador público de QR Code para portarias e parceiros locais
│   ├── package.json
│   └── Dockerfile              # Multi-stage build para execução conteinerizada
└── samples/
    └── turma_exemplo_angola.csv# Ficheiro CSV de exemplo com dados no formato de Angola
```

---

## 2. Como Executar com Docker Compose

### Pré-requisitos
* Docker e Docker Compose instalados.

### Passos de Execução
1. Copiar as variáveis de ambiente:
```bash
cp .env.example .env
```

2. Construir e subir todos os serviços conteinerizados:
```bash
docker compose up --build
```

3. Aplicar as migrações da base de dados e criar superadministrador:
```bash
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py createsuperuser
```

---

## 3. Roteamento Multi-Domínio (`middleware.ts`)

O Next.js interceta o cabeçalho `Host` de cada requisição HTTP para isolar a experiência de cada tipo de utilizador e escola:

| Domínio de Acesso / Host | Destino Interno | Papel |
| :--- | :--- | :--- |
| `localhost:3000` ou `admin.yetuedu.ao` | `/(admin)` | Portal da Secretaria (Onboarding e Importação CSV) |
| `portal.yetuedu.ao` ou `/portal` | `/(portal)` | PWA do Aluno e Professor (Cartão Digital QR Code) |
| `*.edu.ao` (ex: `colegio-esperanca.edu.ao`) | `/(sites)/[domain]` | Site institucional dinâmico para aprovação Google / Microsoft |
| `/verify?token=...` | `/verify` | Leitor de verificação em tempo real de matrículas |

---

## 4. Endpoints Principais da API (Django REST Framework)

| Método | Endpoint | Descrição |
| :--- | :--- | :--- |
| `POST` | `/api/v1/tenants/onboard/` | Registo rápido e onboarding de uma nova escola |
| `GET` | `/api/v1/tenants/by-domain/?domain=...` | Dados públicos da escola consumidos pelo Next.js |
| `POST` | `/api/v1/directory/upload-csv/` | Importação em lote de turmas (com geração de e-mails institucionais) |
| `POST` | `/api/v1/passport/issue/` | Emissão do token JWT do Cartão Académico Digital |
| `GET` | `/api/v1/passport/verify/?token=...` | Verificação pública de autenticidade e estado de matrícula |
| `POST` | `/api/v1/provisioning/sync-school/<uuid>/` | Disparo assíncrono de sincronização para Google e Microsoft |

---

## 5. Blindagem Regulatória e Segurança de Dados

* **Encriptação AES-256 (Fernet):** Todas as credenciais de *Service Account* (Google) e *App Registration* (Microsoft) são guardadas encriptadas na tabela `CloudIntegration`.
* **Ciclo de Vida Automático:** A transição do estado da matrícula para `SUSPENDED` aciona imediatamente o worker Celery para suspender contas na nuvem e invalidar o QR Code.
* **Conformidade com a Lei n.º 22/11 (APD):** O onboarding recolhe os parâmetros essenciais para emissão do dossiê oficial de proteção de dados perante a Agência de Proteção de Dados de Angola.
