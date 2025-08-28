// server/src/services/book.service.js
import * as bookDal from '../dal/book.dal.js';
import { getS3Client } from '../config/r2-client.js';
import { GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Upload } from '@aws-sdk/lib-storage';
import { v4 as uuidv4 } from 'uuid';

/**
 * Get all books
 * @returns {Promise<Array>} List of books
 */
export const getAllBooks = async () => {
  // DAL call
  const booksFromDb = await bookDal.getAllBooks();
  // Service logic: Reshape the data for the API response
  return booksFromDb.map(book => ({
    uuid: book.uuid,
    title: book.title,
    author: book.author,
    created_at: book.createdAt,
    original_filename: book.files[0]?.original_filename || null,
  }));
};

/**
 * Get a secure, temporary URL to view a book
 * @param {string} uuid - The UUID of the book
 * @returns {Promise<string>} The signed URL for the book file
 */
export const getBookViewUrl = async (uuid) => {
  // DAL call
  const bookFile = await bookDal.getBookFileByUuid(uuid);
  if (!bookFile) {
    throw new Error('Book not found');
  }

  // Business logic: Interact with R2
  const s3Client = getS3Client();
  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: bookFile.r2_path,
  });
  const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

  return url;
};

/**
 * Create a new book by uploading its file
 * @param {object} file - The file object from multer
 * @param {object} body - The request body
 * @returns {Promise<Book>} The created book record
 */
export const createBook = async (file, body) => {
  if (!file) {
    throw new Error('EPUB file not provided.');
  }

  const { originalname, buffer, mimetype } = file;
  const bookUUID = uuidv4();
  const r2Key = `epub/${bookUUID}/${originalname}`;

  // Business logic: Upload to R2
  const s3Client = getS3Client();
  const uploadToR2 = new Upload({
    client: s3Client,
    params: {
      Bucket: process.env.R2_BUCKET_NAME,
      Key: r2Key,
      Body: buffer,
      ContentType: mimetype,
    },
  });
  await uploadToR2.done();

  // Business logic: Prepare data for DAL
  const bookData = {
    uuid: bookUUID,
    title: body.title || originalname.substring(0, originalname.lastIndexOf('.')) || originalname,
    author: body.author || '未知作者',
  };

  const fileData = {
    format: 'epub',
    r2_path: r2Key,
    original_filename: originalname,
  };

  // DAL call
  return bookDal.createBookWithFile(bookData, fileData);
};

/**
 * Delete a book
 * @param {string} uuid - The UUID of the book to delete
 * @returns {Promise<Book>} The deleted book record
 */
export const deleteBook = async (uuid) => {
  // DAL call to get file path
  const bookFile = await bookDal.getBookFileByUuid(uuid);

  if (bookFile) {
    // Business logic: Delete from R2
    const s3Client = getS3Client();
    const command = new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: bookFile.r2_path,
    });
    await s3Client.send(command);
  }

  // DAL call to delete from database
  return bookDal.deleteBookByUuid(uuid);
};
