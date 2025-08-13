import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, tasksTable } from '../db/schema';
import { type CreateTaskInput } from '../schema';
import { createTask } from '../handlers/create_task';
import { eq } from 'drizzle-orm';

// Test user data
const testUser = {
  username: 'testuser',
  password_hash: 'hashed_password_123', // Simple mock hash for testing
  coin: '100.00' // Start with 100 coins
};

// Test input for task creation
const testTaskInput: CreateTaskInput = {
  link: 'https://example.com/test-task',
  coin_reward: 25.50
};

describe('createTask', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a task and deduct coins from user balance', async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].user_id;

    // Create task
    const result = await createTask(testTaskInput, userId);

    // Verify task creation
    expect(result.creator_user_id).toEqual(userId);
    expect(result.link).toEqual('https://example.com/test-task');
    expect(result.coin_reward).toEqual(25.50);
    expect(result.status).toEqual('open');
    expect(result.task_id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(typeof result.coin_reward).toEqual('number');

    // Verify user's coin balance was deducted
    const updatedUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.user_id, userId))
      .execute();

    expect(updatedUsers).toHaveLength(1);
    expect(parseFloat(updatedUsers[0].coin)).toEqual(74.50); // 100 - 25.50
  });

  it('should save task to database correctly', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].user_id;

    // Create task
    const result = await createTask(testTaskInput, userId);

    // Verify task exists in database
    const tasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.task_id, result.task_id))
      .execute();

    expect(tasks).toHaveLength(1);
    const savedTask = tasks[0];
    expect(savedTask.creator_user_id).toEqual(userId);
    expect(savedTask.link).toEqual('https://example.com/test-task');
    expect(parseFloat(savedTask.coin_reward)).toEqual(25.50);
    expect(savedTask.status).toEqual('open');
    expect(savedTask.created_at).toBeInstanceOf(Date);
  });

  it('should throw error when user has insufficient coin balance', async () => {
    // Create user with low balance
    const lowBalanceUser = {
      ...testUser,
      coin: '10.00' // Only 10 coins, but task requires 25.50
    };

    const userResult = await db.insert(usersTable)
      .values(lowBalanceUser)
      .returning()
      .execute();
    
    const userId = userResult[0].user_id;

    // Attempt to create task should fail
    await expect(createTask(testTaskInput, userId)).rejects.toThrow(/insufficient coin balance/i);

    // Verify no task was created
    const tasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.creator_user_id, userId))
      .execute();

    expect(tasks).toHaveLength(0);

    // Verify user's balance wasn't changed
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.user_id, userId))
      .execute();

    expect(parseFloat(users[0].coin)).toEqual(10.00);
  });

  it('should throw error when user does not exist', async () => {
    const nonExistentUserId = 99999;

    await expect(createTask(testTaskInput, nonExistentUserId)).rejects.toThrow(/user not found/i);

    // Verify no task was created
    const tasks = await db.select()
      .from(tasksTable)
      .execute();

    expect(tasks).toHaveLength(0);
  });

  it('should handle exact balance scenarios correctly', async () => {
    // Create user with exact balance needed
    const exactBalanceUser = {
      ...testUser,
      coin: '25.50' // Exactly what the task costs
    };

    const userResult = await db.insert(usersTable)
      .values(exactBalanceUser)
      .returning()
      .execute();
    
    const userId = userResult[0].user_id;

    // Create task should succeed
    const result = await createTask(testTaskInput, userId);

    expect(result.coin_reward).toEqual(25.50);

    // Verify user's balance is now 0
    const updatedUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.user_id, userId))
      .execute();

    expect(parseFloat(updatedUsers[0].coin)).toEqual(0.00);
  });

  it('should handle decimal precision correctly', async () => {
    // Create user with specific balance
    const precisionUser = {
      ...testUser,
      coin: '50.75'
    };

    const userResult = await db.insert(usersTable)
      .values(precisionUser)
      .returning()
      .execute();
    
    const userId = userResult[0].user_id;

    // Create task with decimal reward
    const decimalTaskInput: CreateTaskInput = {
      link: 'https://example.com/precision-test',
      coin_reward: 15.25
    };

    const result = await createTask(decimalTaskInput, userId);

    expect(result.coin_reward).toEqual(15.25);
    expect(typeof result.coin_reward).toEqual('number');

    // Verify precise balance calculation
    const updatedUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.user_id, userId))
      .execute();

    expect(parseFloat(updatedUsers[0].coin)).toEqual(35.50); // 50.75 - 15.25
  });
});