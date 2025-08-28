import prisma from '../config/db.js';

export const getAllBooks = async () => {
  return prisma.book.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      files: {
        where: { format: 'epub' },
        select: { original_filename: true },
      },
    },
  });
};

export const getBookFileByUuid = async (uuid) => {
  return prisma.bookFile.findFirst({
    where: {
      book: {
        uuid: uuid,
      },
      format: 'epub',
    },
  });
};

export const createBookWithFile = async (bookData, fileData) => {
  return prisma.book.create({
    data: {
      ...bookData,
      files: {
        create: fileData,
      },
    },
  });
};

export const deleteBookByUuid = async (uuid) => {
  return prisma.book.delete({
    where: { uuid },
  });
};