import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, tasksTable } from '../db/schema';
import { getTasks } from '../handlers/get_tasks';

describe('getTasks', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no open tasks exist', async () => {
    const result = await getTasks();
    expect(result).toEqual([]);
  });

  it('should return open tasks with creator information', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        password_hash: 'hashedpassword',
        coin: '100.00'
      })
      .returning()
      .execute();

    const userId = userResult[0].user_id;

    // Create test task
    await db.insert(tasksTable)
      .values({
        creator_user_id: userId,
        link: 'https://example.com',
        coin_reward: '25.50',
        status: 'open'
      })
      .execute();

    const result = await getTasks();

    expect(result).toHaveLength(1);
    expect(result[0].creator_user_id).toBe(userId);
    expect(result[0].creator_username).toBe('testuser');
    expect(result[0].link).toBe('https://example.com');
    expect(result[0].coin_reward).toBe(25.50);
    expect(typeof result[0].coin_reward).toBe('number');
    expect(result[0].status).toBe('open');
    expect(result[0].task_id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
  });

  it('should not return completed tasks', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        password_hash: 'hashedpassword',
        coin: '100.00'
      })
      .returning()
      .execute();

    const userId = userResult[0].user_id;

    // Create open task
    await db.insert(tasksTable)
      .values({
        creator_user_id: userId,
        link: 'https://example.com/open',
        coin_reward: '25.50',
        status: 'open'
      })
      .execute();

    // Create completed task
    await db.insert(tasksTable)
      .values({
        creator_user_id: userId,
        link: 'https://example.com/completed',
        coin_reward: '30.00',
        status: 'completed'
      })
      .execute();

    const result = await getTasks();

    expect(result).toHaveLength(1);
    expect(result[0].link).toBe('https://example.com/open');
    expect(result[0].status).toBe('open');
  });

  it('should return tasks ordered by creation date (newest first)', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        password_hash: 'hashedpassword',
        coin: '100.00'
      })
      .returning()
      .execute();

    const userId = userResult[0].user_id;

    // Create first task
    const firstTask = await db.insert(tasksTable)
      .values({
        creator_user_id: userId,
        link: 'https://example.com/first',
        coin_reward: '10.00',
        status: 'open'
      })
      .returning()
      .execute();

    // Wait a bit to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    // Create second task (should be newer)
    const secondTask = await db.insert(tasksTable)
      .values({
        creator_user_id: userId,
        link: 'https://example.com/second',
        coin_reward: '15.00',
        status: 'open'
      })
      .returning()
      .execute();

    const result = await getTasks();

    expect(result).toHaveLength(2);
    // Newer task should come first
    expect(result[0].task_id).toBe(secondTask[0].task_id);
    expect(result[0].link).toBe('https://example.com/second');
    expect(result[1].task_id).toBe(firstTask[0].task_id);
    expect(result[1].link).toBe('https://example.com/first');
    
    // Verify dates are in descending order
    expect(result[0].created_at >= result[1].created_at).toBe(true);
  });

  it('should handle multiple users with open tasks', async () => {
    // Create first user
    const user1Result = await db.insert(usersTable)
      .values({
        username: 'user1',
        password_hash: 'hashedpassword1',
        coin: '100.00'
      })
      .returning()
      .execute();

    // Create second user
    const user2Result = await db.insert(usersTable)
      .values({
        username: 'user2',
        password_hash: 'hashedpassword2',
        coin: '200.00'
      })
      .returning()
      .execute();

    const user1Id = user1Result[0].user_id;
    const user2Id = user2Result[0].user_id;

    // Create task by user1
    await db.insert(tasksTable)
      .values({
        creator_user_id: user1Id,
        link: 'https://example.com/user1',
        coin_reward: '20.00',
        status: 'open'
      })
      .execute();

    // Create task by user2
    await db.insert(tasksTable)
      .values({
        creator_user_id: user2Id,
        link: 'https://example.com/user2',
        coin_reward: '35.75',
        status: 'open'
      })
      .execute();

    const result = await getTasks();

    expect(result).toHaveLength(2);
    
    // Find tasks by creator username
    const user1Task = result.find(task => task.creator_username === 'user1');
    const user2Task = result.find(task => task.creator_username === 'user2');

    expect(user1Task).toBeDefined();
    expect(user1Task!.creator_user_id).toBe(user1Id);
    expect(user1Task!.link).toBe('https://example.com/user1');
    expect(user1Task!.coin_reward).toBe(20.00);

    expect(user2Task).toBeDefined();
    expect(user2Task!.creator_user_id).toBe(user2Id);
    expect(user2Task!.link).toBe('https://example.com/user2');
    expect(user2Task!.coin_reward).toBe(35.75);
  });

  it('should handle decimal coin rewards correctly', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        password_hash: 'hashedpassword',
        coin: '100.00'
      })
      .returning()
      .execute();

    const userId = userResult[0].user_id;

    // Create task with decimal coin reward
    await db.insert(tasksTable)
      .values({
        creator_user_id: userId,
        link: 'https://example.com/decimal',
        coin_reward: '12.99',
        status: 'open'
      })
      .execute();

    const result = await getTasks();

    expect(result).toHaveLength(1);
    expect(result[0].coin_reward).toBe(12.99);
    expect(typeof result[0].coin_reward).toBe('number');
  });
});