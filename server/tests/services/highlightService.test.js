import { describe, it, expect, vi, afterEach } from 'vitest';
import { getHighlightsForBook, addHighlight, removeHighlight } from '../../src/services/highlightService.js';
import * as highlightDal from '../../src/dal/highlightDal.js';

vi.mock('../../src/dal/highlightDal.js');

describe('Highlight Service', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should get highlights for a book', async () => {
    const mockHighlights = [{ id: 1, cfi_range: 'cfi1' }];
    vi.mocked(highlightDal.getHighlights).mockResolvedValue(mockHighlights);
    const result = await getHighlightsForBook(1, 1);
    expect(highlightDal.getHighlights).toHaveBeenCalledWith(1, 1);
    expect(result).toEqual(mockHighlights);
  });

  it('should add a highlight', async () => {
    const highlightData = { userId: 1, bookId: 1, cfi_range: 'cfi2' };
    vi.mocked(highlightDal.createHighlight).mockResolvedValue({ id: 2, ...highlightData });
    const result = await addHighlight(highlightData);
    expect(highlightDal.createHighlight).toHaveBeenCalledWith(highlightData);
    expect(result).toEqual({ id: 2, ...highlightData });
  });

  it('should remove a highlight', async () => {
    const mockDeletedHighlight = { id: 1, userId: 1, bookId: 1, cfi_range: 'cfi1' };
    vi.mocked(highlightDal.deleteHighlight).mockResolvedValue(mockDeletedHighlight);
    await removeHighlight(1, 1);
    expect(highlightDal.deleteHighlight).toHaveBeenCalledWith(1);
  });
});
