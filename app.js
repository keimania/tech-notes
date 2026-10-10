/**
 * ==========================================================================
 * Mobile-First Technical Book Reader Engine
 * Author: Antigravity AI Orchestrator
 * ==========================================================================
 */

(function () {
  'use strict';

  // --- App State ---
  const state = {
    currentPartIndex: 0,
    theme: localStorage.getItem('tech_book_theme') || 'theme-light',
    fontSize: localStorage.getItem('tech_book_font_size') || 'font-md',
    bookData: window.BOOK_DATA || [],
    headings: [],
    searchDebounce: null,
  };

  // --- DOM Elements ---
  const els = {
    body: document.body,
    progressBar: document.getElementById('progress-bar'),
    sidebar: document.getElementById('sidebar'),
    sidebarBackdrop: document.getElementById('sidebar-backdrop'),
    sidebarNav: document.getElementById('sidebar-nav'),
    menuBtn: document.getElementById('menu-btn'),
    closeSidebarBtn: document.getElementById('close-sidebar-btn'),
    brandWrapper: document.getElementById('brand-wrapper'),
    currentPartBadge: document.getElementById('current-part-badge'),
    currentPartTitle: document.getElementById('current-part-title'),
    articleContent: document.getElementById('article-content'),
    prevPartBtn: document.getElementById('prev-part-btn'),
    nextPartBtn: document.getElementById('next-part-btn'),
    // Footer nav
    footerPrevCard: document.getElementById('footer-prev-card'),
    footerNextCard: document.getElementById('footer-next-card'),
    // Bottom Nav
    bottomNavPrev: document.getElementById('bottom-nav-prev'),
    bottomNavNext: document.getElementById('bottom-nav-next'),
    bottomNavMenu: document.getElementById('bottom-nav-menu'),
    bottomNavToc: document.getElementById('bottom-nav-toc'),
    bottomNavSearch: document.getElementById('bottom-nav-search'),
    // Header Buttons
    themeBtn: document.getElementById('theme-btn'),
    fontSizeBtn: document.getElementById('font-size-btn'),
    searchBtn: document.getElementById('search-btn'),
    tocBtn: document.getElementById('toc-btn'),
    // Search Modal
    searchModalOverlay: document.getElementById('search-modal-overlay'),
    searchModalClose: document.getElementById('search-modal-close'),
    searchModalInput: document.getElementById('search-modal-input'),
    searchModalResults: document.getElementById('search-modal-results'),
    sidebarSearchInput: document.getElementById('sidebar-search-input'),
    // TOC Sheet
    tocSheet: document.getElementById('toc-sheet'),
    tocSheetClose: document.getElementById('toc-sheet-close'),
    tocSheetBody: document.getElementById('toc-sheet-body'),
    // Diagram Modal
    diagramModal: document.getElementById('diagram-modal'),
    diagramModalClose: document.getElementById('diagram-modal-close'),
    diagramModalContent: document.getElementById('diagram-modal-content'),
  };

  // --- Initialize App ---
  function init() {
    applyTheme(state.theme);
    applyFontSize(state.fontSize);
    renderSidebarNav();
    setupMarked();
    setupMermaid();
    bindEvents();

    // Check URL Hash on load
    const hash = window.location.hash.replace('#', '');
    if (hash) {
      const idx = state.bookData.findIndex((p) => p.id === hash);
      if (idx !== -1) {
        state.currentPartIndex = idx;
      }
    }
    loadCurrentPart();
  }

  // --- Theme & Font Settings ---
  function applyTheme(theme) {
    els.body.classList.remove('theme-light', 'theme-dark', 'theme-sepia');
    els.body.classList.add(theme);
    state.theme = theme;
    localStorage.setItem('tech_book_theme', theme);

    // Update Mermaid theme
    if (window.mermaid) {
      const isDark = theme === 'theme-dark';
      mermaid.initialize({
        startOnLoad: false,
        theme: isDark ? 'dark' : 'neutral',
        securityLevel: 'loose',
        fontFamily: 'var(--font-sans)',
      });
    }
  }

  function cycleTheme() {
    const themes = ['theme-light', 'theme-sepia', 'theme-dark'];
    const nextIdx = (themes.indexOf(state.theme) + 1) % themes.length;
    applyTheme(themes[nextIdx]);
    // Re-render mermaid diagrams for new theme contrast
    renderMermaidInView();
  }

  function applyFontSize(size) {
    els.body.classList.remove('font-sm', 'font-md', 'font-lg', 'font-xl');
    els.body.classList.add(size);
    state.fontSize = size;
    localStorage.setItem('tech_book_font_size', size);
  }

  function cycleFontSize() {
    const sizes = ['font-sm', 'font-md', 'font-lg', 'font-xl'];
    const nextIdx = (sizes.indexOf(state.fontSize) + 1) % sizes.length;
    applyFontSize(sizes[nextIdx]);
  }

  // --- Sidebar Navigation ---
  function renderSidebarNav() {
    if (!els.sidebarNav) return;
    els.sidebarNav.innerHTML = state.bookData
      .map((part, index) => {
        const isActive = index === state.currentPartIndex ? 'active' : '';
        const partNum = `PART ${(index + 1).toString().padStart(2, '0')}`;
        const cleanTitle = part.title.replace(/^PART\s+\d+[\.:\s]*/i, '');
        return `
          <div class="part-nav-item ${isActive}" data-index="${index}">
            <span class="part-nav-num">${partNum}</span>
            <span class="part-nav-title">${cleanTitle}</span>
            <span class="part-nav-meta">섹션 ${part.sectionCount || part.sections?.length || 0}개 · 약 15분</span>
          </div>
        `;
      })
      .join('');

    // Attach click handlers
    els.sidebarNav.querySelectorAll('.part-nav-item').forEach((item) => {
      item.addEventListener('click', () => {
        const idx = parseInt(item.getAttribute('data-index'), 10);
        navigateToPart(idx);
        closeSidebar();
      });
    });
  }

  function updateSidebarActiveItem() {
    if (!els.sidebarNav) return;
    els.sidebarNav.querySelectorAll('.part-nav-item').forEach((item, index) => {
      if (index === state.currentPartIndex) {
        item.classList.add('active');
        item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      } else {
        item.classList.remove('active');
      }
    });
  }

  function openSidebar() {
    els.sidebar.classList.add('open');
    els.sidebarBackdrop.classList.add('active');
  }

  function closeSidebar() {
    els.sidebar.classList.remove('open');
    els.sidebarBackdrop.classList.remove('active');
  }

  // --- Markdown Parser Configuration ---
  function setupMarked() {
    if (!window.marked) return;

    const renderer = new marked.Renderer();

    // Custom Table Wrapping
    renderer.table = function (header, body) {
      return `
        <div class="table-wrapper">
          <table>
            <thead>${header}</thead>
            <tbody>${body}</tbody>
          </table>
        </div>
      `;
    };

    // Custom Code Blocks (Mermaid & Syntax Highlighting)
    renderer.code = function (code, lang) {
      const cleanLang = (lang || '').trim().toLowerCase();
      if (cleanLang === 'mermaid') {
        return `
          <div class="mermaid-wrapper">
            <button class="mermaid-zoom-btn" title="다이어그램 크게 보기">🔍 크게 보기</button>
            <div class="mermaid">${code}</div>
          </div>
        `;
      }

      const displayLang = cleanLang ? cleanLang.toUpperCase() : 'CODE';
      const escapedCode = escapeHtml(code);
      return `
        <div class="code-block-container">
          <div class="code-header">
            <span>${displayLang}</span>
            <button class="copy-btn">📋 복사</button>
          </div>
          <pre><code class="language-${cleanLang}">${escapedCode}</code></pre>
        </div>
      `;
    };

    // Custom Headings with Auto-IDs
    let headingCounter = 0;
    renderer.heading = function (text, level) {
      const id = `sec-${++headingCounter}`;
      if (level === 2 || level === 3) {
        return `
          <h${level} id="${id}">
            <a href="#${id}" class="heading-anchor">#</a> ${text}
          </h${level}>
        `;
      }
      return `<h${level} id="${id}">${text}</h${level}>`;
    };

    marked.setOptions({
      renderer: renderer,
      gfm: true,
      breaks: false,
      headerIds: false,
    });
  }

  function setupMermaid() {
    if (!window.mermaid) return;
    mermaid.initialize({
      startOnLoad: false,
      theme: state.theme === 'theme-dark' ? 'dark' : 'neutral',
      securityLevel: 'loose',
      fontFamily: 'var(--font-sans)',
    });
  }

  // --- Load & Render Chapter Content ---
  function loadCurrentPart() {
    const part = state.bookData[state.currentPartIndex];
    if (!part) return;

    // Update Header
    const partNum = `PART ${(state.currentPartIndex + 1).toString().padStart(2, '0')}`;
    const cleanTitle = part.title.replace(/^PART\s+\d+[\.:\s]*/i, '');
    if (els.currentPartBadge) els.currentPartBadge.textContent = partNum;
    if (els.currentPartTitle) els.currentPartTitle.textContent = cleanTitle;

    document.title = `${partNum}. ${cleanTitle} | 소프트웨어 엔지니어링 올인원`;

    // Process Alert Callouts in raw markdown
    let processedContent = part.content;
    processedContent = transformAlertBoxes(processedContent);

    // Render Markdown
    if (window.marked) {
      els.articleContent.innerHTML = marked.parse(processedContent);
    } else {
      els.articleContent.innerHTML = `<pre>${escapeHtml(processedContent)}</pre>`;
    }

    // Post Processing: Highlighting, Mermaid, TOC
    postProcessContent();

    // Update Footer Navigation
    updateFooterNav();

    // Update URL hash
    window.history.replaceState(null, '', `#${part.id}`);

    // Update Sidebar state
    updateSidebarActiveItem();

    // Scroll to Top
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  // Transform GitHub Markdown Alert Callouts
  function transformAlertBoxes(md) {
    const alertTypes = {
      NOTE: { class: 'alert-note', icon: 'ℹ️', title: '참고 (Note)' },
      TIP: { class: 'alert-tip', icon: '💡', title: '실전 팁 (Tip)' },
      IMPORTANT: { class: 'alert-important', icon: '📌', title: '핵심 지침 (Important)' },
      WARNING: { class: 'alert-warning', icon: '⚠️', title: '주의사항 (Warning)' },
      CAUTION: { class: 'alert-warning', icon: '🚨', title: '경고 (Caution)' },
    };

    return md.replace(
      />\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*\n([\s\S]*?)(?=(\n\s*\n|$))/gi,
      (match, type, content) => {
        const config = alertTypes[type.toUpperCase()] || alertTypes.NOTE;
        const cleanContent = content.replace(/^>\s?/gm, '').trim();
        return `\n<div class="alert-box ${config.class}"><div class="alert-title">${config.icon} ${config.title}</div>\n\n${cleanContent}\n</div>\n`;
      }
    );
  }

  function postProcessContent() {
    // 1. Highlight.js Syntax Highlighting
    if (window.hljs) {
      els.articleContent.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block);
      });
    }

    // 2. Attach Copy Code Button Handlers
    els.articleContent.querySelectorAll('.copy-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const code = btn.closest('.code-block-container').querySelector('code').innerText;
        navigator.clipboard.writeText(code).then(() => {
          btn.textContent = '✅ 복사됨!';
          btn.classList.add('copied');
          setTimeout(() => {
            btn.textContent = '📋 복사';
            btn.classList.remove('copied');
          }, 2000);
        });
      });
    });

    // 3. Render Mermaid Diagrams
    renderMermaidInView();

    // 4. Build in-page TOC
    buildInPageToc();
  }

  function renderMermaidInView() {
    if (!window.mermaid) return;
    const mermaidNodes = els.articleContent.querySelectorAll('.mermaid');
    if (mermaidNodes.length === 0) return;

    try {
      mermaid.run({
        nodes: mermaidNodes,
      });
    } catch (err) {
      console.warn('Mermaid render error:', err);
    }

    // Attach Zoom Button Handlers
    els.articleContent.querySelectorAll('.mermaid-zoom-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const svg = btn.closest('.mermaid-wrapper').querySelector('svg');
        if (svg) {
          openDiagramModal(svg.outerHTML);
        }
      });
    });
  }

  // --- Build In-Page Table of Contents (TOC) ---
  function buildInPageToc() {
    state.headings = [];
    const headings = els.articleContent.querySelectorAll('h2, h3');
    headings.forEach((h, index) => {
      const level = h.tagName.toLowerCase();
      const text = h.innerText.replace(/^#\s*/, '').trim();
      const id = h.id || `heading-${index}`;
      h.id = id;
      state.headings.push({ id, text, level });
    });

    if (!els.tocSheetBody) return;
    if (state.headings.length === 0) {
      els.tocSheetBody.innerHTML = '<p style="color:var(--text-muted); text-align:center;">목차 항목이 없습니다.</p>';
      return;
    }

    els.tocSheetBody.innerHTML = state.headings
      .map(
        (h) => `
        <a href="#${h.id}" class="toc-link ${h.level}">
          ${h.level === 'h3' ? '└ ' : ''}${escapeHtml(h.text)}
        </a>
      `
      )
      .join('');

    els.tocSheetBody.querySelectorAll('.toc-link').forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('href').replace('#', '');
        const targetEl = document.getElementById(targetId);
        if (targetEl) {
          closeTocSheet();
          targetEl.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });
  }

  // --- Footer & Bottom Navigation Update ---
  function updateFooterNav() {
    const total = state.bookData.length;
    const prevIdx = state.currentPartIndex - 1;
    const nextIdx = state.currentPartIndex + 1;

    // Previous Button / Card
    if (prevIdx >= 0) {
      const prevPart = state.bookData[prevIdx];
      const prevTitle = prevPart.title.replace(/^PART\s+\d+[\.:\s]*/i, '');
      if (els.footerPrevCard) {
        els.footerPrevCard.style.display = 'flex';
        els.footerPrevCard.querySelector('.footer-nav-label').textContent = `◀ PART ${prevIdx + 1}`;
        els.footerPrevCard.querySelector('.footer-nav-title').textContent = prevTitle;
      }
      if (els.bottomNavPrev) els.bottomNavPrev.style.opacity = '1';
    } else {
      if (els.footerPrevCard) els.footerPrevCard.style.display = 'none';
      if (els.bottomNavPrev) els.bottomNavPrev.style.opacity = '0.3';
    }

    // Next Button / Card
    if (nextIdx < total) {
      const nextPart = state.bookData[nextIdx];
      const nextTitle = nextPart.title.replace(/^PART\s+\d+[\.:\s]*/i, '');
      if (els.footerNextCard) {
        els.footerNextCard.style.display = 'flex';
        els.footerNextCard.querySelector('.footer-nav-label').textContent = `PART ${nextIdx + 1} ▶`;
        els.footerNextCard.querySelector('.footer-nav-title').textContent = nextTitle;
      }
      if (els.bottomNavNext) els.bottomNavNext.style.opacity = '1';
    } else {
      if (els.footerNextCard) els.footerNextCard.style.display = 'none';
      if (els.bottomNavNext) els.bottomNavNext.style.opacity = '0.3';
    }
  }

  function navigateToPart(index) {
    if (index >= 0 && index < state.bookData.length) {
      state.currentPartIndex = index;
      loadCurrentPart();
    }
  }

  // --- Full-Text Search Engine ---
  function handleSearch(query) {
    const q = query.trim().toLowerCase();
    if (!q) {
      els.searchModalResults.innerHTML = `
        <div style="text-align: center; color: var(--text-muted); padding: 40px 20px;">
          <p>검색어를 입력하시면 10개 파트 전체 본문에서 즉시 찾아드립니다.</p>
        </div>
      `;
      return;
    }

    const results = [];
    state.bookData.forEach((part, partIdx) => {
      const content = part.content;
      const lowerContent = content.toLowerCase();

      // Check title match
      const titleMatch = part.title.toLowerCase().includes(q);

      // Check section match
      let matchedSection = '';
      if (part.sections) {
        const sec = part.sections.find((s) => s.toLowerCase().includes(q));
        if (sec) matchedSection = sec;
      }

      // Check body occurrences
      let firstIndex = lowerContent.indexOf(q);
      if (firstIndex !== -1 || titleMatch) {
        let snippet = '';
        if (firstIndex !== -1) {
          const start = Math.max(0, firstIndex - 60);
          const end = Math.min(content.length, firstIndex + q.length + 80);
          snippet = content.substring(start, end).replace(/\n/g, ' ');
          if (start > 0) snippet = '...' + snippet;
          if (end < content.length) snippet = snippet + '...';
        } else {
          snippet = part.description || '';
        }

        // Highlight keyword in snippet
        const highlightedSnippet = snippet.replace(
          new RegExp(`(${escapeRegex(q)})`, 'gi'),
          '<mark>$1</mark>'
        );

        results.push({
          partIndex: partIdx,
          partNum: `PART ${(partIdx + 1).toString().padStart(2, '0')}`,
          title: part.title,
          matchedSection: matchedSection,
          snippet: highlightedSnippet,
        });
      }
    });

    if (results.length === 0) {
      els.searchModalResults.innerHTML = `
        <div style="text-align: center; color: var(--text-muted); padding: 40px 20px;">
          <p>'<strong>${escapeHtml(q)}</strong>'에 대한 검색 결과가 없습니다.</p>
        </div>
      `;
      return;
    }

    els.searchModalResults.innerHTML = results
      .map(
        (r) => `
        <div class="search-result-item" data-index="${r.partIndex}">
          <span class="search-res-part">${r.partNum}</span>
          <div class="search-res-title">${escapeHtml(r.matchedSection || r.title)}</div>
          <div class="search-res-snippet">${r.snippet}</div>
        </div>
      `
      )
      .join('');

    els.searchModalResults.querySelectorAll('.search-result-item').forEach((item) => {
      item.addEventListener('click', () => {
        const idx = parseInt(item.getAttribute('data-index'), 10);
        navigateToPart(idx);
        closeSearchModal();
      });
    });
  }

  function openSearchModal() {
    els.searchModalOverlay.classList.add('open');
    setTimeout(() => {
      els.searchModalInput.focus();
    }, 150);
  }

  function closeSearchModal() {
    els.searchModalOverlay.classList.remove('open');
  }

  // --- TOC Bottom Sheet ---
  function openTocSheet() {
    els.tocSheet.classList.add('open');
    els.sidebarBackdrop.classList.add('active');
  }

  function closeTocSheet() {
    els.tocSheet.classList.remove('open');
    els.sidebarBackdrop.classList.remove('active');
  }

  // --- Diagram Zoom Modal ---
  function openDiagramModal(svgHtml) {
    els.diagramModalContent.innerHTML = svgHtml;
    els.diagramModal.classList.add('open');
  }

  function closeDiagramModal() {
    els.diagramModal.classList.remove('open');
  }

  // --- Scroll Progress Bar ---
  function handleScroll() {
    const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = height > 0 ? (winScroll / height) * 100 : 0;
    if (els.progressBar) {
      els.progressBar.style.width = scrolled + '%';
    }
  }

  // --- Mobile Touch Swipe Gesture Navigation ---
  function setupTouchGestures() {
    let startX = 0;
    let startY = 0;

    document.addEventListener(
      'touchstart',
      (e) => {
        startX = e.changedTouches[0].screenX;
        startY = e.changedTouches[0].screenY;
      },
      { passive: true }
    );

    document.addEventListener(
      'touchend',
      (e) => {
        const diffX = e.changedTouches[0].screenX - startX;
        const diffY = e.changedTouches[0].screenY - startY;

        // Ignore if vertical swipe or inside horizontal scrollable container
        if (Math.abs(diffY) > Math.abs(diffX)) return;
        if (e.target.closest('.code-block-container, .table-wrapper, .mermaid-wrapper, .sidebar')) return;

        // Swipe threshold: 90px
        if (diffX < -90) {
          // Swipe Left -> Next Chapter
          navigateToPart(state.currentPartIndex + 1);
        } else if (diffX > 90) {
          // Swipe Right -> Prev Chapter (or open menu if on part 1)
          if (state.currentPartIndex > 0) {
            navigateToPart(state.currentPartIndex - 1);
          } else {
            openSidebar();
          }
        }
      },
      { passive: true }
    );
  }

  // --- Bind Event Handlers ---
  function bindEvents() {
    // Menu / Sidebar
    els.menuBtn?.addEventListener('click', openSidebar);
    els.closeSidebarBtn?.addEventListener('click', closeSidebar);
    els.sidebarBackdrop?.addEventListener('click', () => {
      closeSidebar();
      closeTocSheet();
    });

    // Theme & Font
    els.themeBtn?.addEventListener('click', cycleTheme);
    els.fontSizeBtn?.addEventListener('click', cycleFontSize);

    // Search
    els.searchBtn?.addEventListener('click', openSearchModal);
    els.searchModalClose?.addEventListener('click', closeSearchModal);
    els.searchModalOverlay?.addEventListener('click', (e) => {
      if (e.target === els.searchModalOverlay) closeSearchModal();
    });

    els.searchModalInput?.addEventListener('input', (e) => {
      clearTimeout(state.searchDebounce);
      state.searchDebounce = setTimeout(() => {
        handleSearch(e.target.value);
      }, 150);
    });

    els.sidebarSearchInput?.addEventListener('focus', () => {
      closeSidebar();
      openSearchModal();
    });

    // TOC
    els.tocBtn?.addEventListener('click', openTocSheet);
    els.tocSheetClose?.addEventListener('click', closeTocSheet);

    // Diagram Modal
    els.diagramModalClose?.addEventListener('click', closeDiagramModal);
    els.diagramModal?.addEventListener('click', (e) => {
      if (e.target === els.diagramModal) closeDiagramModal();
    });

    // Footer Navigation Cards
    els.footerPrevCard?.addEventListener('click', (e) => {
      e.preventDefault();
      navigateToPart(state.currentPartIndex - 1);
    });

    els.footerNextCard?.addEventListener('click', (e) => {
      e.preventDefault();
      navigateToPart(state.currentPartIndex + 1);
    });

    // Bottom Navigation Bar
    els.bottomNavPrev?.addEventListener('click', () => navigateToPart(state.currentPartIndex - 1));
    els.bottomNavNext?.addEventListener('click', () => navigateToPart(state.currentPartIndex + 1));
    els.bottomNavMenu?.addEventListener('click', openSidebar);
    els.bottomNavToc?.addEventListener('click', openTocSheet);
    els.bottomNavSearch?.addEventListener('click', openSearchModal);

    // Scroll Progress
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeSidebar();
        closeSearchModal();
        closeTocSheet();
        closeDiagramModal();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        openSearchModal();
      }
    });

    // Touch Gestures
    setupTouchGestures();
  }

  // --- Utilities ---
  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // Start app when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
