// Zenn Scrap TOC Extension - Main Content Script
// Version: 0.3.0

(function() {
  'use strict';

  console.log('[Zenn Scrap TOC] Extension loaded - v0.3.0');

  // グローバル変数でObserverと状態を管理
  let tocScrollObserver = null;
  let tocMutationObserver = null;
  let earlyInitObserver = null;
  let urlCheckInterval = null;
  let currentUrl = window.location.href;
  let isInitialized = false;
  let isWaitingForContent = false;

  // ScrapページのURLパターンをチェック
  function isScrapPage(url) {
    const urlToCheck = url || window.location.href;
    return /^https:\/\/zenn\.dev\/[^\/]+\/scraps\/[^\/]+/.test(urlToCheck);
  }

  // TOCパネルを削除
  function removeTocPanel() {
    console.log('[Zenn Scrap TOC] Removing TOC panel');

    const panel = document.getElementById('zenn-scrap-toc');
    if (panel) {
      panel.remove();
    }

    // Observerを切断
    if (tocScrollObserver) {
      tocScrollObserver.disconnect();
      tocScrollObserver = null;
    }
    if (tocMutationObserver) {
      tocMutationObserver.disconnect();
      tocMutationObserver = null;
    }
    if (earlyInitObserver) {
      earlyInitObserver.disconnect();
      earlyInitObserver = null;
    }

    isInitialized = false;
    isWaitingForContent = false;
  }

  // URLの変更を定期的にチェック（フォールバック）
  function startUrlPolling() {
    if (urlCheckInterval) {
      clearInterval(urlCheckInterval);
    }

    urlCheckInterval = setInterval(() => {
      const newUrl = window.location.href;
      if (newUrl !== currentUrl) {
        console.log('[Zenn Scrap TOC] URL changed:', currentUrl, '->', newUrl);
        handleUrlChange(newUrl);
      }
    }, 300); // ポーリング間隔を短縮
  }

  // URLが変更されたときの処理
  function handleUrlChange(newUrl) {
    currentUrl = newUrl;

    // Scrapページかどうかをチェック
    if (isScrapPage(newUrl)) {
      console.log('[Zenn Scrap TOC] Navigated to Scrap page');
      console.log('[Zenn Scrap TOC] isInitialized:', isInitialized, 'isWaitingForContent:', isWaitingForContent);

      // 既存のTOCを削除
      removeTocPanel();

      // すぐに見出しが存在するか確認（h1-h6すべて、クラス問わず）
      const immediateHeadings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      console.log('[Zenn Scrap TOC] Immediate headings found:', immediateHeadings.length);

      if (immediateHeadings.length > 0) {
        // 見出しが既に存在する場合は即座に初期化
        console.log('[Zenn Scrap TOC] Headings already present, initializing immediately');
        init();
      } else {
        // 見出しがない場合は早期初期化を試みる
        console.log('[Zenn Scrap TOC] No headings yet, setting up early init observer');
        setupEarlyInitObserver();

        // フォールバック: 300ms後にまだ初期化されていなければ初期化
        setTimeout(() => {
          // まだScrapページにいることを確認し、まだ初期化されていない場合
          if (isScrapPage(window.location.href) && !isInitialized && !isWaitingForContent) {
            const delayedHeadings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
            console.log('[Zenn Scrap TOC] Fallback initialization - headings found:', delayedHeadings.length);
            init();
          }
        }, 300);
      }
    } else {
      console.log('[Zenn Scrap TOC] Not a Scrap page, removing TOC');
      // Scrapページ以外では削除
      removeTocPanel();
    }
  }

  // URLの変更を監視（複数の方法を組み合わせ）
  function setupUrlObserver() {
    // 1. History APIのフック
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function(...args) {
      originalPushState.apply(history, args);
      setTimeout(() => handleUrlChange(window.location.href), 0);
    };

    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args);
      setTimeout(() => handleUrlChange(window.location.href), 0);
    };

    // 2. popstateイベント（戻る/進むボタン）
    window.addEventListener('popstate', () => {
      setTimeout(() => handleUrlChange(window.location.href), 0);
    });

    // 3. clickイベントをキャプチャ（リンククリック）
    document.addEventListener('click', (e) => {
      // aタグのクリックを検出
      const link = e.target.closest('a');
      if (link && link.href && link.href.startsWith('https://zenn.dev')) {
        // リンククリック直後と少し後の両方でチェック
        setTimeout(() => {
          const newUrl = window.location.href;
          if (newUrl !== currentUrl) {
            handleUrlChange(newUrl);
          }
        }, 50);
        setTimeout(() => {
          const newUrl = window.location.href;
          if (newUrl !== currentUrl) {
            handleUrlChange(newUrl);
          }
        }, 200);
      }
    }, true);

    // 4. MutationObserverで<title>タグの変更を監視
    const titleObserver = new MutationObserver(() => {
      const newUrl = window.location.href;
      if (newUrl !== currentUrl) {
        handleUrlChange(newUrl);
      }
    });

    const titleElement = document.querySelector('title');
    if (titleElement) {
      titleObserver.observe(titleElement, { childList: true, characterData: true, subtree: true });
    }

    // 5. フォールバックとしてポーリングも実行
    startUrlPolling();

    console.log('[Zenn Scrap TOC] URL observer setup complete');
  }

  // 設定の読み込み
  let tocSettings = {
    isExpanded: true,
    position: 'right'
  };

  // LocalStorageから設定を読み込む
  function loadSettings() {
    const stored = localStorage.getItem('zenn-scrap-toc-settings');
    if (stored) {
      tocSettings = { ...tocSettings, ...JSON.parse(stored) };
    }
  }

  // 設定を保存
  function saveSettings() {
    localStorage.setItem('zenn-scrap-toc-settings', JSON.stringify(tocSettings));
  }

  // CSSが注入されているか確認し、必要に応じて注入
  function injectStylesIfNeeded() {
    // 既に注入されている場合はスキップ
    if (document.getElementById('zenn-scrap-toc-styles')) {
      return;
    }

    // CSSファイルへのリンクを動的に追加
    const link = document.createElement('link');
    link.id = 'zenn-scrap-toc-styles';
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = chrome.runtime.getURL('styles.css');

    if (document.head) {
      document.head.appendChild(link);
    } else {
      // document.headがまだない場合は、DOMContentLoadedを待つ
      document.addEventListener('DOMContentLoaded', () => {
        document.head.appendChild(link);
      });
    }
  }

  // 見出し要素を収集
  function collectHeadings() {
    const headings = [];
    let elements;

    // デバッグ用: すべての見出し要素を確認
    console.log('[Zenn Scrap TOC Debug] All h1-h6 elements:', {
      h1: document.querySelectorAll('h1').length,
      h2: document.querySelectorAll('h2').length,
      h3: document.querySelectorAll('h3').length,
      h4: document.querySelectorAll('h4').length,
      h5: document.querySelectorAll('h5').length,
      h6: document.querySelectorAll('h6').length,
      'h1.code-line': document.querySelectorAll('h1.code-line').length,
      'h2.code-line': document.querySelectorAll('h2.code-line').length,
      'h3.code-line': document.querySelectorAll('h3.code-line').length
    });

    // まず.code-lineクラス付きの見出しを探す（h1-h6すべて対象）
    const selectorWithClass = 'h1.code-line, h2.code-line, h3.code-line, h4.code-line, h5.code-line, h6.code-line';
    elements = document.querySelectorAll(selectorWithClass);

    console.log('[Zenn Scrap TOC Debug] Found with .code-line class:', elements.length);

    // .code-lineクラス付きの見出しが見つからない場合
    if (elements.length === 0) {
      console.log('[Zenn Scrap TOC Debug] No .code-line headings found, trying without class...');

      // Scrapのメインコンテンツエリア内の見出しを探す
      const contentSelectors = [
        'article h1, article h2, article h3, article h4, article h5, article h6',
        'main h1, main h2, main h3, main h4, main h5, main h6',
        '[class*="scrap"] h1, [class*="scrap"] h2, [class*="scrap"] h3, [class*="scrap"] h4, [class*="scrap"] h5, [class*="scrap"] h6',
        '[class*="content"] h1, [class*="content"] h2, [class*="content"] h3, [class*="content"] h4, [class*="content"] h5, [class*="content"] h6'
      ];

      for (const selector of contentSelectors) {
        elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          console.log('[Zenn Scrap TOC Debug] Found headings with selector:', selector, 'count:', elements.length);
          break;
        }
      }

      // それでも見つからない場合は、すべての見出しを対象にする（最後の手段）
      if (elements.length === 0) {
        console.log('[Zenn Scrap TOC Debug] Still no headings, using all h1-h6...');
        elements = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      }
    }

    console.log('[Zenn Scrap TOC Debug] Total elements to process:', elements.length);

    elements.forEach((element) => {
      // details要素内の見出しを除外
      if (element.closest('details')) {
        console.log('[Zenn Scrap TOC Debug] Excluded (in details):', element.textContent);
        return;
      }

      // pre/code要素内の見出しを除外
      if (element.closest('pre') || element.closest('code')) {
        console.log('[Zenn Scrap TOC Debug] Excluded (in pre/code):', element.textContent);
        return;
      }

      // blockquote要素内の見出しを除外
      if (element.closest('blockquote')) {
        console.log('[Zenn Scrap TOC Debug] Excluded (in blockquote):', element.textContent);
        return;
      }

      // aside要素内の見出しを除外
      if (element.closest('aside')) {
        console.log('[Zenn Scrap TOC Debug] Excluded (in aside):', element.textContent);
        return;
      }

      // ナビゲーションやヘッダー、フッター内の見出しを除外
      if (element.closest('nav') || element.closest('header') || element.closest('footer')) {
        console.log('[Zenn Scrap TOC Debug] Excluded (in nav/header/footer):', element.textContent);
        return;
      }

      const level = parseInt(element.tagName.charAt(1));
      const text = element.textContent.replace(/^#\s*/, '').trim();
      let id = element.id;

      // IDがない場合は生成
      if (!id) {
        id = encodeURIComponent(text.toLowerCase().replace(/\s+/g, '-'));
        element.id = id;
      }

      headings.push({
        level,
        text,
        id,
        element
      });

      console.log('[Zenn Scrap TOC Debug] Added heading:', { level, text, id });
    });

    console.log('[Zenn Scrap TOC Debug] Final heading count:', headings.length);
    return headings;
  }

  // 階層構造を構築
  function buildTocStructure(headings) {
    const toc = [];
    const stack = [];

    headings.forEach(heading => {
      const item = {
        ...heading,
        children: []
      };

      // スタックを調整
      while (stack.length > 0 && stack[stack.length - 1].level >= heading.level) {
        stack.pop();
      }

      // 親要素に追加
      if (stack.length === 0) {
        toc.push(item);
      } else {
        stack[stack.length - 1].children.push(item);
      }

      stack.push(item);
    });

    return toc;
  }

  // TOCのHTMLを生成
  function createTocHtml(tocStructure, currentId = null) {
    if (tocStructure.length === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'zenn-toc-empty';
      emptyDiv.textContent = '見出しがありません';
      return emptyDiv;
    }

    function buildList(items, depth = 0) {
      const ul = document.createElement('ul');
      ul.className = `zenn-toc-list zenn-toc-level-${depth}`;

      items.forEach(item => {
        const li = document.createElement('li');
        li.className = 'zenn-toc-item';

        const link = document.createElement('a');
        link.href = `#${item.id}`;
        link.className = 'zenn-toc-link';
        link.textContent = item.text;
        link.dataset.id = item.id;

        if (item.id === currentId) {
          link.classList.add('active');
        }

        // クリックイベント
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const target = document.getElementById(item.id);
          if (target) {
            const offset = target.getBoundingClientRect().top + window.pageYOffset - 80;
            window.scrollTo({
              top: offset,
              behavior: 'smooth'
            });
          }
        });

        li.appendChild(link);

        // 子要素がある場合
        if (item.children && item.children.length > 0) {
          li.appendChild(buildList(item.children, depth + 1));
        }

        ul.appendChild(li);
      });

      return ul;
    }

    return buildList(tocStructure);
  }

  // TOCパネルを作成
  function createTocPanel() {
    // CSSが読み込まれているか確認し、必要に応じて注入
    injectStylesIfNeeded();

    const panel = document.createElement('div');
    panel.id = 'zenn-scrap-toc';
    panel.className = `zenn-scrap-toc ${tocSettings.isExpanded ? 'expanded' : 'collapsed'}`;

    // バージョン表示（デバッグ用）
    panel.dataset.version = '0.3.0';

    // ヘッダー部分
    const header = document.createElement('div');
    header.className = 'zenn-toc-header';

    const title = document.createElement('h3');
    title.textContent = '目次';
    title.className = 'zenn-toc-title';

    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'zenn-toc-toggle';
    toggleBtn.innerHTML = tocSettings.isExpanded ? '▼' : '▶';
    toggleBtn.title = '目次の表示/非表示';
    toggleBtn.addEventListener('click', toggleToc);

    header.appendChild(title);
    header.appendChild(toggleBtn);

    // コンテンツ部分
    const content = document.createElement('div');
    content.className = 'zenn-toc-content';

    panel.appendChild(header);
    panel.appendChild(content);

    return panel;
  }

  // TOCの表示/非表示を切り替え
  function toggleToc() {
    const panel = document.getElementById('zenn-scrap-toc');
    const toggleBtn = panel.querySelector('.zenn-toc-toggle');

    tocSettings.isExpanded = !tocSettings.isExpanded;

    if (tocSettings.isExpanded) {
      panel.classList.remove('collapsed');
      panel.classList.add('expanded');
      toggleBtn.innerHTML = '▼';
    } else {
      panel.classList.remove('expanded');
      panel.classList.add('collapsed');
      toggleBtn.innerHTML = '▶';
    }

    saveSettings();
  }

  // TOCを更新
  function updateToc(currentId = null) {
    const headings = collectHeadings();
    const tocStructure = buildTocStructure(headings);
    const content = document.querySelector('.zenn-toc-content');

    if (content) {
      content.innerHTML = '';
      const tocList = createTocHtml(tocStructure, currentId);
      content.appendChild(tocList);
    }
  }

  // スクロール位置に応じてアクティブな見出しをハイライト
  function setupScrollSpy() {
    const headings = collectHeadings();
    if (headings.length === 0) return null;

    // Intersection Observerを使用
    const observerOptions = {
      rootMargin: '-80px 0px -70% 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          // 全てのリンクからactiveクラスを削除
          document.querySelectorAll('.zenn-toc-link').forEach(link => {
            link.classList.remove('active');
          });

          // 現在の見出しに対応するリンクをアクティブに
          const activeLink = document.querySelector(`.zenn-toc-link[data-id="${entry.target.id}"]`);
          if (activeLink) {
            activeLink.classList.add('active');

            // アクティブな項目が見えるようにスクロール
            const tocContent = document.querySelector('.zenn-toc-content');
            if (tocContent) {
              const linkRect = activeLink.getBoundingClientRect();
              const contentRect = tocContent.getBoundingClientRect();

              if (linkRect.top < contentRect.top || linkRect.bottom > contentRect.bottom) {
                activeLink.scrollIntoView({ block: 'center' });
              }
            }
          }
        }
      });
    }, observerOptions);

    // 各見出しを監視
    headings.forEach(heading => {
      observer.observe(heading.element);
    });

    return observer;
  }

  // 早期初期化用のMutationObserver
  function setupEarlyInitObserver() {
    // 既に初期化済みまたは待機中の場合はスキップ
    if (isInitialized || isWaitingForContent) {
      console.log('[Zenn Scrap TOC] Skipping early init - isInitialized:', isInitialized, 'isWaitingForContent:', isWaitingForContent);
      return;
    }

    isWaitingForContent = true;
    console.log('[Zenn Scrap TOC] Setting up early init observer');

    const targetNode = document.querySelector('main') || document.body;
    const config = { childList: true, subtree: true };

    let initCheckTimer;
    const callback = function() {
      clearTimeout(initCheckTimer);
      initCheckTimer = setTimeout(() => {
        // 見出しが存在するかチェック（h1-h6すべて）
        const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        console.log('[Zenn Scrap TOC] Early init check - headings found:', headings.length, 'isInitialized:', isInitialized);
        if (headings.length > 0 && !isInitialized) {
          console.log('[Zenn Scrap TOC] Headings detected, initializing immediately');

          // Observerを切断
          if (earlyInitObserver) {
            earlyInitObserver.disconnect();
            earlyInitObserver = null;
          }

          isWaitingForContent = false;
          init();
        }
      }, 20); // 非常に短いデバウンス
    };

    earlyInitObserver = new MutationObserver(callback);
    earlyInitObserver.observe(targetNode, config);

    // タイムアウト設定（5秒後に自動的にObserverを切断）
    setTimeout(() => {
      if (earlyInitObserver) {
        console.log('[Zenn Scrap TOC] Early init observer timeout - disconnecting');
        earlyInitObserver.disconnect();
        earlyInitObserver = null;
        isWaitingForContent = false;
      }
    }, 5000);
  }

  // DOMの変更を監視（動的に追加される見出しに対応）
  function setupMutationObserver() {
    const targetNode = document.querySelector('main') || document.body;
    const config = { childList: true, subtree: true };

    let debounceTimer;
    const callback = function(mutationsList) {
      // URLが変わっていたらチェック
      const newUrl = window.location.href;
      if (newUrl !== currentUrl) {
        handleUrlChange(newUrl);
        return;
      }

      // デバウンス処理
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        // 新しい見出しが追加されたかチェック
        const hasNewHeadings = mutationsList.some(mutation => {
          return Array.from(mutation.addedNodes).some(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              return node.matches && (node.matches('h1, h2, h3, h4, h5, h6') ||
                     node.querySelector && node.querySelector('h1, h2, h3, h4, h5, h6'));
            }
            return false;
          });
        });

        if (hasNewHeadings && isScrapPage()) {
          updateToc();
          // スクロールスパイを再設定
          if (tocScrollObserver) {
            tocScrollObserver.disconnect();
          }
          tocScrollObserver = setupScrollSpy();
        }
      }, 100); // デバウンス時間を短縮
    };

    const observer = new MutationObserver(callback);
    observer.observe(targetNode, config);

    return observer;
  }

  // 初期化
  function init() {
    // Scrapページでない場合は何もしない
    if (!isScrapPage()) {
      console.log('[Zenn Scrap TOC] Not a Scrap page, skipping initialization');
      return;
    }

    // 既に初期化済みの場合はスキップ
    if (isInitialized) {
      console.log('[Zenn Scrap TOC] Already initialized');
      return;
    }

    console.log('[Zenn Scrap TOC] Initializing TOC panel');

    // 設定を読み込む
    loadSettings();

    // 既存のパネルがあれば削除
    const existingPanel = document.getElementById('zenn-scrap-toc');
    if (existingPanel) {
      existingPanel.remove();
    }

    // TOCパネルを作成して挿入
    const tocPanel = createTocPanel();
    document.body.appendChild(tocPanel);

    // 初回のTOCを生成
    updateToc();

    // スクロールスパイを設定
    tocScrollObserver = setupScrollSpy();

    // DOM変更の監視を開始
    tocMutationObserver = setupMutationObserver();

    // ウィンドウリサイズ時の処理
    let resizeTimer;
    const resizeHandler = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const panel = document.getElementById('zenn-scrap-toc');
        if (panel) {
          // モバイル表示の調整
          if (window.innerWidth < 1200) {
            panel.classList.add('mobile');
          } else {
            panel.classList.remove('mobile');
          }
        }
      }, 250);
    };

    // イベントリスナーを追加
    window.addEventListener('resize', resizeHandler);

    // 初回のモバイル判定
    if (window.innerWidth < 1200) {
      tocPanel.classList.add('mobile');
    }

    isInitialized = true;
    console.log('[Zenn Scrap TOC] Initialization complete');
  }

  // ページの準備ができたら開始
  function startExtension() {
    console.log('[Zenn Scrap TOC] Starting extension - document.readyState:', document.readyState, 'URL:', window.location.href);

    // URL監視を開始（document_startでも安全に実行）
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        console.log('[Zenn Scrap TOC] Setting up URL observer (after DOMContentLoaded)');
        setupUrlObserver();
      });
    } else {
      console.log('[Zenn Scrap TOC] Setting up URL observer (immediately)');
      setupUrlObserver();
    }

    // 現在のページがScrapページなら初期化
    if (isScrapPage()) {
      // DOM読み込み完了を待つ
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          console.log('[Zenn Scrap TOC] DOMContentLoaded fired');

          // 即座に見出しをチェック
          const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
          if (headings.length > 0) {
            console.log('[Zenn Scrap TOC] Headings found on DOMContentLoaded:', headings.length);
            init();
          } else {
            // 早期初期化を試みる
            setupEarlyInitObserver();

            // フォールバック: 300ms後にまだ初期化されていなければ初期化
            setTimeout(() => {
              if (!isInitialized && !isWaitingForContent) {
                const delayedHeadings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
                console.log('[Zenn Scrap TOC] Fallback initialization (DOMContentLoaded) - headings:', delayedHeadings.length);
                init();
              }
            }, 300);
          }
        });
      } else if (document.readyState === 'interactive' || document.readyState === 'complete') {
        // 既にDOM読み込み済みの場合
        console.log('[Zenn Scrap TOC] Document already loaded');

        // 即座に見出しをチェック
        const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        if (headings.length > 0) {
          console.log('[Zenn Scrap TOC] Headings already present, initializing immediately');
          init();
        } else {
          // 見出しがまだない場合は早期初期化Observerをセットアップ
          setupEarlyInitObserver();

          // フォールバック
          setTimeout(() => {
            if (!isInitialized && !isWaitingForContent) {
              const delayedHeadings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
              console.log('[Zenn Scrap TOC] Fallback initialization (initial load) - headings:', delayedHeadings.length);
              init();
            }
          }, 300);
        }
      }
    }
  }

  // 拡張機能を開始
  startExtension();
})();