import React, { useState } from 'react';
import NoteDialog from './NoteDialog';
import './SelectionMenu.css';

const SelectionMenu = ({ top, left, onHighlight }) => {
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);

  if (top === null) {
    return null;
  }

  const handleAddNoteClick = () => {
    setIsNoteDialogOpen(true);
  };

  const handleSaveNote = (note) => {
    onHighlight(note);
  };

  return (
    <>
      <div className="selection-menu" style={{ top: `${top}px`, left: `${left}px` }}>
        <button onClick={() => onHighlight()}>Highlight</button>
        <button onClick={handleAddNoteClick}>Add Note</button>
      </div>
      <NoteDialog
        isOpen={isNoteDialogOpen}
        onClose={() => setIsNoteDialogOpen(false)}
        onSave={handleSaveNote}
      />
    </>
  );
};

export default SelectionMenu;

