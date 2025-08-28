import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';

// --- 配置 ---
// 显式指定 .env 文件的路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import('dotenv').then(dotenv => dotenv.config({ path: path.resolve(__dirname, '../.env') }));

import { PrismaClient as LocalPrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';

// --- 配置 ---
// 1. 初始化本地 Prisma 客户端
const localPrisma = new LocalPrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// 2. 初始化 Supabase 客户端
const supabaseUrl = process.env.SUPABASE_URL; // 请确保在 .env 中设置了 SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY; // 请确保在 .env 中设置了 SUPABASE_SERVICE_KEY
const supabase = createClient(supabaseUrl, supabaseKey);

const SALT_ROUNDS = 10;

async function main() {
  console.log('🚀 开始从 Supabase 迁移数据...');

  // --- 1. 迁移用户 ---
  console.log(' fetching users from Supabase...');
  const { data: users, error: usersError } = await supabase.from('users').select('*');
  if (usersError) throw new Error(`无法获取用户: ${usersError.message}`);

  console.log(`🚚 找到了 ${users.length} 个用户进行迁移...`);
  for (const user of users) {
    // 为简单起见，我们为每个用户生成一个临时密码。
    // 在实际应用中，您可能需要一个密码重置流程。
    const tempPassword = `${user.username}_${Date.now()}`;
    const passwordHash = await bcrypt.hash(tempPassword, SALT_ROUNDS);

    await localPrisma.user.create({
      data: {
        email: user.email, // 假设 Supabase 中有 email 字段
        passwordHash: passwordHash,
        // 映射其他您需要的字段
      },
    });
    console.log(`✅ 成功迁移用户: ${user.email}`);
    console.log(`🔑 用户 ${user.email} 的临时密码是: ${tempPassword}`);
  }

  // --- 2. 迁移书籍和书籍文件 ---
  console.log(' fetching books from Supabase...');
  const { data: books, error: booksError } = await supabase.from('books_v2').select(`
    *,
    book_files ( * )
  `);
  if (booksError) throw new Error(`无法获取书籍: ${booksError.message}`);

  console.log(`🚚 找到了 ${books.length} 本书进行迁移...`);
  for (const book of books) {
    const createdBook = await localPrisma.book.create({
      data: {
        uuid: book.uuid,
        title: book.title,
        author: book.author,
        createdAt: book.created_at,
      },
    });

    if (book.book_files && book.book_files.length > 0) {
      for (const file of book.book_files) {
        await localPrisma.bookFile.create({
          data: {
            bookId: createdBook.id,
            format: file.format,
            r2_path: file.r2_path,
            original_filename: file.original_filename,
            createdAt: file.created_at,
          },
        });
      }
    }
    console.log(`✅ 成功迁移书籍: ${book.title}`);
  }

  // --- 3. 迁移阅读进度 ---
  console.log(' fetching reading progress from Supabase...');
  const { data: progresses, error: progressError } = await supabase.from('reading_progress').select('*');
  if (progressError) throw new Error(`无法获取阅读进度: ${progressError.message}`);

  console.log(`🚚 找到了 ${progresses.length} 条阅读进度进行迁移...`);
  for (const progress of progresses) {
    // 我们需要找到新数据库中对应的 user 和 book 的 ID
    const user = await localPrisma.user.findUnique({ where: { email: progress.username } }); // 假设 username 是 email
    const book = await localPrisma.book.findUnique({ where: { uuid: progress.book_uuid } });

    if (user && book) {
      await localPrisma.readingProgress.create({
        data: {
          userId: user.id,
          bookId: book.id,
          current_cfi: progress.current_cfi,
          progress_percentage: progress.progress_percentage,
          last_read_at: progress.last_read_at,
        },
      });
      console.log(`✅ 成功迁移 ${user.email} 对《${book.title}》的进度`);
    } else {
      console.warn(`⚠️ 跳过一条进度，因为找不到对应的用户或书籍。 User: ${progress.username}, Book UUID: ${progress.book_uuid}`);
    }
  }

  // --- 4. 迁移高亮 ---
  console.log(' fetching highlights from Supabase...');
  const { data: highlights, error: highlightsError } = await supabase.from('highlights').select('*');
  if (highlightsError) throw new Error(`无法获取高亮: ${highlightsError.message}`);

  console.log(`🚚 找到了 ${highlights.length} 条高亮进行迁移...`);
  for (const highlight of highlights) {
    const user = await localPrisma.user.findUnique({ where: { email: highlight.username } }); // 假设 username 是 email
    const book = await localPrisma.book.findUnique({ where: { uuid: highlight.book_uuid } });

    if (user && book) {
      await localPrisma.highlight.create({
        data: {
          userId: user.id,
          bookId: book.id,
          cfi_range: highlight.cfi_range,
          createdAt: highlight.created_at,
        },
      });
      console.log(`✅ 成功迁移 ${user.email} 在《${book.title}》中的一条高亮`);
    } else {
      console.warn(`⚠️ 跳过一条高亮，因为找不到对应的用户或书籍。 User: ${highlight.username}, Book UUID: ${highlight.book_uuid}`);
    }
  }

  console.log('🎉 数据迁移完成！');
}

main()
  .catch((e) => {
    console.error('❌ 迁移过程中发生错误:', e);
    process.exit(1);
  })
  .finally(async () => {
    await localPrisma.$disconnect();
  });
