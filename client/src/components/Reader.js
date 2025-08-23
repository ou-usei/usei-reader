import React, { useState, useEffect, useRef, useCallback } from 'react';
import ePub from 'epubjs';
import { Inbox, Settings2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import TocItem from './TocItem';
import SelectionMenu from './SelectionMenu';
import HighlightDialog from './HighlightDialog';
import { 
  getBestProgress,
  saveProgressToDatabase
} from '../utils/progressUtils';
import './Reader.css';

// iPad detection
const isIPad = /iPad/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

// 简化的Reader组件，类似main分支的结构

const Reader = ({ book, currentUser, onBack }) => {
  const viewerRef = useRef(null);
  const viewerWrapperRef = useRef(null);
  const bookRef = useRef(null);
  const renditionRef = useRef(null);
  const justSelected = useRef(false);
  const isInitialized = useRef(false);
  const lastKnownLocation = useRef(null); // 跟踪最后已知的准确位置

  const [toc, setToc] = useState([]);
  const [location, setLocation] = useState('Loading...');
  const [isTocVisible, setIsTocVisible] = useState(false);
  const [fontSize, setFontSize] = useState(() => {
    try {
      const savedSize = localStorage.getItem('epubReaderFontSize');
      const parsedSize = parseInt(savedSize, 10);
      return !isNaN(parsedSize) && parsedSize >= 80 && parsedSize <= 200 ? parsedSize : 100;
    } catch (error) {
      console.error("Failed to read font size from localStorage", error);
      return 100;
    }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentTocHref, setCurrentTocHref] = useState('');
  const [selectionMenu, setSelectionMenu] = useState({ visible: false, top: null, left: null, cfiRange: null });
  const [isHighlightDialogVisible, setIsHighlightDialogVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // 获取当前准确位置的函数
  const getCurrentLocation = useCallback(() => {
    if (!renditionRef.current) return null;
    
    try {
      const currentLocation = renditionRef.current.currentLocation();
      if (currentLocation && currentLocation.start && currentLocation.start.cfi) {
        return currentLocation.start.cfi;
      }
    } catch (error) {
      console.error('获取当前位置失败:', error);
    }
    return null;
  }, []);


  const findChapter = useCallback((tocItems, href) => {
    if (!tocItems || !href) return null;
    const cleanHref = href.split('#')[0];
    let bestMatch = null;
    const search = (items) => {
      for (const item of items) {
        const itemHref = item.href.split('#')[0];
        if (cleanHref.endsWith(itemHref)) {
          if (!bestMatch || itemHref.length > bestMatch.href.split('#')[0].length) {
            bestMatch = item;
          }
        }
        if (item.subitems) search(item.subitems);
      }
    };
    search(tocItems);
    return bestMatch;
  }, []);

  const hideSelectionMenu = useCallback(() => {
    setSelectionMenu(prev => ({ ...prev, visible: false, cfiRange: null }));
  }, []);

  const applyHighlight = useCallback(async (cfiRange) => {
    if (!cfiRange || !renditionRef.current) return;
    try {
      renditionRef.current.annotations.add("highlight", cfiRange, {}, () => {}, "epub-highlight", {});
      if (currentUser && book) {
        await fetch('/api/highlights', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: currentUser.username,
            bookUuid: book.uuid,
            cfiRange: cfiRange,
          }),
        });
      }
      renditionRef.current.getContents()?.window.getSelection().removeAllRanges();
    } catch (error) {
      console.error("Error applying highlight:", error);
    }
    hideSelectionMenu();
  }, [currentUser, book, hideSelectionMenu]);

  const handleSearchAndHighlight = useCallback(async (text) => {
    setIsHighlightDialogVisible(false);
    if (!text || !bookRef.current) return;
    try {
      const results = await Promise.all(
        bookRef.current.spine.spineItems.map(item =>
          item.load(bookRef.current.load.bind(bookRef.current))
            .then(doc => item.find(text))
            .finally(item.unload.bind(item))
        )
      );
      const flattenedResults = [].concat.apply([], results);
      if (flattenedResults.length > 0) {
        await applyHighlight(flattenedResults[0].cfi);
        renditionRef.current.display(flattenedResults[0].cfi);
      } else {
        alert('在当前书籍中未找到匹配的文本。');
      }
    } catch (error) {
      console.error("Error during search and highlight:", error);
      alert('搜索高亮时发生错误。');
    }
  }, [applyHighlight]);

  useEffect(() => {
    if (!book || !viewerRef.current) return;
    let isMounted = true;
    let rendition;

    const handleDocumentClick = (e) => {
      if (justSelected.current) {
        justSelected.current = false;
        return;
      }
      if (isMounted && !e.target.closest('.selection-menu')) {
        hideSelectionMenu();
      }
    };

    const loadBook = async () => {
      try {
        if (isMounted) {
          setIsLoading(true);
          setError('');
          setToc([]);
          hideSelectionMenu();
        }
        if (viewerRef.current) viewerRef.current.innerHTML = '';

        const viewUrlResponse = await fetch(`/api/books/${book.uuid}/view`);
        if (!viewUrlResponse.ok) throw new Error(`Failed to get view URL: ${viewUrlResponse.statusText}`);
        const viewData = await viewUrlResponse.json();
        if (!viewData.success || !viewData.url) throw new Error('API did not return a valid view URL.');
        
        const response = await fetch(viewData.url);
        if (!response.ok) throw new Error(`Failed to fetch book from R2: ${response.statusText}`);
        const arrayBuffer = await response.arrayBuffer();
        if (!isMounted) return;

        const epubBook = ePub(arrayBuffer, { allowScriptedContent: true });
        bookRef.current = epubBook;

        rendition = epubBook.renderTo(viewerRef.current, { width: '100%', height: '100%', flow: 'paginated', spread: 'none' });
        renditionRef.current = rendition;
        
        rendition.themes.register("highlightTheme", { "::selection": { "background": "rgba(255, 255, 0, 0.3)" }, ".epub-highlight": { "background-color": "yellow", "mix-blend-mode": "multiply" } });
        rendition.themes.select("highlightTheme");

        await epubBook.ready;
        const nav = await epubBook.loaded.navigation;
        const fullToc = nav.toc;
        
        if (isMounted) {
          setToc(fullToc);

          // 加载进度和高亮
          let initialLocation = undefined;
          if (currentUser) {
            try {
              const progress = await getBestProgress(book.uuid, currentUser.username);
              
              if (progress?.current_cfi) {
                initialLocation = progress.current_cfi;
                console.log(`📖 从位置开始: ${initialLocation}`);
              }
              
              // 加载高亮
              try {
                const highlightsRes = await fetch(`/api/highlights/${currentUser.username}/${book.uuid}`);
                const highlightsData = await highlightsRes.json();
                if (highlightsData.success && highlightsData.highlights) {
                  highlightsData.highlights.forEach(hl => {
                    rendition.annotations.add("highlight", hl.cfi_range, {}, () => {}, "epub-highlight", {});
                  });
                }
              } catch (err) {
                console.error('加载高亮失败:', err);
              }
            } catch (err) {
              console.error('加载进度失败:', err);
            }
          }

          rendition.on('relocated', (locationData) => {
            if (isMounted) {
              hideSelectionMenu();
              const chapter = findChapter(fullToc, locationData.start.href);
              setLocation(chapter ? chapter.label.trim() : '...');
              setCurrentTocHref(locationData.start.href.split('#')[0]);
              
              // 更新最后已知的准确位置
              lastKnownLocation.current = locationData.start.cfi;
              
              // 只显示初始化完成后的真实位置变化
              if (isInitialized.current) {
                console.log(`📍 当前阅读位置: ${locationData.start.cfi}`);
              }
              
              // 不再进行实时保存
            }
          });

          rendition.on('selected', (cfiRange, contents) => {
            if (isIPad) return;
            const selection = contents.window.getSelection();
            if (selection && !selection.isCollapsed) {
              const range = selection.getRangeAt(0);
              const rect = range.getBoundingClientRect();
              const viewerRect = viewerRef.current.getBoundingClientRect();
              const wrapperRect = viewerWrapperRef.current.getBoundingClientRect();
              const top = (viewerRect.top + rect.top) - wrapperRect.top;
              const left = (viewerRect.left + rect.left + rect.width / 2) - wrapperRect.left;
              justSelected.current = true;
              setSelectionMenu({ visible: true, top, left, cfiRange });
            }
          });

          document.addEventListener('click', handleDocumentClick);
          await rendition.display(initialLocation);
          
          // 确保epub.js内部状态与显示位置同步
          if (initialLocation) {
            // 等待显示完成，然后强制同步内部状态
            setTimeout(async () => {
              try {
                await rendition.display(initialLocation);
                console.log('🔄 内部状态已同步');
              } catch (error) {
                console.error('同步内部状态失败:', error);
              }
            }, 100);
          }
          
          rendition.themes.fontSize(`${fontSize}%`);
          setIsLoading(false);
          
          // 标记初始化完成，开始记录真实的位置变化
          setTimeout(() => {
            isInitialized.current = true;
          }, 500);
          
          console.log('📖 阅读器已就绪');
        }
      } catch (err) {
        if (isMounted) {
          console.error("Error loading book:", err);
          setError(`Failed to load book: ${err.message}`);
          setIsLoading(false);
        }
      }
    };

    loadBook();
    return () => {
      isMounted = false;
      isInitialized.current = false;
      lastKnownLocation.current = null;
      document.removeEventListener('click', handleDocumentClick);
      if (bookRef.current) bookRef.current.destroy();
    };
  }, [book, currentUser, findChapter, hideSelectionMenu, applyHighlight, handleSearchAndHighlight]);

  useEffect(() => {
    try {
      localStorage.setItem('epubReaderFontSize', fontSize.toString());
    } catch (error) {
      console.error("Failed to save font size to localStorage", error);
    }
  }, [fontSize]);

  useEffect(() => {
    if (renditionRef.current && !isLoading) {
      renditionRef.current.themes.fontSize(`${fontSize}%`);
    }
  }, [fontSize, isLoading]);

  // 退出时同步保存当前位置
  const handleBack = async () => {
    if (!currentUser || !book) {
      onBack();
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      // 优先使用最后已知的准确位置（来自relocated事件）
      let currentCfi = lastKnownLocation.current;
      
      // 如果没有，则尝试getCurrentLocation()
      if (!currentCfi) {
        currentCfi = getCurrentLocation();
      }
      
      if (currentCfi) {
        console.log(`📖 保存退出位置: ${currentCfi}`);
        
        // 同步保存到数据库
        const success = await saveProgressToDatabase(book.uuid, currentCfi, currentUser.username);
        
        if (success) {
          console.log('✅ 进度保存成功，可以退出');
          onBack();
        } else {
          throw new Error('保存到数据库失败');
        }
      } else {
        console.log('⚠️ 无法获取当前位置，直接退出');
        onBack();
      }
    } catch (error) {
      console.error('❌ 保存进度失败:', error);
      setSaveError('保存进度失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  // 重试保存
  const handleRetrySave = () => {
    setSaveError(null);
    handleBack();
  };

  const handleNext = useCallback(() => {
    hideSelectionMenu();
    renditionRef.current?.next();
  }, [hideSelectionMenu]);

  const handlePrev = useCallback(() => {
    hideSelectionMenu();
    renditionRef.current?.prev();
  }, [hideSelectionMenu]);

  const handleTocClick = useCallback((href) => {
    if (renditionRef.current) {
      hideSelectionMenu();
      renditionRef.current.display(href);
      if (window.innerWidth < 768) setIsTocVisible(false);
    }
  }, [hideSelectionMenu]);

  const changeFontSize = (increment) => {
    setFontSize(prevSize => Math.max(80, Math.min(200, prevSize + increment)));
  };

  return (
    <div className="reader-container">
      {isHighlightDialogVisible && (
        <HighlightDialog 
          onSave={handleSearchAndHighlight}
          onClose={() => setIsHighlightDialogVisible(false)}
        />
      )}
      
      {/* 保存错误提示 */}
      {saveError && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'white',
          padding: '20px',
          border: '2px solid #dc2626',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 9999
        }}>
          <p style={{ color: '#dc2626', marginBottom: '15px' }}>{saveError}</p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={handleRetrySave}
              style={{
                background: '#dc2626',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              重试保存
            </button>
            <button 
              onClick={() => {
                setSaveError(null);
                onBack(); // 强制退出，不保存
              }}
              style={{
                background: '#6b7280',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              放弃保存并退出
            </button>
          </div>
        </div>
      )}
      <div className="reader-header">
        <button 
          className="back-button" 
          onClick={handleBack} 
          disabled={isSaving}
          title={isSaving ? "正在保存..." : "返回书库"}
        >
          {isSaving ? '...' : '←'}
        </button>
        <button className="toc-toggle-button" onClick={() => setIsTocVisible(!isTocVisible)}>
          {isTocVisible ? '隐藏目录' : '目录'}
        </button>
        <div className="book-title-header">
          <h2>{book.title}</h2>
          <span>{isLoading ? '加载中...' : error || location}</span>
        </div>
        <div className="reader-settings">
          {isIPad && (
            <button 
              className="highlight-paste-button"
              onClick={() => setIsHighlightDialogVisible(true)}
              title="粘贴高亮"
            >
              <Inbox size={18} />
            </button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="highlight-paste-button" title="设置">
                <Settings2 size={18} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <div className="flex items-center justify-between w-full">
                  <span>字体大小:</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => changeFontSize(-10)} disabled={isLoading} className="px-2 py-1 border rounded">-</button>
                    <span>{fontSize}%</span>
                    <button onClick={() => changeFontSize(10)} disabled={isLoading} className="px-2 py-1 border rounded">+</button>
                  </div>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="reader-main">
        <div className={`toc-panel ${isTocVisible ? 'visible' : ''}`}>
          <h3>目录</h3>
          {isLoading ? <p>加载中...</p> : (
            <ul className="toc-list">
              {toc.map((item, index) => (
                <TocItem 
                  key={index} 
                  item={item} 
                  onTocClick={handleTocClick} 
                  currentTocHref={currentTocHref} 
                />
              ))}
            </ul>
          )}
        </div>
        <div className="viewer-wrapper" ref={viewerWrapperRef}>
          {isLoading && <div className="loader">正在加载书籍...</div>}
          {error && <div className="error-message">{error}</div>}
          <div id="viewer" ref={viewerRef} style={{ visibility: isLoading || error ? 'hidden' : 'visible' }}></div>
          
          {!isIPad && selectionMenu.visible && (
            <SelectionMenu 
              top={selectionMenu.top}
              left={selectionMenu.left}
              onHighlight={() => applyHighlight(selectionMenu.cfiRange)}
            />
          )}

          {!isLoading && !error && (
            <>
              <button className="nav-button prev" onClick={handlePrev}>‹</button>
              <button className="nav-button next" onClick={handleNext}>›</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reader;