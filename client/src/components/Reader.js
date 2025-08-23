import React, { useState, useEffect, useRef, useCallback } from 'react';
import ePub from 'epubjs';
import { Inbox, Settings2 } from 'lucide-react'; // Import the new icon
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import TocItem from './TocItem';
import SelectionMenu from './SelectionMenu';
import HighlightDialog from './HighlightDialog'; // Import the new dialog component
import './Reader.css';

// iPad detection
const isIPad = /iPad/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

// Debounce function to limit how often a function is called
const debounce = (func, delay) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
};

const Reader = ({ book, currentUser, onBack }) => {
  const viewerRef = useRef(null);
  const viewerWrapperRef = useRef(null); // Ref for the wrapper
  const bookRef = useRef(null);
  const renditionRef = useRef(null);
  const justSelected = useRef(false); // Flag to manage click events

  const [toc, setToc] = useState([]);
  const [location, setLocation] = useState('Loading...');
  const [isTocVisible, setIsTocVisible] = useState(false); // Default to hidden
  const [fontSize, setFontSize] = useState(() => {
    try {
      const savedSize = localStorage.getItem('epubReaderFontSize');
      const parsedSize = parseInt(savedSize, 10);
      if (!isNaN(parsedSize) && parsedSize >= 80 && parsedSize <= 200) {
        return parsedSize;
      }
    } catch (error) {
      console.error("Failed to read font size from localStorage", error);
    }
    return 100;
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentTocHref, setCurrentTocHref] = useState('');

  // State for the pop-up selection menu (non-iPad)
  const [selectionMenu, setSelectionMenu] = useState({
    visible: false,
    top: null,
    left: null,
    cfiRange: null,
  });

  // State for the highlight dialog (iPad)
  const [isHighlightDialogVisible, setIsHighlightDialogVisible] = useState(false);

  // --- Robust Chapter Finder ---
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
        if (item.subitems) {
          search(item.subitems);
        }
      }
    };
    search(tocItems);
    return bestMatch;
  }, []);

  // --- Progress Saving Logic ---
  const saveProgress = useCallback(debounce(async (cfi) => {
    if (!currentUser || !book) return;
    try {
      await fetch(`/api/progress/${currentUser.username}/${book.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentCfi: cfi })
      });
    } catch (err) {
      console.error('Failed to save progress:', err);
    }
  }, 2000), [currentUser, book]);

  // --- Hide selection menu ---
  const hideSelectionMenu = useCallback(() => {
    setSelectionMenu(prev => ({ ...prev, visible: false, cfiRange: null }));
  }, []);

  // --- Apply Highlight ---
  const applyHighlight = useCallback(async (cfiRange) => {
    if (!cfiRange || !renditionRef.current) return;
    try {
      await renditionRef.current.annotations.add("highlight", cfiRange, {}, (e) => {
        console.log("highlight clicked", e.target);
      }, "epub-highlight", {});
      if (currentUser && book) {
        await fetch('/api/highlights', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: currentUser.username,
            bookId: book.id,
            cfiRange: cfiRange,
          }),
        });
      }
      if (renditionRef.current.getContents()) {
        renditionRef.current.getContents().window.getSelection().removeAllRanges();
      }
    } catch (error) {
      console.error("Error applying highlight:", error);
    }
    hideSelectionMenu();
  }, [currentUser, book, hideSelectionMenu]);

  // --- Search and Highlight (for iPad) ---
  const handleSearchAndHighlight = useCallback(async (text) => {
    setIsHighlightDialogVisible(false);
    if (!text || !bookRef.current) return;

    try {
      // Search all sections of the book
      const results = await Promise.all(
        bookRef.current.spine.spineItems.map(item => {
          return item.load(bookRef.current.load.bind(bookRef.current))
            .then(doc => item.find(text))
            .finally(item.unload.bind(item));
        })
      );
      
      const flattenedResults = [].concat.apply([], results);

      if (flattenedResults.length > 0) {
        const firstResultCfi = flattenedResults[0].cfi;
        await applyHighlight(firstResultCfi);
        // Optional: navigate to the highlight
        renditionRef.current.display(firstResultCfi);
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

        const bookUrl = `/api/books/${book.id}/view`;
        const response = await fetch(bookUrl);
        if (!response.ok) throw new Error(`Failed to fetch book: ${response.statusText}`);
        const arrayBuffer = await response.arrayBuffer();
        if (!isMounted) return;

        const epubBook = ePub(arrayBuffer, { allowScriptedContent: true });
        bookRef.current = epubBook;

        rendition = epubBook.renderTo(viewerRef.current, {
          width: '100%',
          height: '100%',
          flow: 'paginated',
          spread: 'none'
        });
        renditionRef.current = rendition;
        
        rendition.themes.register("highlightTheme", {
          "::selection": { "background": "rgba(255, 255, 0, 0.3)" },
          ".epub-highlight": { "background-color": "yellow", "mix-blend-mode": "multiply" }
        });
        rendition.themes.select("highlightTheme");

        await epubBook.ready;
        const nav = await epubBook.loaded.navigation;
        const fullToc = nav.toc;
        
        if (isMounted) {
          setToc(fullToc);

          let initialLocation = undefined;
          if (currentUser) {
            try {
              const [progressRes, highlightsRes] = await Promise.all([
                fetch(`/api/progress/${currentUser.username}/${book.id}`),
                fetch(`/api/highlights/${currentUser.username}/${book.id}`)
              ]);
              const progressData = await progressRes.json();
              if (progressData.success && progressData.progress?.current_cfi) {
                initialLocation = progressData.progress.current_cfi;
              }
              const highlightsData = await highlightsRes.json();
              if (highlightsData.success && highlightsData.highlights) {
                highlightsData.highlights.forEach(hl => {
                  rendition.annotations.add("highlight", hl.cfi_range, {}, (e) => {
                    console.log("highlight clicked", e.target);
                  }, "epub-highlight", {});
                });
              }
            } catch (err) {
              console.error('Failed to load progress or highlights:', err);
            }
          }

          rendition.on('relocated', (locationData) => {
            if (isMounted) {
              hideSelectionMenu();
              const chapter = findChapter(fullToc, locationData.start.href);
              setLocation(chapter ? chapter.label.trim() : '...');
              setCurrentTocHref(locationData.start.href.split('#')[0]);
              saveProgress(locationData.start.cfi);
            }
          });

          // --- Main Selection Logic ---
          rendition.on('selected', (cfiRange, contents) => {
            // Disable pop-up menu on iPad to avoid conflicts
            if (isIPad) {
              return;
            }
            const selection = contents.window.getSelection();
            if (selection && !selection.isCollapsed) {
              const range = selection.getRangeAt(0);
              const rect = range.getBoundingClientRect();
              const viewerRect = viewerRef.current.getBoundingClientRect();
              const wrapperRect = viewerWrapperRef.current.getBoundingClientRect();
              const top = (viewerRect.top + rect.top) - wrapperRect.top;
              const left = (viewerRect.left + rect.left + rect.width / 2) - wrapperRect.left;
              justSelected.current = true;
              setSelectionMenu({
                visible: true,
                top: top,
                left: left,
                cfiRange: cfiRange,
              });
            }
          });

          document.addEventListener('click', handleDocumentClick);

          await rendition.display(initialLocation);
          const currentLocation = rendition.currentLocation();
          const initialChapter = findChapter(fullToc, currentLocation.start.href);
          if (isMounted) {
            setLocation(initialChapter ? initialChapter.label.trim() : '...');
            setCurrentTocHref(currentLocation.start.href.split('#')[0]);
          }
          
          const viewerElement = viewerRef.current;
          if (viewerElement) {
            rendition.resize(viewerElement.clientWidth, viewerElement.clientHeight);
          }

          rendition.themes.fontSize(`${fontSize}%`);
          setIsLoading(false);
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
      document.removeEventListener('click', handleDocumentClick);
      if (bookRef.current) bookRef.current.destroy();
    };
  }, [book, currentUser, saveProgress, findChapter, hideSelectionMenu, applyHighlight, handleSearchAndHighlight]);

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
      <div className="reader-header">
        <button className="back-button" onClick={onBack} title="返回书库">
          ←
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