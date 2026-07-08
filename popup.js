// SEO Inspector — Popup Script

document.addEventListener('DOMContentLoaded', () => {
  // ──── DOM refs ────
  const statusEl = document.getElementById('status');
  const refreshBtn = document.getElementById('refresh');
  const actionBtn = document.getElementById('tab-action');

  const popoutBtn = document.getElementById('popout');
  const contentFieldsEl = document.getElementById('content-fields');
  const indexabilityFieldsEl = document.getElementById('indexability-fields');
  const schemaListEl = document.getElementById('schema-list');

  // Tab state
  let currentTab = 'content';
  let pageData = null; // { title, description, h1s, canonicalRaw, canonicalRendered, robots, hreflangs, schemas }
  let dataLoaded = false;

  // ──── Tab Switching ────
  document.querySelectorAll('.tabs-sidebar .tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tabs-sidebar .tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      currentTab = tab.dataset.tab;
      document.getElementById(`tab-${currentTab}`).classList.add('active');
      updateActionButton();
    });
  });

  // ──── Pop-out Button ────
  popoutBtn.addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) return;
      const popupUrl = chrome.runtime.getURL('popup.html') + '?tabId=' + tab.id;
      await chrome.windows.create({
        url: popupUrl,
        type: 'popup',
        width: 860,
        height: 640,
        left: 100,
        top: 100
      });
      window.close();
    } catch (e) {
      console.error('Popout failed:', e);
    }
  });

  // ──── Initial Load ────
  loadAllData();

  refreshBtn.addEventListener('click', loadAllData);
  actionBtn.addEventListener('click', handleActionClick);

  // ──── Main Load ────
  async function loadAllData() {
    showStatus('正在提取页面数据...', 'loading');
    dataLoaded = false;
    contentFieldsEl.innerHTML = '';
    indexabilityFieldsEl.innerHTML = '';
    schemaListEl.innerHTML = '';

    try {
      // Use ?tabId= from URL (pop-out window) or fallback to active tab
      const params = new URLSearchParams(location.search);
      let tab;
      const targetTabId = parseInt(params.get('tabId'), 10);
      if (targetTabId) {
        tab = await chrome.tabs.get(targetTabId);
      } else {
        [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      }
      if (!tab) {
        showStatus('无法获取当前标签页', 'error');
        return;
      }

      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: extractAllSeoData
      });

      pageData = results[0].result;
      dataLoaded = true;

      renderContentTab(pageData);
      renderIndexabilityTab(pageData);
      renderSchemaTab(pageData.schemas);

      showStatus('数据已加载', 'success');
      updateActionButton();

    } catch (error) {
      console.error('Error:', error);
      showStatus(`提取失败: ${error.message}`, 'error');
    }
  }

  // ──── Page-level extraction function ────
  function extractAllSeoData() {
    // --- Content ---
    const title = document.title || '';

    let description = '';
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) description = metaDesc.getAttribute('content') || '';

    const headings = { h1: [], h2: [], h3: [], h4: [], h5: [], h6: [] };
    document.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(el => {
      const text = el.textContent.trim();
      if (text) headings[el.tagName.toLowerCase()].push(text);
    });

    // --- Indexability: Raw HTML (from original server response) ---
    // We fetch the page source and parse the original <link> / <meta> tags
    // This avoids JS-mutated values
    let canonicalRaw = '';
    let robotsRaw = '';
    const hreflangsRaw = [];

    // Synchronous-ish: use a synchronous XMLHttpRequest (same-origin only)
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', location.href, false); // synchronous
      xhr.overrideMimeType('text/html');
      xhr.send();
      if (xhr.status === 200) {
        const raw = xhr.responseText;
        // Parse canonical from raw HTML
        const canonMatch = raw.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*\/?>/i);
        if (canonMatch) canonicalRaw = canonMatch[1];
        // Fallback: href before rel
        if (!canonMatch) {
          const canonMatch2 = raw.match(/<link[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["'][^>]*\/?>/i);
          if (canonMatch2) canonicalRaw = canonMatch2[1];
        }
        // Parse robots from raw HTML
        const robotsMatch = raw.match(/<meta[^>]*name=["']robots["'][^>]*content=["']([^"']*)["'][^>]*\/?>/i);
        if (robotsMatch) robotsRaw = robotsMatch[1];
        // Parse hreflangs from raw HTML
        const hreflangRegex = /<link[^>]*rel=["']alternate["'][^>]*hreflang=["']([^"']+)["'][^>]*href=["']([^"']+)["'][^>]*\/?>/gi;
        let m;
        while ((m = hreflangRegex.exec(raw)) !== null) {
          hreflangsRaw.push({ hreflang: m[1], href: m[2] });
        }
      }
    } catch (e) {
      // Fallback: use current DOM if fetch fails
      console.warn('Raw HTML fetch failed, fallback to current DOM', e);
    }

    // Fallback: if fetch failed (e.g. CORS), fall back to current DOM
    if (!canonicalRaw) {
      const link = document.querySelector('link[rel="canonical"]');
      if (link) canonicalRaw = link.getAttribute('href') || '';
    }
    if (!robotsRaw) {
      const meta = document.querySelector('meta[name="robots"]');
      if (meta) robotsRaw = meta.getAttribute('content') || '';
    }

    // --- Indexability: Rendered HTML (after JS mutations) ---
    const canonicalRendered = (() => {
      const link = document.querySelector('link[rel="canonical"]');
      return link ? (link.getAttribute('href') || '') : '';
    })();

    // --- Hreflangs: from current DOM (rendered) ---
    const hreflangsRendered = [];
    document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(link => {
      const hreflang = link.getAttribute('hreflang');
      const href = link.getAttribute('href');
      if (hreflang && href) {
        hreflangsRendered.push({ hreflang, href });
      }
    });

    // Merge: deduplicate by (hreflang, href), prefer raw first then add rendered
    const seen = new Set();
    const hreflangs = [];
    [...hreflangsRaw, ...hreflangsRendered].forEach(h => {
      const key = `${h.hreflang}|${h.href}`;
      if (seen.has(key)) return;
      seen.add(key);
      hreflangs.push(h);
    });

    // --- Schema Data ---
    const schemas = [];

    // 1. JSON-LD
    document.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
      try {
        const data = JSON.parse(script.textContent);
        const items = Array.isArray(data) ? data : [data];
        items.forEach(item => {
          schemas.push({
            type: item['@type'] || 'Unknown',
            format: 'JSON-LD',
            data: item
          });
        });
      } catch (e) { /* skip */ }
    });

    // 2. Microdata
    document.querySelectorAll('[itemscope]').forEach(item => {
      const type = item.getAttribute('itemtype')?.split('/').pop() || 'Unknown';
      const props = {};
      item.querySelectorAll('[itemprop]').forEach(prop => {
        const propName = prop.getAttribute('itemprop');
        const value = prop.getAttribute('content') ||
                      prop.getAttribute('href') ||
                      prop.textContent?.trim();
        if (propName && value) props[propName] = value;
      });
      if (Object.keys(props).length > 0) {
        schemas.push({ type, format: 'Microdata', data: { '@type': type, ...props } });
      }
    });

    // 3. RDFa
    document.querySelectorAll('[typeof]').forEach(item => {
      const type = item.getAttribute('typeof')?.split('/').pop() || 'Unknown';
      const props = {};
      item.querySelectorAll('[property]').forEach(prop => {
        const propName = prop.getAttribute('property');
        const value = prop.getAttribute('content') || prop.textContent?.trim();
        if (propName && value) props[propName] = value;
      });
      if (Object.keys(props).length > 0) {
        schemas.push({ type, format: 'RDFa', data: { '@type': type, ...props } });
      }
    });

    // --- Return all ---
    return {
      title,
      description,
      headings,
      canonicalRaw,
      canonicalRendered,
      robots: robotsRaw,
      hreflangs,
      schemas
    };
  }

  // ──── Render Content Tab ────
  function renderContentTab(data) {
    contentFieldsEl.innerHTML = '';

    const fields = [
      { label: 'Title', value: data.title, icon: '📌' },
      { label: 'Description', value: data.description, icon: '📝' },
    ];

    fields.forEach(f => {
      const group = document.createElement('div');
      group.className = 'field-group';
      group.innerHTML = `
        <div class="field-group-title"><span class="icon">${f.icon}</span>${f.label}</div>
        <div class="field-row">
          <div class="field-value ${f.value ? '' : 'empty'}">${escHtml(f.value) || '（空）'}</div>
        </div>
      `;
      contentFieldsEl.appendChild(group);
    });

    // Append all heading levels (H1-H6)
    const headingGroup = document.createElement('div');
    headingGroup.className = 'field-group';
    headingGroup.innerHTML = '<div class="field-group-title">🔤 Headings</div>';
    ['h1','h2','h3','h4','h5','h6'].forEach(level => {
      const list = data.headings[level];
      const items = list.length > 0
        ? list.map(t => `<span class="heading-item heading-${level}">${escHtml(t)}</span>`).join('')
        : '<span class="no-data">—</span>';
      const row = document.createElement('div');
      row.className = 'field-row';
      row.innerHTML = `<span class="field-label heading-label">${level.toUpperCase()}</span><span class="field-value">${items}</span>`;
      headingGroup.appendChild(row);
    });
    contentFieldsEl.appendChild(headingGroup);
  }

  // ──── Render Indexability Tab ────
  function renderIndexabilityTab(data) {
    indexabilityFieldsEl.innerHTML = '';

    // --- Canonical URL ---
    const canonicalGroup = document.createElement('div');
    canonicalGroup.className = 'field-group';
    canonicalGroup.innerHTML = `
      <div class="field-group-title"><span class="icon">🔗</span>Canonical URL</div>
      <div class="field-row">
        <div class="field-label"><span class="tag tag-raw">Raw HTML</span></div>
        <div class="field-value ${data.canonicalRaw ? '' : 'empty'}">${escHtml(data.canonicalRaw) || '（未设置）'}</div>
      </div>
      <div class="field-row">
        <div class="field-label"><span class="tag tag-rendered">Rendered</span></div>
        <div class="field-value ${data.canonicalRendered ? '' : 'empty'}">${escHtml(data.canonicalRendered) || '（未设置）'}</div>
      </div>
    `;
    indexabilityFieldsEl.appendChild(canonicalGroup);

    // --- Robots Meta ---
    const robotsGroup = document.createElement('div');
    robotsGroup.className = 'field-group';
    robotsGroup.innerHTML = `
      <div class="field-group-title"><span class="icon">🤖</span>Robots Meta Tag</div>
      <div class="field-row">
        <div class="field-value ${data.robots ? '' : 'empty'}">${escHtml(data.robots) || '（未设置）'}</div>
      </div>
    `;
    indexabilityFieldsEl.appendChild(robotsGroup);

    // --- Hreflangs ---
    const hflangGroup = document.createElement('div');
    hflangGroup.className = 'field-group';
    let hflangHtml = `<div class="field-group-title"><span class="icon">🌐</span>Hreflangs (${data.hreflangs.length})</div>`;

    if (data.hreflangs.length > 0) {
      hflangHtml += '<div class="hreflang-list">';
      data.hreflangs.forEach(h => {
        const label = h.hreflang === 'x-default' ? 'x-default' : h.hreflang;
        hflangHtml += `<div class="hreflang-row">
          <span class="hreflang-code">${escHtml(label)}</span>
          <span class="hreflang-url">${escHtml(h.href)}</span>
        </div>`;
      });
      hflangHtml += '</div>';
    } else {
      hflangHtml += '<div class="hreflang-empty">（未设置 Hreflang）</div>';
    }

    hflangGroup.innerHTML = hflangHtml;
    indexabilityFieldsEl.appendChild(hflangGroup);
  }

  // ──── Render Schema Tab (from existing code) ────
  function renderSchemaTab(schemas) {
    schemaListEl.innerHTML = '';

    if (!schemas || schemas.length === 0) {
      schemaListEl.innerHTML = `
        <div class="empty-state">
          <div class="icon">📭</div>
          <p>未发现结构化数据</p>
          <p class="hint">当前页面可能没有 Schema.org 标记</p>
        </div>
      `;
      return;
    }

    schemas.forEach((schema, index) => {
      const item = document.createElement('div');
      item.className = 'schema-item';
      item.dataset.index = index;

      const typeIcon = getTypeIcon(schema.type);

      item.innerHTML = `
        <div class="schema-header">
          <div class="schema-type">
            <span class="icon">${typeIcon}</span>
            <span class="type-name">${escHtml(schema.type)}</span>
            <span style="font-size: 11px; opacity: 0.7; margin-left: 4px;">${schema.format}</span>
          </div>
          <span class="toggle-icon">▼</span>
        </div>
        <div class="schema-content">
          <div class="json-viewer">${formatJson(schema.data)}</div>
        </div>
        <div class="schema-actions">
          <button class="btn-small btn-small-copy" data-action="copy">📋 复制</button>
        </div>
      `;

      const header = item.querySelector('.schema-header');
      header.addEventListener('click', () => {
        item.classList.toggle('collapsed');
      });

      const copyBtn = item.querySelector('[data-action="copy"]');
      copyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        copyToClipboard(JSON.stringify(schema.data, null, 2));
        copyBtn.textContent = '✅ 已复制';
        setTimeout(() => { copyBtn.textContent = '📋 复制'; }, 1500);
      });

      schemaListEl.appendChild(item);
    });
  }

  // ──── Format JSON with syntax highlighting ────
  function formatJson(obj, indent = 0) {
    const spaces = '  '.repeat(indent);
    const nextSpaces = '  '.repeat(indent + 1);

    if (obj === null) return '<span class="null">null</span>';
    if (typeof obj === 'boolean') return `<span class="boolean">${obj}</span>`;
    if (typeof obj === 'number') return `<span class="number">${obj}</span>`;
    if (typeof obj === 'string') {
      const s = escHtml(obj);
      return `<span class="string">"${s}"</span>`;
    }
    if (Array.isArray(obj)) {
      if (obj.length === 0) return '[]';
      const items = obj.map(item => nextSpaces + formatJson(item, indent + 1)).join(',\n');
      return `[\n${items}\n${spaces}]`;
    }
    if (typeof obj === 'object') {
      const keys = Object.keys(obj);
      if (keys.length === 0) return '{}';
      const items = keys.map(key => {
        const k = escHtml(key);
        return `${nextSpaces}<span class="key">"${k}"</span>: ${formatJson(obj[key], indent + 1)}`;
      }).join(',\n');
      return `{\n${items}\n${spaces}}`;
    }
    return escHtml(String(obj));
  }

  // ──── Utility: HTML escape ────
  function escHtml(str) {
    if (typeof str !== 'string') return String(str || '');
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ──── Schema type icon ────
  function getTypeIcon(type) {
    const icons = {
      'Article': '📄', 'NewsArticle': '📰', 'BlogPosting': '📝',
      'Product': '🛍️', 'Offer': '💰', 'Person': '👤', 'Organization': '🏢',
      'LocalBusiness': '🏪', 'Restaurant': '🍽️', 'Event': '📅',
      'Movie': '🎬', 'Book': '📚', 'Recipe': '🍳', 'Review': '⭐',
      'FAQPage': '❓', 'HowTo': '📋', 'BreadcrumbList': '🧭',
      'WebPage': '🌐', 'WebSite': '🔗', 'VideoObject': '🎥',
      'ImageObject': '🖼️', 'AudioObject': '🎵'
    };
    return icons[type] || '📦';
  }

  // ──── Action button (copies current tab data) ────
  function updateActionButton() {
    if (!dataLoaded || !pageData) {
      actionBtn.classList.add('hidden');
      return;
    }

    actionBtn.classList.remove('hidden');

    if (currentTab === 'content') {
      actionBtn.textContent = '📋 复制 Content';
    } else if (currentTab === 'indexability') {
      actionBtn.textContent = '📋 复制 Indexability';
    } else {
      const count = (pageData.schemas || []).length;
      if (count === 0) {
        actionBtn.textContent = '📋 复制全部';
      } else {
        actionBtn.textContent = `📋 复制 ${count} 个 Schema`;
      }
    }
  }

  function handleActionClick() {
    if (!dataLoaded || !pageData) return;

    let text = '';

    if (currentTab === 'content') {
      text = `Title: ${pageData.title}\nDescription: ${pageData.description}\n` +
        ['h1','h2','h3','h4','h5','h6'].map(l => {
          const list = pageData.headings[l];
          return `${l.toUpperCase()}: ${list.length > 0 ? list.join(' / ') : '—'}`;
        }).join('\n');
    } else if (currentTab === 'indexability') {
      text = `Canonical URL (Raw HTML): ${pageData.canonicalRaw || '(not set)'}\n`;
      text += `Canonical URL (Rendered): ${pageData.canonicalRendered || '(not set)'}\n`;
      text += `Robots Meta: ${pageData.robots || '(not set)'}\n\n`;
      if (pageData.hreflangs.length > 0) {
        text += 'Hreflangs:\n';
        pageData.hreflangs.forEach(h => {
          text += `  ${h.hreflang} → ${h.href}\n`;
        });
      } else {
        text += 'Hreflangs: (none)\n';
      }
    } else {
      // Schema tab — copy all as JSON
      const allData = pageData.schemas.map(s => s.data);
      text = JSON.stringify(allData, null, 2);
    }

    copyToClipboard(text);

    const original = actionBtn.textContent;
    actionBtn.textContent = '✅ 已复制';
    setTimeout(() => { actionBtn.textContent = original; }, 1500);
  }

  // ──── Status ────
  function showStatus(message, type) {
    statusEl.textContent = message;
    statusEl.className = `status ${type || ''}`;
  }

  // ──── Clipboard ────
  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  }
});
