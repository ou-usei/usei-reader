// server/src/services/auth.service.js
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

/**
 * 注册新用户
 * @param {string} email - 用户邮箱
 * @param {string} password - 用户密码
 * @returns {Promise<Object>} 创建的用户对象 (不含密码)
 */
export async function register(email, password) {
  if (!email || !password) {
    throw new Error('邮箱和密码不能为空');
  }

  // 检查用户是否已存在
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new Error('该邮箱已被注册');
  }

  // 哈希密码
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // 创建用户
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
    },
  });

  // 返回不含密码的用户信息
  const { passwordHash: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

/**
 * 用户登录
 * @param {string} email - 用户邮箱
 * @param {string} password - 用户密码
 * @returns {Promise<string>} JWT
 */
export async function login(email, password) {
  if (!email || !password) {
    throw new Error('邮箱和密码不能为空');
  }

  // 查找用户
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error('无效的邮箱或密码');
  }

  // 验证密码
  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    throw new Error('无效的邮箱或密码');
  }

  // 生成 JWT
  const token = jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' } // 令牌有效期 7 天
  );

  return token;
}
