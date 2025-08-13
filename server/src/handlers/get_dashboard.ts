import { db } from '../db';
import { tasksTable, usersTable, taskLogTable } from '../db/schema';
import { eq, count } from 'drizzle-orm';
import { type DashboardData, type TaskWithCreator } from '../schema';

export const getDashboard = async (userId: number): Promise<DashboardData> => {
  try {
    // Get user profile
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.user_id, userId))
      .execute();

    if (users.length === 0) {
      throw new Error(`User with ID ${userId} not found`);
    }

    const user = users[0];
    const publicUser = {
      user_id: user.user_id,
      username: user.username,
      coin: parseFloat(user.coin), // Convert string back to number
      created_at: user.created_at
    };

    // Get tasks created by the user
    const createdTasksResult = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.creator_user_id, userId))
      .execute();

    const createdTasks = createdTasksResult.map(task => ({
      task_id: task.task_id,
      creator_user_id: task.creator_user_id,
      link: task.link,
      coin_reward: parseFloat(task.coin_reward), // Convert string back to number
      status: task.status,
      created_at: task.created_at
    }));

    // Get available tasks (open tasks not created by this user) with creator info
    const availableTasksResult = await db.select()
      .from(tasksTable)
      .innerJoin(usersTable, eq(tasksTable.creator_user_id, usersTable.user_id))
      .where(eq(tasksTable.status, 'open'))
      .execute();

    const availableTasks = availableTasksResult
      .filter(result => result.tasks.creator_user_id !== userId)
      .map(result => ({
        task_id: result.tasks.task_id,
        creator_user_id: result.tasks.creator_user_id,
        creator_username: result.users.username,
        link: result.tasks.link,
        coin_reward: parseFloat(result.tasks.coin_reward), // Convert string back to number
        status: result.tasks.status,
        created_at: result.tasks.created_at
      }));

    // Get count of tasks completed by this user
    const completedTasksCountResult = await db.select({ count: count() })
      .from(taskLogTable)
      .where(eq(taskLogTable.executor_user_id, userId))
      .execute();

    const completedTasksCount = completedTasksCountResult[0]?.count || 0;

    return {
      user: publicUser,
      created_tasks: createdTasks,
      available_tasks: availableTasks,
      completed_tasks_count: completedTasksCount
    };
  } catch (error) {
    console.error('Failed to get dashboard data:', error);
    throw error;
  }
};