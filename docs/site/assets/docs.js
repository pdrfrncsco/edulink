'use strict';

/**
 * EduLink Docs (docs.edulink.ao)
 * Progressive enhancements: theme selector, responsive sidebar/drawer,
 * scrollspy aria-current sync, accessible tabs, copy buttons, and quick search.
 */

const DOCS_INDEX = [
  { title: 'Página Inicial & Guias por Perfil', url: 'index.html', keywords: 'edulink inicio portais admin escola docente aluno erp' },
  { title: 'Admin: Entrar e Trocar de Escola', url: 'admin.html#acesso-geral', keywords: 'admin entrar painel selecionar escola barra superior' },
  { title: 'Admin: Ativar, Suspender e Apoiar Escolas', url: 'admin.html#gerir-escolas', keywords: 'admin ativar suspender escola nif alvara acompanhar passos' },
  { title: 'Admin: Resolver Problemas Comuns', url: 'admin.html#ajuda-admin', keywords: 'admin erro ajuda site nuvem cartao suspenso' },
  { title: 'Instituições: Criar Conta e Registar Escola', url: 'instituicoes.html#passo-1', keywords: 'escola secretaria criar conta nif alvara med mescti site' },
  { title: 'Instituições: Carregar Lista de Alunos e Docentes (CSV)', url: 'instituicoes.html#passo-2', keywords: 'excel csv lista alunos professores turma email suspender matricula' },
  { title: 'Instituições: Ligar Google, Microsoft e Canva', url: 'instituicoes.html#passo-3', keywords: 'google workspace microsoft 365 canva testar sincronizar' },
  { title: 'Instituições: Ativar Domínio .edu.ao', url: 'instituicoes.html#passo-4', keywords: 'dominio edu.ao dns cloudflare propagacao registos' },
  { title: 'Instituições: Dossiê APD e Autorização dos Pais', url: 'instituicoes.html#passo-5', keywords: 'apd protecao dados lei 22/11 consentimento pais encarregados' },
  { title: 'Instituições: Programas da Escola e Benefícios Globais', url: 'instituicoes.html#passo-6', keywords: 'erp klasse sysportal kacennu sheerid unidays github' },
  { title: 'Docentes: Ativar Conta pela Primeira Vez', url: 'docentes.html#ativar-conta', keywords: 'professor docente ativar conta primeiro acesso bi email palavra passe' },
  { title: 'Docentes: Cartão Digital e Ferramentas de Ensino', url: 'docentes.html#cartao-ferramentas', keywords: 'cartao digital qr code telemovel offline google microsoft canva' },
  { title: 'Docentes: Dúvidas Frequentes', url: 'docentes.html#duvidas-docentes', keywords: 'erro bi cartao vermelho suspenso instalar telemovel' },
  { title: 'Alunos: Ativar Conta de Estudante', url: 'alunos.html#ativar-aluno', keywords: 'aluno estudante ativar conta bi processo palavra passe' },
  { title: 'Alunos: Cartão Digital, QR Code e Uso Sem Internet', url: 'alunos.html#cartao-aluno', keywords: 'cartao digital qr code telemovel offline verificar portaria' },
  { title: 'Encarregados: Assinar Autorização para Menores', url: 'alunos.html#encarregados', keywords: 'pais encarregado educacao menor autorizacao termo consentimento bi' },
  { title: 'Alunos: Benefícios e Contas da Escola', url: 'alunos.html#beneficios-aluno', keywords: 'beneficios github student pack spotify google microsoft canva' },
  { title: 'ERPs: Arquitetura B2B2B & Webhooks HMAC', url: 'erps.html#arquitetura-hmac', keywords: 'erp webhook hmac sha256 x-yetuedu-signature idempotencia event_id' },
  { title: 'ERPs: KLASSE, SysPortal, Kacennu & Genérico', url: 'erps.html#provedores', keywords: 'klasse sysportal kacennu generic payload json eventos' },
  { title: 'ERPs: Simulação, Estados & Exemplos', url: 'erps.html#exemplos', keywords: 'curl python nodejs simulate-event tuition_overdue student_enrolled' },
];

/* 1. Theme Override (System / Light / Dark) */
(function initThemeControl() {
  const STORAGE_KEY = 'edulink_docs_theme';
  const select = document.getElementById('theme-select');
  const metaColorScheme = document.querySelector('meta[name="color-scheme"]');

  function applyTheme(value) {
    const root = document.documentElement;
    if (value === 'light' || value === 'dark') {
      root.setAttribute('data-theme', value);
      root.style.colorScheme = value;
      if (metaColorScheme) metaColorScheme.setAttribute('content', value);
    } else {
      root.removeAttribute('data-theme');
      root.style.removeProperty('color-scheme');
      if (metaColorScheme) metaColorScheme.setAttribute('content', 'light dark');
    }
  }

  const saved = localStorage.getItem(STORAGE_KEY) || 'system';
  applyTheme(saved);
  if (select) {
    select.value = saved;
    select.addEventListener('change', (e) => {
      const val = e.target.value;
      localStorage.setItem(STORAGE_KEY, val);
      applyTheme(val);
    });
  }
})();

/* 2. Responsive Sidebar / Mobile Drawer (popover="manual" + matchMedia) */
(function initResponsiveDrawer() {
  const drawer = document.getElementById('docs-drawer');
  const openBtn = document.getElementById('drawer-open');
  const closeBtn = document.getElementById('drawer-close');
  const main = document.getElementById('conteudo-principal');
  const header = document.querySelector('.site-header');
  const footer = document.querySelector('.site-footer');

  if (!drawer || !openBtn || !main) return;

  const mobileQuery = window.matchMedia('(max-width: 959px)');
  let isOpen = false;

  function setBackgroundInert(state) {
    main.inert = state;
    if (header) header.inert = state;
    if (footer) footer.inert = state;
  }

  function openDrawer() {
    if (!mobileQuery.matches || isOpen) return;
    isOpen = true;
    if (typeof drawer.showPopover === 'function') {
      drawer.showPopover();
    } else {
      drawer.hidden = false;
    }
    setBackgroundInert(true);
    drawer.setAttribute('aria-modal', 'true');
    openBtn.setAttribute('aria-expanded', 'true');
    if (closeBtn) closeBtn.focus();
  }

  function closeDrawer(restoreFocus = true) {
    if (!isOpen) return;
    isOpen = false;
    if (typeof drawer.hidePopover === 'function') {
      try { drawer.hidePopover(); } catch {}
    }
    setBackgroundInert(false);
    drawer.removeAttribute('aria-modal');
    openBtn.setAttribute('aria-expanded', 'false');
    if (restoreFocus) openBtn.focus();
  }

  function syncMode() {
    if (mobileQuery.matches) {
      drawer.setAttribute('popover', 'manual');
      drawer.setAttribute('role', 'dialog');
      drawer.setAttribute('aria-label', 'Índice da documentação');
      openBtn.hidden = false;
    } else {
      closeDrawer(false);
      drawer.removeAttribute('popover');
      drawer.removeAttribute('role');
      drawer.removeAttribute('aria-modal');
      drawer.setAttribute('aria-label', 'Navegação lateral');
      openBtn.hidden = true;
    }
  }

  syncMode();
  mobileQuery.addEventListener('change', syncMode);

  openBtn.addEventListener('click', openDrawer);
  if (closeBtn) closeBtn.addEventListener('click', () => closeDrawer(true));

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) closeDrawer(true);
  });

  drawer.addEventListener('click', (e) => {
    if (mobileQuery.matches && e.target.closest('a')) {
      closeDrawer(false);
    }
  });
})();

/* 3. Scrollspy sync (native scroll-target-group + IntersectionObserver fallback) */
(function initScrollspy() {
  const tocLinks = Array.from(document.querySelectorAll('.toc-nav a[href^="#"]'));
  if (tocLinks.length === 0) return;

  if (CSS.supports('scroll-target-group: auto')) {
    const syncAriaCurrent = () => {
      const current = document.querySelector('.toc-nav a:target-current');
      tocLinks.forEach((link) => {
        link.setAttribute('aria-current', link === current ? 'true' : 'false');
      });
    };
    syncAriaCurrent();
    document.addEventListener('scrollend', syncAriaCurrent);
  } else {
    const sections = tocLinks
      .map((a) => document.getElementById(a.getAttribute('href').slice(1)))
      .filter(Boolean);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            tocLinks.forEach((link) => {
              const active = link.getAttribute('href') === `#${id}`;
              link.classList.toggle('target-current', active);
              link.setAttribute('aria-current', active ? 'true' : 'false');
            });
          }
        });
      },
      { rootMargin: '-20% 0px -65% 0px', threshold: 0 }
    );
    sections.forEach((sec) => observer.observe(sec));
  }
})();

/* 4. Accessible Tabs (arrow keys + Home/End + hidden="until-found" fallback) */
(function initTabs() {
  if (!('onbeforematch' in HTMLElement.prototype)) {
    document.querySelectorAll('[role="tabpanel"][hidden="until-found"]').forEach((panel) => {
      panel.setAttribute('hidden', '');
    });
  }

  document.querySelectorAll('.edulink-tabs').forEach((container) => {
    const tabs = Array.from(container.querySelectorAll('[role="tab"]'));
    const panels = Array.from(container.querySelectorAll('[role="tabpanel"]'));
    if (!tabs.length) return;

    function activateTab(targetTab, moveFocus = false) {
      tabs.forEach((tab, idx) => {
        const selected = tab === targetTab;
        tab.setAttribute('aria-selected', selected ? 'true' : 'false');
        tab.tabIndex = selected ? 0 : -1;
        const panel = panels[idx];
        if (panel) {
          if (selected) {
            panel.removeAttribute('hidden');
            panel.tabIndex = 0;
          } else {
            panel.setAttribute('hidden', 'onbeforematch' in HTMLElement.prototype ? 'until-found' : '');
            panel.removeAttribute('tabindex');
          }
        }
      });
      if (moveFocus) {
        targetTab.focus();
        targetTab.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
    }

    tabs.forEach((tab, idx) => {
      tab.tabIndex = tab.getAttribute('aria-selected') === 'true' ? 0 : -1;
      tab.addEventListener('click', () => activateTab(tab, false));
      tab.addEventListener('keydown', (e) => {
        let next = null;
        if (e.key === 'ArrowRight') next = (idx + 1) % tabs.length;
        else if (e.key === 'ArrowLeft') next = (idx - 1 + tabs.length) % tabs.length;
        else if (e.key === 'Home') next = 0;
        else if (e.key === 'End') next = tabs.length - 1;
        if (next !== null) {
          e.preventDefault();
          activateTab(tabs[next], true);
        }
      });
    });

    container.addEventListener('beforematch', (e) => {
      const matchedPanel = e.target.closest('[role="tabpanel"]');
      const idx = panels.indexOf(matchedPanel);
      if (idx >= 0) activateTab(tabs[idx], false);
    });
  });
})();

/* 5. Copy code buttons + Live status announcer */
(function initCopyButtons() {
  const statusRegion = document.getElementById('live-announcer');

  document.querySelectorAll('.copy-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const figure = btn.closest('figure');
      const code = figure?.querySelector('pre code')?.textContent || '';
      if (!code) return;
      try {
        await navigator.clipboard.writeText(code);
        const original = btn.textContent;
        btn.textContent = 'Copiado';
        if (statusRegion) {
          statusRegion.textContent = 'Bloco de código copiado para a área de transferência.';
        }
        setTimeout(() => {
          btn.textContent = original;
        }, 1800);
      } catch {
        if (statusRegion) {
          statusRegion.textContent = 'Não foi possível copiar automaticamente. Selecione o texto manualmente.';
        }
      }
    });
  });
})();

/* 6. Instant Documentation Search (IME-safe) */
(function initSearch() {
  const input = document.getElementById('docs-search-input');
  const resultsList = document.getElementById('docs-search-results');
  const statusRegion = document.getElementById('live-announcer');
  if (!input || !resultsList) return;

  let isComposing = false;
  input.addEventListener('compositionstart', () => { isComposing = true; });
  input.addEventListener('compositionend', () => {
    isComposing = false;
    runSearch(input.value);
  });

  function runSearch(raw) {
    const q = raw.trim().toLowerCase();
    resultsList.textContent = '';
    if (q.length < 2) return;

    const matches = DOCS_INDEX.filter(
      (item) => item.title.toLowerCase().includes(q) || item.keywords.includes(q)
    ).slice(0, 6);

    if (matches.length === 0) {
      const li = document.createElement('li');
      li.textContent = 'Sem resultados para "' + raw.trim() + '".';
      li.style.fontSize = '0.82rem';
      li.style.color = 'var(--text-secondary)';
      resultsList.appendChild(li);
      if (statusRegion) statusRegion.textContent = 'Nenhum tópico encontrado na pesquisa.';
      return;
    }

    matches.forEach((item) => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = item.url;
      const strong = document.createElement('strong');
      strong.textContent = item.title;
      a.appendChild(strong);
      li.appendChild(a);
      resultsList.appendChild(li);
    });

    if (statusRegion) {
      statusRegion.textContent = `${matches.length} tópicos encontrados para ${raw.trim()}.`;
    }
  }

  input.addEventListener('input', (e) => {
    if (!isComposing) runSearch(e.target.value);
  });
})();
