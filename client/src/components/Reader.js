import React, { useState, useEffect, useRef, useCallback } from 'react';
import ePub from 'epubjs';
import './Reader.css';

const Reader = ({ book, onBack }) => {
  const viewerRef = useRef(null);
  // CORRECTED: Hooks must be called at the top level of the component.
  const bookRef = useRef(null);
  const renditionRef = useRef(null);

  const [toc, setToc] = useState([]);
  const [location, setLocation] = useState('Loading...');
  const [isTocVisible, setIsTocVisible] = useState(true);
  const [fontSize, setFontSize] = useState(100);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!book || !viewerRef.current) return;

    let isMounted = true; // Flag to prevent updates on unmounted component

    const loadBook = async () => {
      try {
        // This check is important to avoid re-setting state on the second render pass
        if (isMounted) {
          setIsLoading(true);
          setError('');
          setToc([]);
        }
        
        if (viewerRef.current) {
          viewerRef.current.innerHTML = '';
        }

        const bookUrl = `/api/books/${book.id}/view`;
        const response = await fetch(bookUrl);
        if (!response.ok) throw new Error(`Failed to fetch book: ${response.statusText}`);
        const arrayBuffer = await response.arrayBuffer();

        // If component has unmounted while fetching, abort.
        if (!isMounted) return;

        const epubBook = ePub(arrayBuffer, { allowScriptedContent: true });
        bookRef.current = epubBook;

        const rendition = epubBook.renderTo(viewerRef.current, {
          width: '100%',
          height: '100%',
          flow: 'paginated',
          spread: 'auto'
        });
        renditionRef.current = rendition;
        
        await epubBook.ready;
        const nav = await epubBook.loaded.navigation;
        
        if (isMounted) {
          setToc(nav.toc);

          rendition.on('relocated', (locationData) => {
            const chapter = epubBook.navigation.get(locationData.start.href);
            // Check mount status again inside async event handler
            if(isMounted) {
              setLocation(chapter ? chapter.label.trim() : '...');
            }
          });

          await rendition.display();
          
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
      if (bookRef.current) {
        bookRef.current.destroy();
      }
    };
  }, [book]);

  // Separate effect for font size changes to avoid re-loading the book
  useEffect(() => {
    if (renditionRef.current && !isLoading) {
      renditionRef.current.themes.fontSize(`${fontSize}%`);
    }
  }, [fontSize, isLoading]);

  const handleNext = useCallback(() => {
    renditionRef.current?.next();
  }, []);

  const handlePrev = useCallback(() => {
    renditionRef.current?.prev();
  }, []);

  const handleTocClick = useCallback((href) => {
    if (renditionRef.current) {
      renditionRef.current.display(href);
      if (window.innerWidth < 768) {
        setIsTocVisible(false);
      }
    }
  }, []);

  const changeFontSize = (increment) => {
    setFontSize(prevSize => Math.max(80, Math.min(200, prevSize + increment)));
  };

  return (
    <div className="reader-container">
      <div className="reader-header">
        <button className="back-button" onClick={onBack}>← 返回书库</button>
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
        <button className="toc-toggle-button" onClick={() => setIsTocVisible(!isTocVisible)}>
          {isTocVisible ? '隐藏目录' : '显示目录'}
        </button>
      </div>

      <div className="reader-main">
        <div className={`toc-panel ${isTocVisible ? 'visible' : ''}`}>
          <h3>目录</h3>
          {isLoading ? <p>加载中...</p> : (
            <ul className="toc-list">
              {toc.map((item, index) => (
                <li key={index}>
                  <button onClick={() => handleTocClick(item.href)}>{item.label}</button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="viewer-wrapper">
          {isLoading && <div className="loader">正在加载书籍...</div>}
          {error && <div className="error-message">{error}</div>}
          <div id="viewer" ref={viewerRef} style={{ visibility: isLoading || error ? 'hidden' : 'visible' }}></div>
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
