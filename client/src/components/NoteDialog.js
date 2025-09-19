import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import { Button } from './ui/button.jsx';
import { Textarea } from './ui/textarea';

const NoteDialog = ({ isOpen, onClose, onSave }) => {
  const [note, setNote] = useState('');

  const handleSave = () => {
    onSave(note);
    onClose();
    setNote('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a Note</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Textarea
            placeholder="Type your note here..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Note</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NoteDialog;
