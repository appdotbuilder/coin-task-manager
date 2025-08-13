import { db } from '../db';
import { usersTable, tasksTable } from '../db/schema';
import { type CreateTaskInput, type Task } from '../schema';
import { eq } from 'drizzle-orm';

export async function createTask(input: CreateTaskInput, userId: number): Promise<Task> {
  try {
    // Use transaction to ensure atomicity
    const result = await db.transaction(async (tx) => {
      // 1. Check if user exists and has sufficient coin balance
      const users = await tx.select()
        .from(usersTable)
        .where(eq(usersTable.user_id, userId))
        .execute();

      if (users.length === 0) {
        throw new Error('User not found');
      }

      const user = users[0];
      const userBalance = parseFloat(user.coin);
      
      if (userBalance < input.coin_reward) {
        throw new Error('Insufficient coin balance');
      }

      // 2. Deduct the coin reward amount from user's balance
      const newBalance = userBalance - input.coin_reward;
      await tx.update(usersTable)
        .set({ coin: newBalance.toString() })
        .where(eq(usersTable.user_id, userId))
        .execute();

      // 3. Create new task record with 'open' status
      const taskResult = await tx.insert(tasksTable)
        .values({
          creator_user_id: userId,
          link: input.link,
          coin_reward: input.coin_reward.toString(), // Convert number to string for numeric column
          status: 'open'
        })
        .returning()
        .execute();

      return taskResult[0];
    });

    // 4. Return the created task data with numeric conversions
    return {
      ...result,
      coin_reward: parseFloat(result.coin_reward) // Convert string back to number
    };
  } catch (error) {
    console.error('Task creation failed:', error);
    throw error;
  }
}