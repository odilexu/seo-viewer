// Schema Markup Viewer - Popup Script

document.addEventListener('DOMContentLoaded', () => {
  const statusEl = document.getElementById('status');
  const schemaListEl = document.getElementById('schema-list');
  const refreshBtn = document.getElementById('refresh');
  const copyAllBtn = document.getElementById('copy-all');
  
  let schemas = [];
  
  // 初始化加载
  loadSchemas();
  
  // 刷新按钮
  refreshBtn.addEventListener('click', () => {
    loadSchemas();
  });
  
  // 复制全部按钮
  copyAllBtn.addEventListener('click', () => {
    if (schemas.length === 0) {
      showStatus('没有可复制的数据', 'empty');
      return;
    }
    
    const allJson = schemas.map(s => s.data).flat();
    copyToClipboard(JSON.stringify(allJson, null, 2));
    showStatus('已复制到剪贴板！', 'success');
  });
  
  // 加载 Schema 数据
  async function loadSchemas() {
    showStatus('正在提取结构化数据...', 'loading');
    schemaListEl.innerHTML = '';
    
    try {
      // 获取当前活动标签页
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab) {
        showStatus('无法获取当前标签页', 'error');
        return;
      }
      
      // 注入内容脚本并执行
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: extractSchemas
      });
      
      schemas = results[0].result || [];
      
      if (schemas.length === 0) {
        showStatus('当前页面未发现结构化数据', 'empty');
        showEmptyState();
        return;
      }
      
      showStatus(`发现 ${schemas.length} 个结构化数据块`, 'success');
      renderSchemas(schemas);
      
    } catch (error) {
      console.error('Error:', error);
      showStatus(`提取失败: ${error.message}`, 'error');
    }
  }
  
  // 提取页面中的 Schema 数据（在页面上下文中执行）
  function extractSchemas() {
    const schemas = [];
    
    // 1. JSON-LD 格式（最常见）
    const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
    jsonLdScripts.forEach((script, index) => {
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
      } catch (e) {
        console.warn('Failed to parse JSON-LD:', e);
      }
    });
    
    // 2. Microdata 格式
    const microdataItems = document.querySelectorAll('[itemscope]');
    microdataItems.forEach((item, index) => {
      const type = item.getAttribute('itemtype')?.split('/').pop() || 'Unknown';
      const props = {};
      
      item.querySelectorAll('[itemprop]').forEach(prop => {
        const propName = prop.getAttribute('itemprop');
        const value = prop.getAttribute('content') || 
                      prop.getAttribute('href') || 
                      prop.textContent?.trim();
        if (propName && value) {
          props[propName] = value;
        }
      });
      
      if (Object.keys(props).length > 0) {
        schemas.push({
          type: type,
          format: 'Microdata',
          data: {
            '@type': type,
            ...props
          }
        });
      }
    });
    
    // 3. RDFa 格式
    const rdfaTypes = document.querySelectorAll('[typeof]');
    rdfaTypes.forEach((item, index) => {
      const type = item.getAttribute('typeof')?.split('/').pop() || 'Unknown';
      const props = {};
      
      item.querySelectorAll('[property]').forEach(prop => {
        const propName = prop.getAttribute('property');
        const value = prop.getAttribute('content') || prop.textContent?.trim();
        if (propName && value) {
          props[propName] = value;
        }
      });
      
      if (Object.keys(props).length > 0) {
        schemas.push({
          type: type,
          format: 'RDFa',
          data: {
            '@type': type,
            ...props
          }
        });
      }
    });
    
    return schemas;
  }
  
  // 渲染 Schema 列表
  function renderSchemas(schemas) {
    schemaListEl.innerHTML = '';
    
    schemas.forEach((schema, index) => {
      const item = document.createElement('div');
      item.className = 'schema-item';
      item.dataset.index = index;
      
      const typeIcon = getTypeIcon(schema.type);
      
      item.innerHTML = `
        <div class="schema-header">
          <div class="schema-type">
            <span class="icon">${typeIcon}</span>
            <span class="type-name">${schema.type}</span>
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
      
      // 折叠/展开
      const header = item.querySelector('.schema-header');
      header.addEventListener('click', () => {
        item.classList.toggle('collapsed');
      });
      
      // 复制单个
      const copyBtn = item.querySelector('[data-action="copy"]');
      copyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        copyToClipboard(JSON.stringify(schema.data, null, 2));
        copyBtn.textContent = '✅ 已复制';
        setTimeout(() => {
          copyBtn.textContent = '📋 复制';
        }, 1500);
      });
      
      schemaListEl.appendChild(item);
    });
  }
  
  // 格式化 JSON 并添加语法高亮
  function formatJson(obj, indent = 0) {
    const spaces = '  '.repeat(indent);
    const nextSpaces = '  '.repeat(indent + 1);
    
    if (obj === null) {
      return '<span class="null">null</span>';
    }
    
    if (typeof obj === 'boolean') {
      return `<span class="boolean">${obj}</span>`;
    }
    
    if (typeof obj === 'number') {
      return `<span class="number">${obj}</span>`;
    }
    
    if (typeof obj === 'string') {
      const escaped = obj.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return `<span class="string">"${escaped}"</span>`;
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
        const escapedKey = key.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return `${nextSpaces}<span class="key">"${escapedKey}"</span>: ${formatJson(obj[key], indent + 1)}`;
      }).join(',\n');
      return `{\n${items}\n${spaces}}`;
    }
    
    return String(obj);
  }
  
  // 获取类型图标
  function getTypeIcon(type) {
    const icons = {
      'Article': '📄',
      'NewsArticle': '📰',
      'BlogPosting': '📝',
      'Product': '🛍️',
      'Offer': '💰',
      'Person': '👤',
      'Organization': '🏢',
      'LocalBusiness': '🏪',
      'Restaurant': '🍽️',
      'Event': '📅',
      'Movie': '🎬',
      'Book': '📚',
      'Recipe': '🍳',
      'Review': '⭐',
      'FAQPage': '❓',
      'HowTo': '📋',
      'BreadcrumbList': '🧭',
      'WebPage': '🌐',
      'WebSite': '🔗',
      'VideoObject': '🎥',
      'ImageObject': '🖼️',
      'AudioObject': '🎵'
    };
    return icons[type] || '📦';
  }
  
  // 显示状态
  function showStatus(message, type = 'loading') {
    statusEl.textContent = message;
    statusEl.className = `status ${type}`;
  }
  
  // 显示空状态
  function showEmptyState() {
    schemaListEl.innerHTML = `
      <div class="empty-state">
        <div class="icon">📭</div>
        <p>未发现结构化数据</p>
        <p class="hint">当前页面可能没有 Schema.org 标记</p>
      </div>
    `;
  }
  
  // 复制到剪贴板
  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      // Fallback for older browsers
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
