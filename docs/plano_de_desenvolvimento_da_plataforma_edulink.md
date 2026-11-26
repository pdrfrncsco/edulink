# Plano de Desenvolvimento da Plataforma EduLink (2026–2028)

**Posicionamento:** Infraestrutura de Identidade Educacional, Integração em Nuvem (`.edu.ao`) e Clube de Benefícios para Estudantes, Professores e Instituições de Ensino em Angola.  
**Contexto Temporal:** Novembro de 2026 (janela imediata para a obrigatoriedade da Facturação Electrónica da AGT em Janeiro de 2027).

---

## 1. Visão Estratégica e Proposta de Valor

A **EduLink** resolve o vazio deixado pelos ERPs administrativos locais (focados apenas em secretaria, propinas e certificação AGT) e elimina as 4 barreiras que impedem escolas e universidades angolanas de acederem aos benefícios digitais globais:

1. **Identidade Digital Chave-na-Mão (`.edu.ao` + Site):** Registo assistido junto dos Registrars do **DNS.AO**, configuração automatizada de DNS (Cloudflare) e geração instantânea de um site institucional funcional que cumpre os requisitos de acreditação do Google e da Microsoft.
2. **Aprovação e Provisionamento em Nuvem:** Submissão guiada dos alvarás (MED/MESCTI) para aprovar licenças gratuitas no **Google Workspace for Education**, **Microsoft 365 Education (A1)** e **Canva para Educação**, com criação e suspensão automática de contas via API no acto da matrícula.
3. **Passaporte Académico e Benefícios Globais/Locais:** Cartão digital verificável (QR Code/JWT) e credenciação institucional junto da **SheerID**, **UNiDAYS** e **GitHub Education**, além de um **Clube de Benefícios em Kwanzas** (operadoras, livrarias, software) para alunos e para os mais de 213 mil professores do país.
4. **Blindagem Regulatória (APD):** Geração automatizada do dossiê de notificação/autorização perante a **Agência de Protecção de Dados (APD)** ao abrigo da Lei n.º 22/11, protegendo as direcções escolares contra coimas (que em 2026 atingiram entre US$ 75.000 e US$ 225.000).

---

## 2. Arquitectura Técnica da EduLink

A plataforma deve ser construída como um **SaaS Multi-tenant orientado a eventos**, com isolamento rigoroso por instituição (`tenant_id`).

### Stack Tecnológica Recomendada
* **Frontend (Portais & Sites Gerados):** Next.js (TypeScript) + Tailwind CSS (renderização multi-domínio por cabeçalho `Host` para servir os sites institucionais das escolas e os portais da Secretaria, Aluno e Professor).
* **Backend Core (API & Regras de Negócio):** Python + Django + Django REST Framework (DRF).
* **Base de Dados & Cache:** PostgreSQL (dados relacionais isolados por `tenant_id` + encriptação AES-256 para chaves de API das escolas) e Redis.
* **Motor Assíncrono:** Celery + Redis para processar importações de milhares de alunos e chamadas às APIs externas sem bloquear a interface.
* **Provedor de Identidade (SSO):** Keycloak (SAML 2.0 e OpenID Connect) para login único em todas as plataformas parceiras.
* **Infraestrutura & DNS:** Docker + Nginx/Caddy (SSL automático para múltiplos domínios `.edu.ao`) + Cloudflare API (gestão automática de registos TXT, MX, SPF, DKIM e DMARC).

### Módulos Core da Aplicação
1. **Módulo `Onboarding & Domínios`:** Fluxo passo a passo para recolha do NIF, BI do director e Alvará MED/MESCTI, acompanhamento do estado do domínio `.edu.ao` e publicação automática do site institucional da escola.
2. **Módulo `Directório Académico`:** Gestão de anos lectivos, turmas, matrículas activas, docentes e importação em lote via CSV/Excel (preparado para receber webhooks de ERPs locais).
3. **Módulo `Conectores Cloud (Provisioning Engine)`:**
   * *Conector Google:* Integração via **Google Admin SDK (Directory API)** usando *Service Account* com *Domain-Wide Delegation*.
   * *Conector Microsoft:* Integração via **Microsoft Graph API** e **Entra ID** para atribuição de licenças *Faculty* vs *Students*.
   * *Conector Canva:* Ligação via SSO SAML/OIDC do Google Workspace ou Microsoft Entra ID.
4. **Módulo `Passaporte EduLink & Benefícios`:** Emissão de QR Code dinâmico assinado com JWT, endpoint público de verificação (`/api/v1/verify/`) para parceiros locais e portal de activação guiada para GitHub Student Pack, Spotify Estudante e Google AI.
5. **Módulo `Conformidade APD & Facturação`:** Gerador de formulários e termos de consentimento parental (essencial para menores no ensino primário e secundário) exigidos pela APD, e emissão de facturação certificada AGT.

---

## 3. Fases de Desenvolvimento e Cronograma (2026–2028)

### Fase 1: MVP Operacional e Pilotos em Luanda (Dezembro 2026 – Março 2027)
**Objectivo:** Colocar a EduLink em produção com 5 a 15 colégios privados piloto em Luanda (Talatona, Nova Vida, Kilamba, Camama e Belas) aproveitando o ciclo de matrículas de 2027 e a transição fiscal da AGT.

* **Sprints 1–2 (Semanas 1 a 4) — Fundação Multi-tenant e Gerador de Sites:**
  * Configurar arquitectura base (Django + PostgreSQL + Next.js + Caddy/Cloudflare).
  * Construir o portal de onboarding da escola (upload de documentos oficiais) e o template dinâmico do site institucional `.edu.ao`.
  * Implementar o importador de alunos/professores em lote (CSV/Excel) e geração padronizada de endereços (`nome.apelido@escola.edu.ao`).
* **Sprints 3–4 (Semanas 5 a 8) — Motor de Provisionamento Google & Microsoft:**
  * Implementar workers Celery para criação, suspensão e reativação de utilizadores na **Google Admin SDK** e **Microsoft Graph API**.
  * Configurar o **Keycloak (SSO)** e validar o fluxo de login único com o **Canva para Educação**.
* **Sprints 5–6 (Semanas 9 a 12) — Passaporte Digital, Dossiê APD e Go-Live Piloto:**
  * Desenvolver a PWA do Aluno/Professor com o **Cartão Digital QR Code** e endpoint de validação.
  * Criar o gerador automático do dossiê de notificação à **APD (Lei n.º 22/11)**.
  * Validar ponta a ponta com os primeiros 5 colégios piloto (oferecendo isenção da 1.ª anuidade em troca de caso de estudo).

---

### Fase 2: Integração com ERPs Locais e Verificadores Globais (Abril 2027 – Dezembro 2027)
**Objectivo:** Escalar para 150–360 instituições privadas (10% do mercado endereçável) e eliminar a dupla digitação nas secretarias escolares.

* **Conectores B2B2B (APIs com ERPs Angolanos):**
  * Desenvolver adaptadores de sincronização para receber eventos de matrícula e propinas em dia directamente dos ERPs locais (**KLASSE**, **SysPortal** e **Kacennu**, acompanhando a abertura da API prevista por estes fornecedores em 2027).
* **Desbloqueio de Verificadores Internacionais:**
  * Submeter o registo institucional colectivo das escolas e IES parceiras da EduLink nas bases da **SheerID**, **UNiDAYS** e **GitHub Education**, permitindo que estudantes universitários (especialmente das 38.596 vagas em Engenharias/TI) e do ensino técnico activem automaticamente o *GitHub Student Developer Pack*, *Google AI* e *Spotify Estudante*.
* **Expansão Geográfica:**
  * Replicar a operação comercial para os polos urbanos privados de **Benguela, Huíla, Huambo, Bié, Uíge, Malanje e Cuanza Sul**.

---

### Fase 3: Ecossistema Nacional, Pagamentos em Kwanzas e Sector Público (2028+)
**Objectivo:** Consolidar a EduLink como a camada padrão de identidade académica em Angola e abrir receitas recorrentes B2B2C e B2G.

* **Gateway de Pagamentos Educativos em Kwanzas:**
  * Integrar **Multicaixa Express** e **KWiK** na plataforma para permitir que estudantes e professores paguem em Kwanzas licenças premium individuais, cursos certificados e pacotes de dados móveis educativos negociados com a **Unitel** e **Africell**.
* **Clube Nacional de Benefícios Docentes e Estudantis:**
  * Abrir a API de verificação de QR Code para livrarias, papelarias, transportes, cinemas, bancos (contas jovens/salário docente) e plataformas de formação em Angola.
* **Integração com Programas Públicos:**
  * Posicionar a EduLink em consórcios técnicos para os concursos de transformação digital do ensino (como o projecto **TEST / ELEVATE Angola** e a interoperabilidade com a plataforma estatal **Xilonga**).

---

## 4. Modelo Comercial e Metas de Execução

| Plano EduLink | Público-Alvo | Inclui | Preço Sugerido (AOA) |
| :--- | :--- | :--- | :--- |
| **Setup Escola Digital** (Taxa Única) | Todas as novas escolas | Registo `.edu.ao` (1.º ano) + Site Institucional + Aprovação Google/MS/Canva + Dossiê APD | **150.000 Kz** (Isento/50% nos 10 primeiros pilotos) |
| **EduLink Essencial** (Anual) | Colégios até 400 alunos | Gestão até 500 contas `.edu.ao`, SSO, Provisionamento Google/Canva e Cartão Digital | **240.000 Kz / ano** (ou 600 Kz/aluno/ano) |
| **EduLink Pro** (Anual) | Médios/Grandes Colégios | Contas ilimitadas, Google + Microsoft 365 A1, Integração API com ERP e Suporte Prioritário | **480.000 Kz / ano** (ou 550 Kz/aluno/ano) |
| **EduLink Campus** (Anual) | Universidades e Institutos (IES) | SSO Institucional, Registo SheerID/GitHub/UNiDAYS, API ERP Académico e Portal de Benefícios | **A partir de 1.200.000 Kz / ano** |

---

## 5. Primeiros Passos Imediatos (Próximos 15 Dias)

1. **Constituição e Conformidade:** Registar a marca **EduLink**, estabelecer acordo de revenda/parceria técnica com um Registrar acreditado pela **DNS.AO** e preparar o modelo padrão de notificação à **APD**.
2. **Prototipagem do Onboarding + Site Automático:** Desenvolver o fluxo de cadastro de escola que gera em menos de 5 minutos o site institucional pronto para auditoria do Google Workspace.
3. **Abordagem a 5 Escolas Piloto em Luanda:** Seleccionar 3 colégios privados de média dimensão (Talatona/Kilamba/Nova Vida) e 2 institutos superiores ou médios técnicos para validar a aprovação completa (`.edu.ao` + Google Workspace + Canva Educação + Cartão QR Code) antes do início do próximo ano lectivo.