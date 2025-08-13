import { db } from '../db';
import { usersTable } from '../db/schema';
import { type PublicUser } from '../schema';
import { eq } from 'drizzle-orm';

export const getUserProfile = async (userId: number): Promise<PublicUser> => {
  try {
    // Query user from database by user_id
    const results = await db.select()
      .from(usersTable)
      .where(eq(usersTable.user_id, userId))
      .execute();

    if (results.length === 0) {
      throw new Error('User not found');
    }

    const user = results[0];
    
    // Return public user data with numeric conversion for coin field
    return {
      user_id: user.user_id,
      username: user.username,
      coin: parseFloat(user.coin), // Convert numeric to number
      created_at: user.created_at
    };
  } catch (error) {
    console.error('Get user profile failed:', error);
    throw error;
  }
};