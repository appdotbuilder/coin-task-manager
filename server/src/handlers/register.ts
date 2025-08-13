import { db } from '../db';
import { usersTable } from '../db/schema';
import { type RegisterInput, type PublicUser } from '../schema';
import { eq } from 'drizzle-orm';
import { createHash, randomBytes } from 'crypto';

export async function register(input: RegisterInput): Promise<PublicUser> {
  try {
    // 1. Check if username already exists
    const existingUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.username, input.username))
      .execute();

    if (existingUsers.length > 0) {
      throw new Error('Username already exists');
    }

    // 2. Hash the password using crypto module
    const salt = randomBytes(16).toString('hex');
    const passwordHash = createHash('sha256').update(input.password + salt).digest('hex') + ':' + salt;

    // 3. Create new user record with initial coin balance
    const result = await db.insert(usersTable)
      .values({
        username: input.username,
        password_hash: passwordHash,
        coin: '100.00' // Convert number to string for numeric column
      })
      .returning()
      .execute();

    // 4. Return public user data (excluding password hash)
    const newUser = result[0];
    return {
      user_id: newUser.user_id,
      username: newUser.username,
      coin: parseFloat(newUser.coin), // Convert string back to number
      created_at: newUser.created_at
    };
  } catch (error) {
    console.error('User registration failed:', error);
    throw error;
  }
}