import React, { useState, useEffect, useRef } from 'react';
import './HighlightDialog.css';

const HighlightDialog = ({ onSave, onClose }) => {
  const [text, setText] = useState('');
  const [note, setNote] = useState('');
  const textareaRef = useRef(null);

  useEffect(() => {
    // Immediately focus the textarea to make manual pasting easier.
    // This often brings up the native "Paste" context menu on mobile.
    textareaRef.current?.focus();

    // We'll still attempt to read from the clipboard automatically.
    // It may work on some browsers/platforms or if permissions are already granted.
    const pasteFromClipboard = async () => {
      if (navigator.clipboard && navigator.clipboard.readText) {
        try {
          const clipboardText = await navigator.clipboard.readText();
          if (clipboardText) {
            setText(clipboardText);
          }
        } catch (err) {
          console.error('Could not automatically read from clipboard. This is common on mobile browsers due to security restrictions.', err);
        }
      }
    };

    pasteFromClipboard();
  }, []); // Empty dependency array ensures this runs only once on mount

  const handleSave = () => {
    if (text.trim()) {
      onSave(text.trim(), note.trim());
    }
  };

  return (
    <div className="highlight-dialog-overlay" onClick={onClose}>
      <div className="highlight-dialog-content" onClick={(e) => e.stopPropagation()}>
        <h3>Paste Text to Highlight</h3>
        <p>Paste the text you copied from the reader below, and the system will automatically highlight the matching content.</p>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.e.target.value)}
          placeholder="Paste text here..."
          rows="5"
        />
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note (optional)..."
          rows="3"
        />
        <div className="highlight-dialog-buttons">
          <button onClick={onClose} className="cancel-button">Cancel</button>
          <button onClick={handleSave} className="save-button">Save Highlight</button>
        </div>
      </div>
    </div>
  );
};

export default HighlightDialog;

