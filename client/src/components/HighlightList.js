import React from 'react';
import './HighlightList.css';

const HighlightList = ({ highlights }) => {
  if (!highlights || highlights.length === 0) {
    return <p>No highlights for this book yet.</p>;
  }

  return (
    <ul className="highlight-list">
      {highlights.map((hl) => (
        <li key={hl.id}>
          <p className="highlight-text">"{hl.text_content}"</p>
          {hl.note && <p className="highlight-note">Note: {hl.note}</p>}
        </li>
      ))}
    </ul>
  );
};

export default HighlightList;
