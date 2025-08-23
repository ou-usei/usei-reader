import React, { useState, useEffect, useRef } from 'react';
import './HighlightDialog.css';

const HighlightDialog = ({ onSave, onClose }) => {
  const [text, setText] = useState('');
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
      onSave(text.trim());
    }
  };

  return (
    <div className="highlight-dialog-overlay" onClick={onClose}>
      <div className="highlight-dialog-content" onClick={(e) => e.stopPropagation()}>
        <h3>粘贴文本以高亮</h3>
        <p>将您在阅读器中复制的文本粘贴到下方，系统将自动高亮匹配的内容。</p>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="在此处粘贴文本..."
          rows="5"
        />
        <div className="highlight-dialog-buttons">
          <button onClick={onClose} className="cancel-button">取消</button>
          <button onClick={handleSave} className="save-button">保存高亮</button>
        </div>
      </div>
    </div>
  );
};

export default HighlightDialog;
