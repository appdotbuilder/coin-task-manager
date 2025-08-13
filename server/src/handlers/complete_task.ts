import { db } from '../db';
import { tasksTable, usersTable, taskLogTable } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { type CompleteTaskInput, type Task } from '../schema';

export const completeTask = async (input: CompleteTaskInput, userId: number): Promise<Task> => {
  try {
    // Start a transaction to ensure atomic operation
    return await db.transaction(async (tx) => {
      // Get the task details and verify it's open
      const tasks = await tx.select()
        .from(tasksTable)
        .where(and(
          eq(tasksTable.task_id, input.task_id),
          eq(tasksTable.status, 'open')
        ))
        .execute();

      if (tasks.length === 0) {
        throw new Error('Task not found or already completed');
      }

      const task = tasks[0];

      // Prevent user from completing their own task
      if (task.creator_user_id === userId) {
        throw new Error('You cannot complete your own task');
      }

      // Get executor's current balance
      const users = await tx.select()
        .from(usersTable)
        .where(eq(usersTable.user_id, userId))
        .execute();

      if (users.length === 0) {
        throw new Error('Executor user not found');
      }

      const user = users[0];
      const currentBalance = parseFloat(user.coin);
      const taskReward = parseFloat(task.coin_reward);

      // Award coins to the executor
      const newBalance = currentBalance + taskReward;
      await tx.update(usersTable)
        .set({ coin: newBalance.toString() }) // Convert number to string for numeric column
        .where(eq(usersTable.user_id, userId))
        .execute();

      // Mark task as completed
      await tx.update(tasksTable)
        .set({ status: 'completed' })
        .where(eq(tasksTable.task_id, input.task_id))
        .execute();

      // Log the completion
      await tx.insert(taskLogTable)
        .values({
          task_id: input.task_id,
          executor_user_id: userId
        })
        .execute();

      // Return the completed task with updated status
      return {
        task_id: task.task_id,
        creator_user_id: task.creator_user_id,
        link: task.link,
        coin_reward: parseFloat(task.coin_reward), // Convert string back to number
        status: 'completed' as const,
        created_at: task.created_at
      };
    });
  } catch (error) {
    console.error('Task completion failed:', error);
    throw error;
  }
};