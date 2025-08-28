import { describe, it, expect, vi, afterEach } from 'vitest';
import { getReadingProgress, saveReadingProgress } from '../../src/services/progressService.js';
import * as progressDal from '../../src/dal/progressDal.js';

// Mock the DAL module
vi.mock('../../src/dal/progressDal.js');

describe('Progress Service', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getReadingProgress', () => {
    it('should call the DAL to get progress', async () => {
      const mockProgress = { userId: 1, bookId: 1, current_cfi: 'epubcfi(/6/2[item1]!/4/1:0)' };
      vi.mocked(progressDal.getProgress).mockResolvedValue(mockProgress);

      const result = await getReadingProgress(1, 1);

      expect(progressDal.getProgress).toHaveBeenCalledWith(1, 1);
      expect(result).toEqual(mockProgress);
    });
  });

  describe('saveReadingProgress', () => {
    it('should call the DAL to upsert progress', async () => {
      const progressData = {
        userId: 1,
        bookId: 1,
        current_cfi: 'epubcfi(/6/4[item2]!/4/1:0)',
        progress_percentage: 50,
      };
      vi.mocked(progressDal.upsertProgress).mockResolvedValue(progressData);

      const result = await saveReadingProgress(progressData);

      expect(progressDal.upsertProgress).toHaveBeenCalledWith(progressData);
      expect(result).toEqual(progressData);
    });
  });
});
