import { db } from '../db';
import { tasksTable, usersTable, taskLogTable } from '../db/schema';
import { type CompleteTaskInput, type Task } from '../schema';
import { eq, sql } from 'drizzle-orm';

export async function completeTask(input: CompleteTaskInput, userId: number): Promise<Task> {
  try {
    return await db.transaction(async (tx) => {
      // 1. Verify that the task exists and has 'open' status
      const existingTasks = await tx.select()
        .from(tasksTable)
        .where(eq(tasksTable.task_id, input.task_id))
        .execute();

      if (existingTasks.length === 0) {
        throw new Error('Task not found');
      }

      const task = existingTasks[0];

      if (task.status !== 'open') {
        throw new Error('Task is already completed or not available');
      }

      // 2. Verify that the user completing the task is not the creator
      if (task.creator_user_id === userId) {
        throw new Error('Cannot complete your own task');
      }

      // 3. Verify that the executor user exists
      const executorUsers = await tx.select()
        .from(usersTable)
        .where(eq(usersTable.user_id, userId))
        .execute();

      if (executorUsers.length === 0) {
        throw new Error('Executor user not found');
      }

      const executorUser = executorUsers[0];

      // 4. Update the task status to 'completed'
      const updatedTasks = await tx.update(tasksTable)
        .set({ status: 'completed' })
        .where(eq(tasksTable.task_id, input.task_id))
        .returning()
        .execute();

      const updatedTask = updatedTasks[0];

      // 5. Add the coin reward to the executor's balance
      const currentCoin = parseFloat(executorUser.coin);
      const rewardAmount = parseFloat(updatedTask.coin_reward);
      const newCoinBalance = currentCoin + rewardAmount;

      await tx.update(usersTable)
        .set({ coin: newCoinBalance.toString() })
        .where(eq(usersTable.user_id, userId))
        .execute();

      // 6. Create a task log entry recording the completion
      await tx.insert(taskLogTable)
        .values({
          task_id: input.task_id,
          executor_user_id: userId
        })
        .execute();

      // 7. Return the updated task data with proper numeric conversion
      return {
        ...updatedTask,
        coin_reward: parseFloat(updatedTask.coin_reward)
      };
    });
  } catch (error) {
    console.error('Task completion failed:', error);
    throw error;
  }
}