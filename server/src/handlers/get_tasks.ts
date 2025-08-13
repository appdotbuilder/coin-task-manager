import { db } from '../db';
import { tasksTable, usersTable } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { type TaskWithCreator } from '../schema';

export const getTasks = async (): Promise<TaskWithCreator[]> => {
  try {
    // Get all open tasks with creator information
    const results = await db.select()
      .from(tasksTable)
      .innerJoin(usersTable, eq(tasksTable.creator_user_id, usersTable.user_id))
      .where(eq(tasksTable.status, 'open'))
      .execute();

    // Transform the joined results
    return results.map(result => ({
      task_id: result.tasks.task_id,
      creator_user_id: result.tasks.creator_user_id,
      creator_username: result.users.username,
      link: result.tasks.link,
      coin_reward: parseFloat(result.tasks.coin_reward), // Convert string back to number
      status: result.tasks.status,
      created_at: result.tasks.created_at
    }));
  } catch (error) {
    console.error('Failed to get tasks:', error);
    throw error;
  }
};