import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { createBook, deleteBook, getAllBooks, getBookViewUrl } from '../../src/services/book.service.js';
import * as bookDal from '../../src/dal/book.dal.js';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getS3Client } from '../../src/config/r2-client.js';

// Mock dependencies using Vitest's hoisting
vi.mock('../../src/dal/book.dal.js');
vi.mock('@aws-sdk/lib-storage');
vi.mock('@aws-sdk/s3-request-presigner');
vi.mock('../../src/config/r2-client.js');

describe('Book Service (Vitest)', () => {
  const mockS3Client = { send: vi.fn() };

  beforeEach(() => {
    vi.mocked(getS3Client).mockReturnValue(mockS3Client);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllBooks', () => {
    it('should return all books from the DAL', async () => {
      const mockBooks = [{ id: 1, title: 'Book 1' }];
      vi.mocked(bookDal.getAllBooks).mockResolvedValue(mockBooks);
      
      const books = await getAllBooks();
      
      expect(books).toEqual(mockBooks);
      expect(bookDal.getAllBooks).toHaveBeenCalledTimes(1);
    });
  });

  describe('getBookViewUrl', () => {
    it('should return a signed URL for a given book UUID', async () => {
      const uuid = 'test-uuid';
      const mockFile = { r2_path: 'path/to/file.epub' };
      const signedUrl = 'http://signed-url.com';

      vi.mocked(bookDal.getBookFileByUuid).mockResolvedValue(mockFile);
      vi.mocked(getSignedUrl).mockResolvedValue(signedUrl);

      const url = await getBookViewUrl(uuid);

      expect(bookDal.getBookFileByUuid).toHaveBeenCalledWith(uuid);
      expect(getSignedUrl).toHaveBeenCalled();
      expect(url).toBe(signedUrl);
    });

    it('should throw an error if book not found', async () => {
      vi.mocked(bookDal.getBookFileByUuid).mockResolvedValue(null);
      await expect(getBookViewUrl('non-existent-uuid')).rejects.toThrow('Book not found');
    });
  });

  describe('createBook', () => {
    it('should upload a file and create a book record', async () => {
      const file = {
        originalname: 'book.epub',
        buffer: Buffer.from('test'),
        mimetype: 'application/epub+zip',
      };
      const body = { title: 'Test Book', author: 'Test Author' };
      const mockCreatedBook = { id: 1, ...body };

      const mockUploadInstance = { done: vi.fn().mockResolvedValue({}) };
      vi.mocked(Upload).mockImplementation(() => mockUploadInstance);
      vi.mocked(bookDal.createBookWithFile).mockResolvedValue(mockCreatedBook);

      const result = await createBook(file, body);

      expect(Upload).toHaveBeenCalled();
      expect(mockUploadInstance.done).toHaveBeenCalled();
      expect(bookDal.createBookWithFile).toHaveBeenCalled();
      expect(result).toEqual(mockCreatedBook);
    });
  });

  describe('deleteBook', () => {
    it('should delete the book file and record', async () => {
      const uuid = 'test-uuid';
      const mockFile = { r2_path: 'path/to/file.epub' };
      
      vi.mocked(bookDal.getBookFileByUuid).mockResolvedValue(mockFile);
      vi.mocked(bookDal.deleteBookByUuid).mockResolvedValue({ id: 1 });
      mockS3Client.send.mockResolvedValue({});

      await deleteBook(uuid);

      expect(bookDal.getBookFileByUuid).toHaveBeenCalledWith(uuid);
      expect(mockS3Client.send).toHaveBeenCalled();
      expect(bookDal.deleteBookByUuid).toHaveBeenCalledWith(uuid);
    });

     it('should not try to delete from S3 if book file does not exist', async () => {
      const uuid = 'test-uuid';
      
      vi.mocked(bookDal.getBookFileByUuid).mockResolvedValue(null);

      await deleteBook(uuid);

      expect(bookDal.getBookFileByUuid).toHaveBeenCalledWith(uuid);
      expect(mockS3Client.send).not.toHaveBeenCalled();
      expect(bookDal.deleteBookByUuid).toHaveBeenCalledWith(uuid);
    });
  });
});