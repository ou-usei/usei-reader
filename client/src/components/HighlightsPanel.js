import React from 'react';
import useReaderStore from '../stores/readerStore';
import './HighlightsPanel.css';

const HighlightsPanel = ({ onHighlightClick }) => {
  const { highlights } = useReaderStore();

  if (!highlights || highlights.length === 0) {
    return (
      <div className="highlights-panel">
        <h3>Highlights</h3>
        <p>No highlights for this book yet.</p>
      </div>
    );
  }

  return (
    <div className="highlights-panel">
      <h3>Highlights</h3>
      <ul>
        {highlights.map((hl) => (
          <li key={hl.id} onClick={() => onHighlightClick(hl.cfi_range)}>
            <p className="highlight-text">"{hl.text_content}"</p>
            {hl.note && <p className="highlight-note">Note: {hl.note}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default HighlightsPanel;
