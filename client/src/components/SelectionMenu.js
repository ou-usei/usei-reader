import React from 'react';
import './SelectionMenu.css';

const SelectionMenu = ({ top, left, onHighlight }) => {
  if (top === null) {
    return null;
  }

  return (
    <div className="selection-menu" style={{ top: `${top}px`, left: `${left}px` }}>
      <button onClick={onHighlight}>高亮</button>
      {/* Future buttons like "Note" or "Copy" can be added here */}
    </div>
  );
};

export default SelectionMenu;
