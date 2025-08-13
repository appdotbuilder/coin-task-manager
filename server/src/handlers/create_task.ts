import { db } from '../db';
import { usersTable, tasksTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type CreateTaskInput, type Task } from '../schema';

export const createTask = async (input: CreateTaskInput, userId: number): Promise<Task> => {
  try {
    // Start a transaction to ensure atomic operation
    return await db.transaction(async (tx) => {
      // Check user's current balance
      const users = await tx.select()
        .from(usersTable)
        .where(eq(usersTable.user_id, userId))
        .execute();

      if (users.length === 0) {
        throw new Error('User not found');
      }

      const user = users[0];
      const currentBalance = parseFloat(user.coin);

      if (currentBalance < input.coin_reward) {
        throw new Error('Insufficient coin balance');
      }

      // Deduct coins from user's balance
      const newBalance = currentBalance - input.coin_reward;
      await tx.update(usersTable)
        .set({ coin: newBalance.toString() }) // Convert number to string for numeric column
        .where(eq(usersTable.user_id, userId))
        .execute();

      // Create the task
      const taskResult = await tx.insert(tasksTable)
        .values({
          creator_user_id: userId,
          link: input.link,
          coin_reward: input.coin_reward.toString(), // Convert number to string for numeric column
          status: 'open'
        })
        .returning()
        .execute();

      const task = taskResult[0];

      // Convert numeric fields back to numbers before returning
      return {
        task_id: task.task_id,
        creator_user_id: task.creator_user_id,
        link: task.link,
        coin_reward: parseFloat(task.coin_reward), // Convert string back to number
        status: task.status,
        created_at: task.created_at
      };
    });
  } catch (error) {
    console.error('Task creation failed:', error);
    throw error;
  }
};