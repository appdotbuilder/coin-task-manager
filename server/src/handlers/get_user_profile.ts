import { db } from '../db';
import { usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type PublicUser } from '../schema';

export const getUserProfile = async (userId: number): Promise<PublicUser> => {
  try {
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.user_id, userId))
      .execute();

    if (users.length === 0) {
      throw new Error('User not found');
    }

    const user = users[0];

    // Convert numeric fields back to numbers and create public user object
    return {
      user_id: user.user_id,
      username: user.username,
      coin: parseFloat(user.coin), // Convert string back to number
      created_at: user.created_at
    };
  } catch (error) {
    console.error('Failed to get user profile:', error);
    throw error;
  }
};