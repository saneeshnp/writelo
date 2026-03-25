document.addEventListener('DOMContentLoaded', () => {
  const textarea = document.getElementById('editor');
  const statusIndicator = document.getElementById('status-indicator');
  const wordCountTitle = document.getElementById('word-count');
  const charCountTitle = document.getElementById('char-count');
  const copyBtn = document.getElementById('copy-btn');
  const clearBtn = document.getElementById('clear-btn');
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toast-message');
  const scrollTopBtn = document.getElementById('scroll-top-btn');
  const undoBtn = document.getElementById('undo-btn');

  const settingsBtn = document.getElementById('settings-btn');
  const closeSettingsBtn = document.getElementById('close-settings-btn');
  const settingsModal = document.getElementById('settings-modal');
  const themeBtns = document.querySelectorAll('.theme-btn');
  const colorOptionsContainer = document.getElementById('color-options');

  const previewBtn = document.getElementById('preview-btn');
  const previewModal = document.getElementById('preview-modal');
  const closePreviewBtn = document.getElementById('close-preview-btn');
  const previewContent = document.getElementById('preview-content');

  // Find & Replace Dom Elements
  const findBtn = document.getElementById('find-btn');
  const findReplacePanel = document.getElementById('find-replace-panel');
  const findInput = document.getElementById('find-input');
  const replaceInput = document.getElementById('replace-input');
  const findPrevBtn = document.getElementById('find-prev-btn');
  const findNextBtn = document.getElementById('find-next-btn');
  const closeFindBtn = document.getElementById('close-find-btn');
  const replaceBtn = document.getElementById('replace-btn');
  const replaceAllBtn = document.getElementById('replace-all-btn');
  const findStatus = document.getElementById('find-status');
  const editorBackdrop = document.getElementById('editor-backdrop');

  let searchMatches = [];
  let currentMatchIndex = -1;

  // Context Menu Dom Elements
  const tabContextMenu = document.getElementById('tab-context-menu');
  const menuDuplicate = document.getElementById('menu-duplicate');
  const menuClose = document.getElementById('menu-close');
  let contextMenuTargetId = null;

  const STORAGE_KEY = 'jotdown_offline_editor_content';
  const TABS_STORAGE_KEY = 'jotdown_tabs_content';
  let saveTimeout;

  let tabs = [];
  let activeTabId = null;
  const tabHistories = new Map();

  function pushHistory(tabId, content) {
    if (!tabHistories.has(tabId)) {
      tabHistories.set(tabId, { stack: [content], index: 0 });
      return;
    }
    const h = tabHistories.get(tabId);

    // Don't push if the last saved state is identical
    if (h.stack[h.index] === content) return;

    // Truncate stack if we are in the middle of history
    if (h.index < h.stack.length - 1) {
      h.stack = h.stack.slice(0, h.index + 1);
    }

    h.stack.push(content);
    h.index++;

    // Cap history limit to 50 items
    if (h.stack.length > 50) {
      h.stack.shift();
      h.index--;
    }
  }

  function handleUndo() {
    if (!activeTabId || !tabHistories.has(activeTabId)) return;
    const h = tabHistories.get(activeTabId);

    // Check if there is a previous state
    if (h.index > 0) {
      h.index--;
      textarea.value = h.stack[h.index];

      const activeTab = tabs.find(t => t.id === activeTabId);
      if (activeTab) {
        activeTab.content = textarea.value;
      }
      saveTabsData();
      updateCounts();
      setStatus(true);
      showToast('Undo successful', true);
    } else {
      showToast('Nothing left to undo', false);
    }
  }

  // 1. Initial Load from LocalStorage
  function initializeTabs() {
    const savedTabsJSON = localStorage.getItem(TABS_STORAGE_KEY);
    if (savedTabsJSON) {
      const savedData = JSON.parse(savedTabsJSON);
      tabs = savedData.tabs || [];
      activeTabId = savedData.activeTabId;
    } else {
      // Migrate from old storage
      const oldContent = localStorage.getItem(STORAGE_KEY);
      if (oldContent !== null) {
        tabs = [{ id: generateId(), name: 'Notes', content: oldContent }];
        activeTabId = tabs[0].id;
        localStorage.removeItem(STORAGE_KEY);
      } else {
        tabs = [{ id: generateId(), name: 'Untitled 1', content: '' }];
        activeTabId = tabs[0].id;
      }
    }

    // Safety check
    if (tabs.length === 0) {
      tabs = [{ id: generateId(), name: 'Untitled 1', content: '' }];
      activeTabId = tabs[0].id;
    }
    if (!tabs.find(t => t.id === activeTabId)) {
      activeTabId = tabs[0].id;
    }

    const targetId = activeTabId;
    activeTabId = null; // Force switch on first load
    switchTab(targetId);
  }

  function generateId() {
    return Math.random().toString(36).substring(2, 9);
  }

  function saveTabsData() {
    localStorage.setItem(TABS_STORAGE_KEY, JSON.stringify({ tabs, activeTabId }));
  }

  function switchTab(id) {
    if (activeTabId === id) return;

    // Save current tab content before switching
    if (activeTabId) {
      const currentTab = tabs.find(t => t.id === activeTabId);
      if (currentTab) currentTab.content = textarea.value;
    }

    activeTabId = id;
    const tab = tabs.find(t => t.id === id);
    if (tab) {
      textarea.value = tab.content;
      if (!tabHistories.has(id)) {
        pushHistory(id, tab.content);
      }
      updateCounts();
    }
    renderTabs();
    saveTabsData();
    if (findReplacePanel.style.display === 'flex') {
      executeSearch(false);
    }
  }

  function renderTabs() {
    const tabsList = document.getElementById('tabs-list');
    tabsList.innerHTML = '';

    tabs.forEach(tab => {
      const tabEl = document.createElement('div');
      tabEl.className = `tab-item ${tab.id === activeTabId ? 'active' : ''}`;

      const nameEl = document.createElement('span');
      nameEl.className = 'tab-name';
      nameEl.textContent = tab.name;
      nameEl.ondblclick = () => {
        nameEl.contentEditable = true;
        nameEl.focus();
        const range = document.createRange();
        range.selectNodeContents(nameEl);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      };

      nameEl.onblur = () => {
        nameEl.contentEditable = false;
        tab.name = nameEl.textContent.trim() || 'Untitled';
        nameEl.textContent = tab.name;
        saveTabsData();
      };

      nameEl.onkeydown = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          nameEl.blur();
        }
      };

      tabEl.onclick = (e) => {
        if (e.target.closest('.close-tab-btn') == null) {
          switchTab(tab.id);
        }
      };

      tabEl.oncontextmenu = (e) => {
        e.preventDefault();
        contextMenuTargetId = tab.id;
        tabContextMenu.style.display = 'flex';
        tabContextMenu.style.left = `${e.clientX}px`;
        tabContextMenu.style.top = `${e.clientY}px`;
      };

      tabEl.appendChild(nameEl);

      if (tabs.length > 1) {
        const closeBtn = document.createElement('div');
        closeBtn.className = 'close-tab-btn';
        closeBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
        closeBtn.onclick = (e) => {
          e.stopPropagation();
          closeTab(tab.id);
        };
        tabEl.appendChild(closeBtn);
      }

      tabsList.appendChild(tabEl);
    });
  }

  function closeTab(id) {
    if (tabs.length <= 1) return;
    const index = tabs.findIndex(t => t.id === id);
    if (index === -1) return;

    if (confirm(`Are you sure you want to close "${tabs[index].name}"?`)) {
      tabs.splice(index, 1);

      if (activeTabId === id) {
        const newIndex = Math.min(index, tabs.length - 1);
        switchTab(tabs[newIndex].id);
      } else {
        renderTabs();
        saveTabsData();
      }
    }
  }

  // Hide context menu when clicking outside
  document.addEventListener('click', (e) => {
    if (tabContextMenu.style.display === 'flex' && !tabContextMenu.contains(e.target)) {
      tabContextMenu.style.display = 'none';
      contextMenuTargetId = null;
    }
  });

  // Context Menu Actions
  if (menuDuplicate) {
    menuDuplicate.addEventListener('click', () => {
      if (!contextMenuTargetId) return;
      const targetTab = tabs.find(t => t.id === contextMenuTargetId);
      if (targetTab) {
        const newTab = {
          id: generateId(),
          name: `${targetTab.name} (Copy)`,
          content: targetTab.content
        };
        tabs.push(newTab);
        switchTab(newTab.id);
      }
      tabContextMenu.style.display = 'none';
      contextMenuTargetId = null;
    });
  }

  if (menuClose) {
    menuClose.addEventListener('click', () => {
      if (contextMenuTargetId) {
        closeTab(contextMenuTargetId);
      }
      tabContextMenu.style.display = 'none';
      contextMenuTargetId = null;
    });
  }

  const addTabBtn = document.getElementById('add-tab-btn');
  if (addTabBtn) {
    addTabBtn.onclick = () => {
      const newTab = {
        id: generateId(),
        name: `Untitled ${tabs.length + 1}`,
        content: ''
      };
      tabs.push(newTab);
      switchTab(newTab.id);
    };
  }

  initializeTabs();

  // 2. Event Listeners for Input 
  textarea.addEventListener('input', () => {
    updateCounts();
    setStatus(false);

    // Debounce the save to prevent excessive storage operations
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      const activeTab = tabs.find(t => t.id === activeTabId);
      if (activeTab) {
        activeTab.content = textarea.value;
      }
      pushHistory(activeTabId, textarea.value);
      saveTabsData();
      setStatus(true);
      if (findReplacePanel.style.display === 'flex') {
        executeSearch(false);
      }
    }, 600);
  });

  // Handle Ctrl+Z Undo bindings
  textarea.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault();
      handleUndo();
    }
  });

  if (undoBtn) {
    undoBtn.addEventListener('click', handleUndo);
  }

  // Scroll to Top Logic
  textarea.addEventListener('scroll', () => {
    if (textarea.scrollTop > 200) {
      scrollTopBtn.classList.add('visible');
    } else {
      scrollTopBtn.classList.remove('visible');
    }
  });

  if (scrollTopBtn) {
    scrollTopBtn.addEventListener('click', () => {
      textarea.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }

  // Syncing across tabs
  const tabChannel = new BroadcastChannel('jotdown_tabs');
  const syncIndicator = document.getElementById('sync-indicator');
  const myTabId = Math.random().toString(36).substring(2, 9);
  const activeTabs = new Set();

  function updateSyncUI() {
    if (activeTabs.size > 0) {
      syncIndicator.style.display = 'flex';
      syncIndicator.querySelector('.sync-text').textContent = `Syncing (${activeTabs.size + 1} tabs)`;
    } else {
      syncIndicator.style.display = 'none';
    }
  }

  tabChannel.postMessage({ type: 'JOIN', id: myTabId });

  tabChannel.onmessage = (e) => {
    if (e.data.type === 'JOIN') {
      activeTabs.add(e.data.id);
      updateSyncUI();
      tabChannel.postMessage({ type: 'ACK', id: myTabId, target: e.data.id });
    } else if (e.data.type === 'ACK' && e.data.target === myTabId) {
      activeTabs.add(e.data.id);
      updateSyncUI();
    } else if (e.data.type === 'LEAVE') {
      activeTabs.delete(e.data.id);
      updateSyncUI();
    }
  };

  window.addEventListener('beforeunload', () => {
    tabChannel.postMessage({ type: 'LEAVE', id: myTabId });
  });

  window.addEventListener('storage', (e) => {
    if (e.key === TABS_STORAGE_KEY) {
      if (e.newValue !== null) {
        const savedData = JSON.parse(e.newValue);
        tabs = savedData.tabs || [];

        // Ensure activeTabId points to a valid tab
        if (!tabs.find(t => t.id === activeTabId)) {
          activeTabId = tabs[0].id;
        }

        const currentTab = tabs.find(t => t.id === activeTabId);
        if (currentTab && currentTab.content !== textarea.value) {
          textarea.value = currentTab.content;
          updateCounts();
          setStatus(true);
        }
        renderTabs();
      }
    }
  });

  // 3. Button Actions
  if (previewBtn) {
    previewBtn.addEventListener('click', () => {
      const text = textarea.value;
      if (typeof marked !== 'undefined') {
        previewContent.innerHTML = marked.parse(text);
      } else {
        previewContent.innerHTML = '<p style="color:red">Error: Markdown parser didn\'t load properly.</p>';
      }
      previewModal.classList.add('show');
    });
  }

  if (closePreviewBtn) {
    closePreviewBtn.addEventListener('click', () => {
      previewModal.classList.remove('show');
    });
  }

  if (previewModal) {
    previewModal.addEventListener('click', (e) => {
      // Close only if click is directly on overlay, not its children
      if (e.target === previewModal) {
        previewModal.classList.remove('show');
      }
    });
  }

  copyBtn.addEventListener('click', async () => {
    const textToCopy = textarea.value;
    if (!textToCopy) {
      showToast('Editor is empty!', false);
      return;
    }

    try {
      await navigator.clipboard.writeText(textToCopy);
      showToast('Copied to clipboard!', true);
    } catch (err) {
      // Fallback for older browsers
      textarea.select();
      document.execCommand('copy');
      showToast('Copied to clipboard!', true);
    }
  });

  clearBtn.addEventListener('click', () => {
    if (textarea.value.trim() === '') return;

    if (confirm('Are you sure you want to clear all text in this tab? This action cannot be undone.')) {
      textarea.value = '';
      const activeTab = tabs.find(t => t.id === activeTabId);
      if (activeTab) activeTab.content = '';
      saveTabsData();
      updateCounts();
      showToast('Text cleared', true);
      textarea.focus();
      setStatus(true);
    }
  });

  // 4. Utility Functions

  function updateCounts() {
    const text = textarea.value;
    const chars = text.length;
    // Split by whitespace to accurately count words
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;

    charCountTitle.textContent = `${chars} Characters`;
    wordCountTitle.textContent = `${words} Words`;
  }

  function setStatus(isSaved) {
    if (isSaved) {
      statusIndicator.classList.add('saved');
      statusIndicator.classList.remove('saving');
      statusIndicator.title = 'Saved';
    } else {
      statusIndicator.classList.remove('saved');
      statusIndicator.classList.add('saving');
      statusIndicator.title = 'Saving...';
    }
  }

  let toastTimeout;
  function showToast(message, isSuccess = true) {
    toastMessage.textContent = message;

    // Change icon colors based on success/error
    const svgIcon = toast.querySelector('svg');
    if (isSuccess) {
      svgIcon.style.stroke = '#10b981'; // Success Green
    } else {
      svgIcon.style.stroke = '#f43f5e'; // Error Red
    }

    toast.classList.add('show');

    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }
  // 5. Settings Logic
  const SETTINGS_KEY = 'jotdown_settings';
  const COLORS = [
    { name: 'Purple', value: '#8b5cf6', gradient: 'linear-gradient(135deg, #a78bfa 0%, #818cf8 100%)', svgStart: '#a78bfa', svgEnd: '#818cf8' },
    { name: 'Blue',   value: '#3b82f6', gradient: 'linear-gradient(135deg, #60a5fa 0%, #818cf8 100%)', svgStart: '#60a5fa', svgEnd: '#818cf8' },
    { name: 'Green',  value: '#10b981', gradient: 'linear-gradient(135deg, #34d399 0%, #818cf8 100%)', svgStart: '#34d399', svgEnd: '#818cf8' },
    { name: 'Rose',   value: '#f43f5e', gradient: 'linear-gradient(135deg, #fb7185 0%, #818cf8 100%)', svgStart: '#fb7185', svgEnd: '#818cf8' },
    { name: 'Amber',  value: '#f59e0b', gradient: 'linear-gradient(135deg, #fcd34d 0%, #818cf8 100%)', svgStart: '#fcd34d', svgEnd: '#818cf8' },
    { name: 'Teal',   value: '#14b8a6', gradient: 'linear-gradient(135deg, #4CAF50 0%, #818cf8 100%)', svgStart: '#4CAF50', svgEnd: '#818cf8' },
    { name: 'Grey',   value: '#9ca3af', gradient: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%)', svgStart: '#ffffff', svgEnd: '#cbd5e1' }
  ];

  let currentSettings = {
    theme: 'dark',
    accentColor: '#3b82f6',
    findAndReplace: false,
    markdownPreview: false
  };

  function loadSettings() {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      currentSettings = { ...currentSettings, ...JSON.parse(saved) };
    }
    applySettings();
  }

  function saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(currentSettings));
  }

  function applySettings() {
    // Theme
    if (currentSettings.theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else if (currentSettings.theme === 'ultra-dark') {
      document.documentElement.setAttribute('data-theme', 'ultra-dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }

    themeBtns.forEach(btn => {
      if (btn.dataset.themeValue === currentSettings.theme) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Accent Color
    document.documentElement.style.setProperty('--accent-color', currentSettings.accentColor);
    document.documentElement.style.setProperty('--accent-hover', currentSettings.accentColor);

    const activeColor = COLORS.find(c => c.value === currentSettings.accentColor);
    if (activeColor) {
      document.documentElement.style.setProperty('--brand-gradient', activeColor.gradient);
      document.documentElement.setAttribute('data-accent', activeColor.name.toLowerCase());
      document.querySelectorAll('#gradient stop, #about-gradient stop').forEach((stop, i) => {
        stop.setAttribute('stop-color', i % 2 === 0 ? activeColor.svgStart : activeColor.svgEnd);
      });
    }

    document.querySelectorAll('.color-btn').forEach(btn => {
      if (btn.dataset.color === currentSettings.accentColor) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Find & Replace feature flag
    const findReplaceCb = document.getElementById('find-replace-toggle');
    if (findReplaceCb) {
      findReplaceCb.checked = !!currentSettings.findAndReplace;
    }
    if (findBtn) {
      findBtn.style.display = currentSettings.findAndReplace ? '' : 'none';
    }
    if (!currentSettings.findAndReplace && findReplacePanel.style.display === 'flex') {
      findReplacePanel.style.display = 'none';
      searchMatches = [];
      currentMatchIndex = -1;
      clearBackdrop();
    }

    // Markdown Preview feature flag
    const markdownPreviewCb = document.getElementById('markdown-preview-toggle');
    if (markdownPreviewCb) {
      markdownPreviewCb.checked = !!currentSettings.markdownPreview;
    }
    if (previewBtn) {
      previewBtn.style.display = currentSettings.markdownPreview ? '' : 'none';
    }
    if (!currentSettings.markdownPreview && previewModal && previewModal.classList.contains('show')) {
      previewModal.classList.remove('show');
    }
  }

  // Initialize colors
  COLORS.forEach(color => {
    const btn = document.createElement('button');
    btn.className = 'color-btn';
    btn.style.backgroundColor = color.value;
    btn.dataset.color = color.value;
    btn.title = color.name;
    btn.addEventListener('click', () => {
      currentSettings.accentColor = color.value;
      saveSettings();
      applySettings();
    });
    colorOptionsContainer.appendChild(btn);
  });

  // Theme toggle
  themeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      currentSettings.theme = btn.dataset.themeValue;
      saveSettings();
      applySettings();
    });
  });

  // Settings modal open/close
  settingsBtn.addEventListener('click', () => {
    settingsModal.classList.add('show');
  });

  closeSettingsBtn.addEventListener('click', () => {
    settingsModal.classList.remove('show');
  });

  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
      settingsModal.classList.remove('show');
    }
  });

  // About modal open/close
  const aboutBtn = document.getElementById('about-btn');
  const aboutModal = document.getElementById('about-modal');
  const closeAboutBtn = document.getElementById('close-about-btn');

  aboutBtn.addEventListener('click', () => {
    aboutModal.classList.add('show');
  });

  closeAboutBtn.addEventListener('click', () => {
    aboutModal.classList.remove('show');
  });

  aboutModal.addEventListener('click', (e) => {
    if (e.target === aboutModal) {
      aboutModal.classList.remove('show');
    }
  });

  // Help modal open/close
  const helpBtn = document.getElementById('help-btn');
  const helpModal = document.getElementById('help-modal');
  const closeHelpBtn = document.getElementById('close-help-btn');

  helpBtn.addEventListener('click', () => {
    helpModal.classList.add('show');
  });

  closeHelpBtn.addEventListener('click', () => {
    helpModal.classList.remove('show');
  });

  helpModal.addEventListener('click', (e) => {
    if (e.target === helpModal) {
      helpModal.classList.remove('show');
    }
  });

  const findReplaceCb = document.getElementById('find-replace-toggle');
  if (findReplaceCb) {
    findReplaceCb.addEventListener('change', () => {
      currentSettings.findAndReplace = findReplaceCb.checked;
      saveSettings();
      applySettings();
    });
  }

  const markdownPreviewCb = document.getElementById('markdown-preview-toggle');
  if (markdownPreviewCb) {
    markdownPreviewCb.addEventListener('change', () => {
      currentSettings.markdownPreview = markdownPreviewCb.checked;
      saveSettings();
      applySettings();
    });
  }

  // Find & Replace Logic
  function clearBackdrop() {
    if (editorBackdrop) editorBackdrop.innerHTML = '';
  }

  function executeSearch(focusMatch = true) {
    const query = findInput.value;
    searchMatches = [];
    currentMatchIndex = -1;

    if (!query) {
      findStatus.textContent = 'No matches';
      findPrevBtn.disabled = true;
      findNextBtn.disabled = true;
      replaceBtn.disabled = true;
      replaceAllBtn.disabled = true;
        clearBackdrop();
      return;
    }

    const text = textarea.value;
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    let startIndex = 0;

    while ((startIndex = lowerText.indexOf(lowerQuery, startIndex)) > -1) {
      searchMatches.push({
        start: startIndex,
        end: startIndex + query.length
      });
      startIndex += query.length;
    }

    if (searchMatches.length > 0) {
      currentMatchIndex = 0;
      updateSearchUI(focusMatch);
    } else {
      findStatus.textContent = '0/0';
      findPrevBtn.disabled = true;
      findNextBtn.disabled = true;
      replaceBtn.disabled = true;
      replaceAllBtn.disabled = true;
      clearBackdrop();
    }
  }

  function updateSearchUI(focusMatch = true) {
    if (searchMatches.length > 0) {
      findStatus.textContent = `${currentMatchIndex + 1}/${searchMatches.length}`;
      findPrevBtn.disabled = false;
      findNextBtn.disabled = false;
      replaceBtn.disabled = false;
      replaceAllBtn.disabled = false;

      if (focusMatch) {
        const match = searchMatches[currentMatchIndex];
        // Focus textarea so browser scrolls to and selects the match,
        // then defer returning focus to findInput so the scroll completes first.
        textarea.focus();
        textarea.setSelectionRange(match.start, match.end);
        setTimeout(() => findInput.focus(), 0);
      }
    }
  }

  findInput.addEventListener('input', () => executeSearch(false));

  findInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        if (searchMatches.length > 0) {
          currentMatchIndex = (currentMatchIndex - 1 + searchMatches.length) % searchMatches.length;
          updateSearchUI();
        }
      } else {
        if (searchMatches.length > 0) {
          currentMatchIndex = (currentMatchIndex + 1) % searchMatches.length;
          updateSearchUI();
        }
      }
    }
  });

  findNextBtn.addEventListener('click', () => {
    if (searchMatches.length > 0) {
      currentMatchIndex = (currentMatchIndex + 1) % searchMatches.length;
      updateSearchUI();
    }
  });

  findPrevBtn.addEventListener('click', () => {
    if (searchMatches.length > 0) {
      currentMatchIndex = (currentMatchIndex - 1 + searchMatches.length) % searchMatches.length;
      updateSearchUI();
    }
  });

  replaceBtn.addEventListener('click', () => {
    if (searchMatches.length > 0 && currentMatchIndex >= 0) {
      const match = searchMatches[currentMatchIndex];
      const replacement = replaceInput.value;
      const text = textarea.value;
      const newText = text.substring(0, match.start) + replacement + text.substring(match.end);

      textarea.value = newText;

      const activeTab = tabs.find(t => t.id === activeTabId);
      if (activeTab) activeTab.content = newText;
      pushHistory(activeTabId, newText);
      saveTabsData();
      updateCounts();

      executeSearch();
    }
  });

  replaceAllBtn.addEventListener('click', () => {
    if (searchMatches.length > 0) {
      const query = findInput.value;
      const replacement = replaceInput.value;
      if (!query) return;

      const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(safeQuery, 'gi');

      const newText = textarea.value.replace(regex, replacement);

      textarea.value = newText;
      const activeTab = tabs.find(t => t.id === activeTabId);
      if (activeTab) activeTab.content = newText;
      pushHistory(activeTabId, newText);
      saveTabsData();
      updateCounts();

      showToast('Replaced all occurrences', true);
      executeSearch();
    }
  });

  closeFindBtn.addEventListener('click', () => {
    findReplacePanel.style.display = 'none';
    searchMatches = [];
    currentMatchIndex = -1;
    clearBackdrop();
    textarea.focus();
  });

  if (findBtn) {
    findBtn.addEventListener('click', () => {
      findReplacePanel.style.display = 'flex';
      findInput.focus();
      findInput.select();
      if (findInput.value) {
        executeSearch();
      }
    });
  }

  // Ctrl+F shortcut
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      if (!currentSettings.findAndReplace) return; // let browser handle native search
      e.preventDefault();
      findReplacePanel.style.display = 'flex';
      findInput.focus();
      findInput.select();
      if (findInput.value) {
        executeSearch();
      }
    }
  });

  // Export / Import Logic
  const exportBtn = document.getElementById('export-btn');
  const importBtn = document.getElementById('import-btn');
  const importFileInput = document.getElementById('import-file-input');
  const includeSettingsToggle = document.getElementById('include-settings-toggle');

  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      // Make sure the active tab's latest content is captured before export
      const activeTab = tabs.find(t => t.id === activeTabId);
      if (activeTab) activeTab.content = textarea.value;

      const exportObj = {
        version: 1,
        exportedAt: new Date().toISOString(),
        tabs: tabs,
        activeTabId: activeTabId
      };

      if (includeSettingsToggle && includeSettingsToggle.checked) {
        exportObj.settings = currentSettings;
      }

      const json = JSON.stringify(exportObj, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `writelo-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`Exported ${tabs.length} tab(s)!`, true);
    });
  }

  if (importBtn) {
    importBtn.addEventListener('click', () => {
      if (importFileInput) importFileInput.click();
    });
  }

  if (importFileInput) {
    importFileInput.addEventListener('change', () => {
      const file = importFileInput.files[0];
      if (!file) return;
      // Reset so the same file can be re-imported if needed
      importFileInput.value = '';

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          if (!data.tabs || !Array.isArray(data.tabs) || data.tabs.length === 0) {
            showToast('Invalid backup file', false);
            return;
          }

          if (!confirm(`Replace all current notes with ${data.tabs.length} tab(s) from the backup? This cannot be undone.`)) return;

          tabs = data.tabs;
          activeTabId = data.activeTabId && data.tabs.find(t => t.id === data.activeTabId)
            ? data.activeTabId
            : data.tabs[0].id;

          if (includeSettingsToggle && includeSettingsToggle.checked && data.settings) {
            currentSettings = { ...currentSettings, ...data.settings };
            saveSettings();
            applySettings();
          }

          // Clear undo histories from previous session
          tabHistories.clear();

          saveTabsData();

          const targetId = activeTabId;
          activeTabId = null;
          switchTab(targetId);

          settingsModal.classList.remove('show');
          showToast(`Imported ${tabs.length} tab(s) successfully!`, true);
        } catch {
          showToast('Failed to read backup file', false);
        }
      };
      reader.readAsText(file);
    });
  }

  // Mobile header actions overflow toggle
  const headerActions = document.getElementById('header-actions');
  const actionsToggleBtn = document.getElementById('actions-toggle-btn');

  if (actionsToggleBtn) {
    actionsToggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      headerActions.classList.toggle('header-actions-expanded');
    });

    document.addEventListener('click', (e) => {
      if (!headerActions.contains(e.target)) {
        headerActions.classList.remove('header-actions-expanded');
      }
    });
  }

  // Sidebar collapse logic
  const SIDEBAR_KEY = 'jotdown_sidebar_collapsed';
  const tabsBar = document.getElementById('tabs-bar');
  const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');

  const chevronLeft = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg><span class="sidebar-toggle-label">Hide</span>`;
  const chevronRight = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>`;

  function setSidebarCollapsed(collapsed, save = true) {
    if (collapsed) {
      tabsBar.classList.add('collapsed');
      sidebarToggleBtn.innerHTML = chevronRight;
      sidebarToggleBtn.title = 'Expand sidebar';
    } else {
      tabsBar.classList.remove('collapsed');
      sidebarToggleBtn.innerHTML = chevronLeft;
      sidebarToggleBtn.title = 'Collapse sidebar';
    }
    if (save) {
      localStorage.setItem(SIDEBAR_KEY, String(collapsed));
    }
  }

  function initSidebar() {
    const saved = localStorage.getItem(SIDEBAR_KEY);
    const isMobile = window.matchMedia('(max-width: 640px)').matches;
    const collapsed = saved !== null ? saved === 'true' : isMobile;
    setSidebarCollapsed(collapsed, false);
  }

  sidebarToggleBtn.addEventListener('click', () => {
    setSidebarCollapsed(!tabsBar.classList.contains('collapsed'));
  });

  initSidebar();

  loadSettings();

  // 6. First-Visit Welcome Modal
  const WELCOME_KEY = 'jotdown_welcomed';
  const welcomeModal = document.getElementById('welcome-modal');
  const closeWelcomeBtn = document.getElementById('close-welcome-btn');

  function closeWelcome() {
    welcomeModal.classList.remove('show');
  }

  closeWelcomeBtn.addEventListener('click', closeWelcome);
  welcomeModal.addEventListener('click', (e) => {
    if (e.target === welcomeModal) closeWelcome();
  });

  if (!localStorage.getItem(WELCOME_KEY)) {
    localStorage.setItem(WELCOME_KEY, '1');
    setTimeout(() => welcomeModal.classList.add('show'), 400);
  }

  // Copy contents (context menu)
  const menuCopyContents = document.getElementById('menu-copy-contents');
  if (menuCopyContents) {
    menuCopyContents.addEventListener('click', async () => {
      const targetTab = tabs.find(t => t.id === contextMenuTargetId);
      tabContextMenu.style.display = 'none';
      contextMenuTargetId = null;
      if (!targetTab) return;

      // Flush textarea content if this is the active tab
      if (targetTab.id === activeTabId) targetTab.content = textarea.value;

      if (!targetTab.content.trim()) {
        showToast('Nothing to copy — tab is empty', false);
        return;
      }

      try {
        await navigator.clipboard.writeText(targetTab.content);
        showToast('Copied to clipboard!', true);
      } catch (err) {
        const tmp = document.createElement('textarea');
        tmp.value = targetTab.content;
        document.body.appendChild(tmp);
        tmp.select();
        document.execCommand('copy');
        document.body.removeChild(tmp);
        showToast('Copied to clipboard!', true);
      }
    });
  }

  // Export as .txt (context menu)
  const menuExportTxt = document.getElementById('menu-export-txt');
  if (menuExportTxt) {
    menuExportTxt.addEventListener('click', () => {
      const targetTab = tabs.find(t => t.id === contextMenuTargetId);
      tabContextMenu.style.display = 'none';
      contextMenuTargetId = null;
      if (!targetTab) return;

      // Flush textarea content if this is the active tab
      if (targetTab.id === activeTabId) targetTab.content = textarea.value;

      if (!targetTab.content.trim()) {
        showToast('Nothing to export — tab is empty', false);
        return;
      }

      const safeName = targetTab.name.replace(/[/\\?%*:|"<>]/g, '-').trim() || 'note';
      const blob = new Blob([targetTab.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${safeName}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`Exported "${targetTab.name}" as .txt`, true);
    });
  }

  // Focus Mode
  const focusBtn = document.getElementById('focus-btn');
  const focusExitBtn = document.getElementById('focus-exit-btn');

  function doFocusTransition(onSwap, onDone) {
    const veil = document.getElementById('focus-veil');
    const appContainer = document.querySelector('.app-container');

    // Phase 1: veil snaps in + content compresses
    veil.style.transition = 'opacity 0.15s ease';
    veil.classList.add('focus-veil--active');
    appContainer.style.transition = 'transform 0.15s ease, filter 0.15s ease';
    appContainer.style.transform = 'scale(0.96)';
    appContainer.style.filter = 'blur(4px)';

    setTimeout(() => {
      // Phase 2: swap layout while fully covered
      onSwap();

      // Phase 3: veil fades out + content springs back
      veil.style.transition = 'opacity 0.22s ease';
      veil.classList.remove('focus-veil--active');
      appContainer.style.transition = 'transform 0.3s cubic-bezier(0.22, 1, 0.36, 1), filter 0.25s ease';
      appContainer.style.transform = '';
      appContainer.style.filter = '';

      setTimeout(() => {
        veil.style.transition = '';
        appContainer.style.transition = '';
        if (onDone) onDone();
      }, 320);
    }, 160);
  }

  function enterFocusMode() {
    doFocusTransition(
      () => document.body.classList.add('focus-mode'),
      () => textarea.focus()
    );
  }

  function exitFocusMode() {
    doFocusTransition(
      () => document.body.classList.remove('focus-mode'),
      () => textarea.focus()
    );
  }

  if (focusBtn) focusBtn.addEventListener('click', enterFocusMode);
  if (focusExitBtn) focusExitBtn.addEventListener('click', exitFocusMode);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.body.classList.contains('focus-mode')) {
      exitFocusMode();
    }
  });
});
