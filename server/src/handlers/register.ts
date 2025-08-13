import { db } from '../db';
import { usersTable } from '../db/schema';
import { createHash, randomBytes } from 'crypto';
import { type RegisterInput, type PublicUser } from '../schema';

export const register = async (input: RegisterInput): Promise<PublicUser> => {
  try {
    // Hash password with salt using crypto
    const salt = randomBytes(16).toString('hex');
    const hash = createHash('sha256').update(input.password + salt).digest('hex');
    const password_hash = `${hash}:${salt}`;
    
    // Insert user record with default coin balance
    const result = await db.insert(usersTable)
      .values({
        username: input.username,
        password_hash: password_hash,
        coin: '100.00' // Default starting balance as string for numeric column
      })
      .returning()
      .execute();

    const user = result[0];
    
    // Return public user object directly
    return {
      user_id: user.user_id,
      username: user.username,
      coin: parseFloat(user.coin), // Convert string back to number
      created_at: user.created_at
    };
  } catch (error: any) {
    // Handle unique constraint violation (duplicate username)
    if (error.code === '23505' && error.constraint === 'users_username_unique') {
      throw new Error('Username already exists');
    }
    console.error('Registration failed:', error);
    throw new Error('Registration failed');
  }
};