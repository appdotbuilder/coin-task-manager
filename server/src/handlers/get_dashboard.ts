import { db } from '../db';
import { usersTable, tasksTable, taskLogTable } from '../db/schema';
import { type DashboardData } from '../schema';
import { eq, ne, count } from 'drizzle-orm';

export async function getDashboard(userId: number): Promise<DashboardData> {
  try {
    // 1. Fetch the authenticated user's current data
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.user_id, userId))
      .execute();

    if (users.length === 0) {
      throw new Error(`User with ID ${userId} not found`);
    }

    const user = users[0];
    
    // 2. Fetch tasks created by the user (both open and completed)
    const createdTasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.creator_user_id, userId))
      .execute();

    // 3. Fetch available open tasks created by other users
    const availableTasksResult = await db.select({
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
      .where(
        eq(tasksTable.status, 'open')
      )
      .execute();

    // Filter out tasks created by the current user
    const availableTasks = availableTasksResult
      .filter(task => task.creator_user_id !== userId)
      .map(task => ({
        task_id: task.task_id,
        creator_user_id: task.creator_user_id,
        creator_username: task.creator_username,
        link: task.link,
        coin_reward: parseFloat(task.coin_reward), // Convert numeric to number
        status: task.status,
        created_at: task.created_at
      }));

    // 4. Count the number of tasks completed by the user
    const completedTasksCountResult = await db.select({
      count: count(taskLogTable.log_id)
    })
      .from(taskLogTable)
      .where(eq(taskLogTable.executor_user_id, userId))
      .execute();

    const completedTasksCount = completedTasksCountResult[0]?.count || 0;

    // Convert numeric fields to numbers and return dashboard data
    return {
      user: {
        user_id: user.user_id,
        username: user.username,
        coin: parseFloat(user.coin), // Convert numeric to number
        created_at: user.created_at
      },
      created_tasks: createdTasks.map(task => ({
        ...task,
        coin_reward: parseFloat(task.coin_reward) // Convert numeric to number
      })),
      available_tasks: availableTasks,
      completed_tasks_count: completedTasksCount
    };
  } catch (error) {
    console.error('Dashboard fetch failed:', error);
    throw error;
  }
}