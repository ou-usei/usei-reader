import React, { useState } from 'react';
import './HighlightDialog.css';

const HighlightDialog = ({ onSave, onClose }) => {
  const [text, setText] = useState('');

  const handleSave = () => {
    if (text.trim()) {
      onSave(text.trim());
    }
  };

  return (
    <div className="highlight-dialog-overlay">
      <div className="highlight-dialog-content">
        <h3>粘贴文本以高亮</h3>
        <p>将您在阅读器中复制的文本粘贴到下方，系统将自动高亮匹配的内容。</p>
        <textarea
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
