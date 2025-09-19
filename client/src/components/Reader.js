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
import HighlightsPanel from './HighlightsPanel';
import useReaderStore from '../stores/readerStore';
import useAuthStore from '../stores/authStore';
import './Reader.css';

const isIPad = /iPad/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const Reader = ({ book, onBack }) => {
  const viewerRef = useRef(null);
  const bookRef = useRef(null);
  const renditionRef = useRef(null);
  const lastKnownLocation = useRef(null);

  const { user } = useAuthStore();
  const { 
    fetchBookData, 
    saveProgress, 
    addHighlight, 
    deleteHighlight,
    clearReaderState
  } = useReaderStore();

  const [toc, setToc] = useState([]);
  const [location, setLocation] = useState('Loading...');
  const [isTocVisible, setIsTocVisible] = useState(false);
  const [isHighlightsPanelVisible, setIsHighlightsPanelVisible] = useState(false);
  const [fontSize, setFontSize] = useState(() => parseInt(localStorage.getItem('epubReaderFontSize') || '100', 10));
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentTocHref, setCurrentTocHref] = useState('');
  const [selectionMenu, setSelectionMenu] = useState({ visible: false, top: 0, left: 0, cfiRange: null });
  
  const hideSelectionMenu = useCallback(() => {
    setSelectionMenu(prev => ({ ...prev, visible: false }));
  }, []);

  const handleHighlightClick = (cfiRange) => {
    // Use a timeout to prevent the click from re-triggering selection
    setTimeout(() => {
      if (window.confirm('Would you like to delete this highlight?')) {
        const highlights = useReaderStore.getState().highlights;
        const highlightToDelete = highlights.find(h => h.cfi_range === cfiRange);
        
        if (highlightToDelete) {
          deleteHighlight(highlightToDelete.id)
            .then(() => {
              renditionRef.current.annotations.remove(cfiRange, "highlight");
            })
            .catch(err => {
              alert(`Failed to delete highlight: ${err.message}`);
            });
        }
      }
    }, 10);
  };

  const applyAndSaveHighlight = useCallback(async (cfiRange, note = '') => {
    if (!cfiRange || !renditionRef.current) return;
    
    try {
      // Add highlight to the view
      renditionRef.current.annotations.add("highlight", cfiRange, { note }, () => handleHighlightClick(cfiRange), "epub-highlight", {});

      // Save highlight to the backend
      const newHighlight = await addHighlight({
        bookId: book.id,
        cfi_range: cfiRange,
        note: note,
      });

      // The store is now updated, no need to do anything else locally

      renditionRef.current.getContents()?.window.getSelection().removeAllRanges();
    } catch (error) {
      console.error("Error applying highlight:", error);
      alert(`Failed to save highlight: ${error.message}`);
      // Remove the highlight from the view if saving failed
      renditionRef.current.annotations.remove(cfiRange, "highlight");
    }
    hideSelectionMenu();
  }, [book, addHighlight, hideSelectionMenu]);

  useEffect(() => {
    let isMounted = true;
    if (!book || !viewerRef.current) return;

    const loadBook = async () => {
      try {
        setIsLoading(true);
        setError('');
        
        const bookUrl = `/api/books/${book.uuid}/view`;
        const epubBook = ePub(bookUrl);
        bookRef.current = epubBook;

        const rendition = epubBook.renderTo(viewerRef.current, { width: '100%', height: '100%', flow: 'paginated' });
        renditionRef.current = rendition;

        await epubBook.ready;
        const nav = await epubBook.loaded.navigation;
        if (isMounted) setToc(nav.toc);

        // Fetch progress and highlights from the store
        const { progress, highlights, error: dataError } = await fetchBookData(book.id);
        if (!isMounted) return;

        if (dataError) throw new Error('Failed to load book data.');

        // Apply highlights
        highlights.forEach(hl => {
          rendition.annotations.add("highlight", hl.cfi_range, {}, () => handleHighlightClick(hl.cfi_range), "epub-highlight", {});
        });

        const initialLocation = progress?.cfi;
        
        rendition.on('relocated', (locationData) => {
          if (isMounted) {
            hideSelectionMenu();
            const chapter = findChapter(nav.toc, locationData.start.href);
            setLocation(chapter ? chapter.label.trim() : '...');
            setCurrentTocHref(locationData.start.href.split('#')[0]);
            lastKnownLocation.current = locationData.start.cfi;
          }
        });

        rendition.on('selected', (cfiRange, contents) => {
          const selection = contents.window.getSelection();
          if (selection && !selection.isCollapsed) {
            const rect = selection.getRangeAt(0).getBoundingClientRect();
            const viewerRect = viewerRef.current.getBoundingClientRect();
            setSelectionMenu({
              visible: true,
              top: rect.top - viewerRect.top,
              left: rect.left - viewerRect.left + rect.width / 2,
              cfiRange
            });
          }
        });

        await rendition.display(initialLocation);
        rendition.themes.fontSize(`${fontSize}%`);
        setIsLoading(false);

      } catch (err) {
        if (isMounted) {
          setError(`Failed to load book: ${err.message}`);
          setIsLoading(false);
        }
      }
    };

    loadBook();

    return () => {
      isMounted = false;
      clearReaderState();
      bookRef.current?.destroy();
    };
  }, [book, fetchBookData, clearReaderState]);

  const findChapter = (tocItems, href) => {
    const cleanHref = href.split('#')[0];
    for (const item of tocItems) {
      if (item.href.includes(cleanHref)) return item;
      if (item.subitems) {
        const subItem = findChapter(item.subitems, href);
        if (subItem) return subItem;
      }
    }
    return null;
  };

  const handleBack = async () => {
    if (user && book && lastKnownLocation.current) {
      await saveProgress(book.id, { cfi: lastKnownLocation.current });
    }
    onBack();
  };

  const handleTocClick = (href) => {
    renditionRef.current?.display(href);
    if (window.innerWidth < 768) setIsTocVisible(false);
  };
  
  const changeFontSize = (increment) => {
    const newSize = Math.max(80, Math.min(200, fontSize + increment));
    setFontSize(newSize);
    renditionRef.current?.themes.fontSize(`${newSize}%`);
    localStorage.setItem('epubReaderFontSize', newSize.toString());
  };

  const handleNext = () => renditionRef.current?.next();
  const handlePrev = () => renditionRef.current?.prev();

  return (
    <div className="reader-container">
      <div className="reader-header">
        <button className="back-button" onClick={handleBack}>←</button>
        <button className="toc-toggle-button" onClick={() => setIsTocVisible(!isTocVisible)}>
          {isTocVisible ? 'Hide' : 'Show'} TOC
        </button>
        <button className="highlights-toggle-button" onClick={() => setIsHighlightsPanelVisible(!isHighlightsPanelVisible)}>
          {isHighlightsPanelVisible ? 'Hide' : 'Show'} Highlights
        </button>
        <div className="book-title-header">
          <h2>{book.title}</h2>
          <span>{isLoading ? 'Loading...' : error || location}</span>
        </div>
        <div className="reader-settings">
          <DropdownMenu>
            <DropdownMenuTrigger asChild><button><Settings2 size={18} /></button></DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <div className="flex items-center justify-between w-full">
                  <span>Font Size:</span>
                  <button onClick={() => changeFontSize(-10)}>-</button>
                  <span>{fontSize}%</span>
                  <button onClick={() => changeFontSize(10)}>+</button>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="reader-main">
        <div className={`toc-panel ${isTocVisible ? 'visible' : ''}`}>
          <h3>Table of Contents</h3>
          <ul>{toc.map((item, i) => <TocItem key={i} item={item} onTocClick={handleTocClick} currentTocHref={currentTocHref} />)}</ul>
        </div>
        <div className={`highlights-panel-wrapper ${isHighlightsPanelVisible ? 'visible' : ''}`}>
          <HighlightsPanel onHighlightClick={(cfi) => renditionRef.current?.display(cfi)} />
        </div>
        <div className="viewer-wrapper">
          {isLoading && <div className="loader">Loading Book...</div>}
          {error && <div className="error-message">{error}</div>}
          <div id="viewer" ref={viewerRef} style={{ visibility: isLoading || error ? 'hidden' : 'visible' }}></div>
          
          {selectionMenu.visible && (
            <SelectionMenu 
              top={selectionMenu.top}
              left={selectionMenu.left}
              onHighlight={(note) => applyAndSaveHighlight(selectionMenu.cfiRange, note)}
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
