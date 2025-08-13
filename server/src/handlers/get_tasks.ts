import { db } from '../db';
import { tasksTable, usersTable } from '../db/schema';
import { type TaskWithCreator } from '../schema';
import { eq, desc } from 'drizzle-orm';

export async function getTasks(): Promise<TaskWithCreator[]> {
  try {
    // Join tasks with users to get creator information
    // Only fetch tasks with 'open' status
    const results = await db.select({
      task_id: tasksTable.task_id,
      creator_user_id: tasksTable.creator_user_id,
      creator_username: usersTable.username,
      link: tasksTable.link,
      coin_reward: tasksTable.coin_reward,
      status: tasksTable.status,
      created_at: tasksTable.created_at
    })
    .from(tasksTable)
    .innerJoin(usersTable, eq(tasksTable.creator_user_id, usersTable.user_id))
    .where(eq(tasksTable.status, 'open'))
    .orderBy(desc(tasksTable.created_at))
    .execute();

    // Convert numeric coin_reward field to number
    return results.map(result => ({
      ...result,
      coin_reward: parseFloat(result.coin_reward) // Convert string to number
    }));
  } catch (error) {
    console.error('Failed to fetch tasks:', error);
    throw error;
  }
}