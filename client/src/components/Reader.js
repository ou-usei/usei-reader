import React, { useState, useEffect, useRef, useCallback } from 'react';
import ePub from 'epubjs';
import TocItem from './TocItem';
import SelectionMenu from './SelectionMenu'; // Import the new component
import './Reader.css';

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
  const [isTocVisible, setIsTocVisible] = useState(true);
  const [fontSize, setFontSize] = useState(100);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentTocHref, setCurrentTocHref] = useState('');

  // State for the selection menu
  const [selectionMenu, setSelectionMenu] = useState({
    visible: false,
    top: null,
    left: null,
    cfiRange: null,
  });

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
  const applyHighlight = useCallback(async () => {
    const { cfiRange } = selectionMenu;
    if (cfiRange && renditionRef.current) {
      try {
        // 1. Add highlight visually
        await renditionRef.current.annotations.add("highlight", cfiRange, {}, (e) => {
          console.log("highlight clicked", e.target);
        }, "epub-highlight", {});

        // 2. Save highlight to the backend
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
        
        // 3. Deselect text after highlighting
        renditionRef.current.getContents().window.getSelection().removeAllRanges();

      } catch (error) {
        console.error("Error applying highlight:", error);
      }
    }
    hideSelectionMenu();
  }, [selectionMenu, hideSelectionMenu, currentUser, book]);


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
          spread: 'none' // Force single column
        });
        renditionRef.current = rendition;
        
        // Correctly register the theme for both selection and persistent highlights
        rendition.themes.register("highlightTheme", {
          "::selection": {
            "background": "rgba(255, 255, 0, 0.3)"
          },
          ".epub-highlight": {
            "background-color": "yellow",
            "mix-blend-mode": "multiply"
          }
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
              // Fetch both progress and highlights
              const progressPromise = fetch(`/api/progress/${currentUser.username}/${book.id}`);
              const highlightsPromise = fetch(`/api/highlights/${currentUser.username}/${book.id}`);

              const [progressRes, highlightsRes] = await Promise.all([progressPromise, highlightsPromise]);

              // Process progress
              const progressData = await progressRes.json();
              if (progressData.success && progressData.progress?.current_cfi) {
                initialLocation = progressData.progress.current_cfi;
              }

              // Process and display highlights
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
              const cleanHref = locationData.start.href.split('#')[0];
              setCurrentTocHref(cleanHref);
              saveProgress(locationData.start.cfi);
            }
          });

          // --- Show selection menu logic ---
          const showSelectionMenu = (cfiRange, contents) => {
            const selection = contents.window.getSelection();
            if (selection && !selection.isCollapsed) {
              const range = selection.getRangeAt(0);
              const rect = range.getBoundingClientRect(); // Position within iframe
              const viewerRect = viewerRef.current.getBoundingClientRect(); // Position of #viewer on main page
              const wrapperRect = viewerWrapperRef.current.getBoundingClientRect(); // Position of #viewer-wrapper on main page

              // Calculate the final position relative to the wrapper
              const top = (viewerRect.top + rect.top) - wrapperRect.top;
              const left = (viewerRect.left + rect.left + rect.width / 2) - wrapperRect.left;

              justSelected.current = true; // Set the flag

              setSelectionMenu({
                visible: true,
                top: top,
                left: left,
                cfiRange: cfiRange,
              });
            }
          };

          // For Desktop (mouse events)
          rendition.on('selected', (cfiRange, contents) => {
            showSelectionMenu(cfiRange, contents);
          });

          // For Mobile (touch events)
          rendition.on('rendered', (section) => {
            const iframeDoc = section.document;
            iframeDoc.addEventListener('touchend', () => {
              setTimeout(() => {
                const selection = iframeDoc.getSelection();
                if (selection && !selection.isCollapsed) {
                  const cfiRange = rendition.currentLocation().start.cfi;
                  // Note: This CFI range from currentLocation might not be perfectly accurate
                  // for the selection, but it's the best we can get easily on touchend.
                  // For a more precise CFI, a more complex range calculation would be needed.
                  showSelectionMenu(cfiRange, { window: iframeDoc.defaultView });
                }
              }, 100); // A small delay to allow the selection to finalize
            });
          });

          // Add click listener to the parent document to hide the menu
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
  }, [book, currentUser, saveProgress, findChapter, hideSelectionMenu]);

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
      <div className="reader-header">
        <button className="back-button" onClick={onBack}>← 返回书库</button>
        <button className="toc-toggle-button" onClick={() => setIsTocVisible(!isTocVisible)}>
          {isTocVisible ? '隐藏目录' : '目录'}
        </button>
        <div className="book-title-header">
          <h2>{book.title}</h2>
          <span>{isLoading ? '加载中...' : error || location}</span>
        </div>
        <div className="reader-settings">
          <span>字体:</span>
          <button onClick={() => changeFontSize(-10)} disabled={isLoading}>A-</button>
          <span>{fontSize}%</span>
          <button onClick={() => changeFontSize(10)} disabled={isLoading}>A+</button>
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
          
          {selectionMenu.visible && (
            <SelectionMenu 
              top={selectionMenu.top}
              left={selectionMenu.left}
              onHighlight={applyHighlight}
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
