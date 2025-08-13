import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, tasksTable, taskLogTable } from '../db/schema';
import { getDashboard } from '../handlers/get_dashboard';

describe('getDashboard', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return dashboard data for user with no tasks', async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values({
        username: 'testuser',
        password_hash: 'hashedpassword123',
        coin: '50.75'
      })
      .returning()
      .execute();

    const userId = users[0].user_id;

    const result = await getDashboard(userId);

    expect(result.user.user_id).toEqual(userId);
    expect(result.user.username).toEqual('testuser');
    expect(result.user.coin).toEqual(50.75);
    expect(typeof result.user.coin).toBe('number');
    expect(result.user.created_at).toBeInstanceOf(Date);
    expect(result.created_tasks).toHaveLength(0);
    expect(result.available_tasks).toHaveLength(0);
    expect(result.completed_tasks_count).toEqual(0);
  });

  it('should return user created tasks', async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values({
        username: 'creator',
        password_hash: 'hashedpassword123',
        coin: '100.00'
      })
      .returning()
      .execute();

    const userId = users[0].user_id;

    // Create tasks for the user
    await db.insert(tasksTable)
      .values([
        {
          creator_user_id: userId,
          link: 'https://example.com/task1',
          coin_reward: '10.50',
          status: 'open'
        },
        {
          creator_user_id: userId,
          link: 'https://example.com/task2',
          coin_reward: '25.00',
          status: 'completed'
        }
      ])
      .execute();

    const result = await getDashboard(userId);

    expect(result.created_tasks).toHaveLength(2);
    expect(result.created_tasks[0].coin_reward).toEqual(10.50);
    expect(typeof result.created_tasks[0].coin_reward).toBe('number');
    expect(result.created_tasks[1].coin_reward).toEqual(25.00);
    expect(result.created_tasks[0].link).toEqual('https://example.com/task1');
    expect(result.created_tasks[0].status).toEqual('open');
    expect(result.created_tasks[1].status).toEqual('completed');
  });

  it('should return available tasks from other users', async () => {
    // Create two test users
    const users = await db.insert(usersTable)
      .values([
        {
          username: 'user1',
          password_hash: 'hashedpassword123',
          coin: '100.00'
        },
        {
          username: 'user2',
          password_hash: 'hashedpassword123',
          coin: '200.00'
        }
      ])
      .returning()
      .execute();

    const user1Id = users[0].user_id;
    const user2Id = users[1].user_id;

    // Create tasks - user2 creates tasks that should be available to user1
    await db.insert(tasksTable)
      .values([
        {
          creator_user_id: user2Id,
          link: 'https://example.com/available1',
          coin_reward: '15.25',
          status: 'open'
        },
        {
          creator_user_id: user2Id,
          link: 'https://example.com/available2',
          coin_reward: '30.00',
          status: 'open'
        },
        {
          creator_user_id: user2Id,
          link: 'https://example.com/completed',
          coin_reward: '20.00',
          status: 'completed'
        },
        {
          creator_user_id: user1Id,
          link: 'https://example.com/own-task',
          coin_reward: '12.50',
          status: 'open'
        }
      ])
      .execute();

    const result = await getDashboard(user1Id);

    // Should only see open tasks from other users
    expect(result.available_tasks).toHaveLength(2);
    
    // Sort tasks by coin_reward to ensure consistent testing
    const sortedTasks = result.available_tasks.sort((a, b) => a.coin_reward - b.coin_reward);
    
    expect(sortedTasks[0].creator_username).toEqual('user2');
    expect(sortedTasks[0].coin_reward).toEqual(15.25);
    expect(typeof sortedTasks[0].coin_reward).toBe('number');
    expect(sortedTasks[0].status).toEqual('open');
    expect(sortedTasks[1].coin_reward).toEqual(30.00);
    
    // Should not include own tasks or completed tasks
    const ownTaskExists = result.available_tasks.some(task => 
      task.creator_user_id === user1Id
    );
    expect(ownTaskExists).toBe(false);

    const completedTaskExists = result.available_tasks.some(task => 
      task.status === 'completed'
    );
    expect(completedTaskExists).toBe(false);
  });

  it('should return correct completed tasks count', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          username: 'executor',
          password_hash: 'hashedpassword123',
          coin: '100.00'
        },
        {
          username: 'creator',
          password_hash: 'hashedpassword123',
          coin: '200.00'
        }
      ])
      .returning()
      .execute();

    const executorId = users[0].user_id;
    const creatorId = users[1].user_id;

    // Create tasks
    const tasks = await db.insert(tasksTable)
      .values([
        {
          creator_user_id: creatorId,
          link: 'https://example.com/task1',
          coin_reward: '10.00',
          status: 'completed'
        },
        {
          creator_user_id: creatorId,
          link: 'https://example.com/task2',
          coin_reward: '20.00',
          status: 'completed'
        },
        {
          creator_user_id: creatorId,
          link: 'https://example.com/task3',
          coin_reward: '30.00',
          status: 'completed'
        }
      ])
      .returning()
      .execute();

    // Add task completion logs for the executor
    await db.insert(taskLogTable)
      .values([
        {
          task_id: tasks[0].task_id,
          executor_user_id: executorId
        },
        {
          task_id: tasks[1].task_id,
          executor_user_id: executorId
        }
      ])
      .execute();

    const result = await getDashboard(executorId);

    expect(result.completed_tasks_count).toEqual(2);
  });

  it('should return complete dashboard data with mixed scenarios', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          username: 'mainuser',
          password_hash: 'hashedpassword123',
          coin: '75.50'
        },
        {
          username: 'otheruser',
          password_hash: 'hashedpassword123',
          coin: '150.25'
        }
      ])
      .returning()
      .execute();

    const mainUserId = users[0].user_id;
    const otherUserId = users[1].user_id;

    // Create tasks for main user
    const mainUserTasks = await db.insert(tasksTable)
      .values([
        {
          creator_user_id: mainUserId,
          link: 'https://example.com/my-task',
          coin_reward: '15.00',
          status: 'open'
        }
      ])
      .returning()
      .execute();

    // Create available tasks from other user
    const otherTasks = await db.insert(tasksTable)
      .values([
        {
          creator_user_id: otherUserId,
          link: 'https://example.com/available-task',
          coin_reward: '25.75',
          status: 'open'
        },
        {
          creator_user_id: otherUserId,
          link: 'https://example.com/completed-task',
          coin_reward: '40.00',
          status: 'completed'
        }
      ])
      .returning()
      .execute();

    // Add completion log for main user
    await db.insert(taskLogTable)
      .values({
        task_id: otherTasks[1].task_id,
        executor_user_id: mainUserId
      })
      .execute();

    const result = await getDashboard(mainUserId);

    // Verify user data
    expect(result.user.user_id).toEqual(mainUserId);
    expect(result.user.username).toEqual('mainuser');
    expect(result.user.coin).toEqual(75.50);
    expect(typeof result.user.coin).toBe('number');

    // Verify created tasks
    expect(result.created_tasks).toHaveLength(1);
    expect(result.created_tasks[0].coin_reward).toEqual(15.00);

    // Verify available tasks (should only show open tasks from others)
    expect(result.available_tasks).toHaveLength(1);
    expect(result.available_tasks[0].creator_username).toEqual('otheruser');
    expect(result.available_tasks[0].coin_reward).toEqual(25.75);
    expect(result.available_tasks[0].status).toEqual('open');

    // Verify completed tasks count
    expect(result.completed_tasks_count).toEqual(1);
  });

  it('should throw error for non-existent user', async () => {
    const nonExistentUserId = 999;

    await expect(getDashboard(nonExistentUserId))
      .rejects
      .toThrow(/User with ID 999 not found/);
  });
});