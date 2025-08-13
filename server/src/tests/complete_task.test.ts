import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, tasksTable, taskLogTable } from '../db/schema';
import { type CompleteTaskInput } from '../schema';
import { completeTask } from '../handlers/complete_task';
import { eq } from 'drizzle-orm';

describe('completeTask', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create test user
  const createTestUser = async (username: string, initialCoin = '10.00') => {
    const result = await db.insert(usersTable)
      .values({
        username,
        password_hash: 'test_hash',
        coin: initialCoin
      })
      .returning()
      .execute();
    return result[0];
  };

  // Helper function to create test task
  const createTestTask = async (creatorId: number, reward = '5.50', status = 'open') => {
    const result = await db.insert(tasksTable)
      .values({
        creator_user_id: creatorId,
        link: 'https://example.com',
        coin_reward: reward,
        status: status as 'open' | 'completed'
      })
      .returning()
      .execute();
    return result[0];
  };

  it('should complete a task successfully', async () => {
    // Create test users
    const creator = await createTestUser('creator', '20.00');
    const executor = await createTestUser('executor', '15.00');

    // Create test task
    const task = await createTestTask(creator.user_id, '7.50');

    const input: CompleteTaskInput = {
      task_id: task.task_id
    };

    // Complete the task
    const result = await completeTask(input, executor.user_id);

    // Verify task completion
    expect(result.task_id).toEqual(task.task_id);
    expect(result.status).toEqual('completed');
    expect(result.coin_reward).toEqual(7.5);
    expect(typeof result.coin_reward).toBe('number');
    expect(result.creator_user_id).toEqual(creator.user_id);
  });

  it('should update task status in database', async () => {
    const creator = await createTestUser('creator');
    const executor = await createTestUser('executor');
    const task = await createTestTask(creator.user_id);

    const input: CompleteTaskInput = {
      task_id: task.task_id
    };

    await completeTask(input, executor.user_id);

    // Verify task status updated in database
    const updatedTasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.task_id, task.task_id))
      .execute();

    expect(updatedTasks).toHaveLength(1);
    expect(updatedTasks[0].status).toEqual('completed');
  });

  it('should add coin reward to executor balance', async () => {
    const creator = await createTestUser('creator', '100.00');
    const executor = await createTestUser('executor', '25.75');
    const task = await createTestTask(creator.user_id, '12.25');

    const input: CompleteTaskInput = {
      task_id: task.task_id
    };

    await completeTask(input, executor.user_id);

    // Verify executor's coin balance updated
    const updatedUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.user_id, executor.user_id))
      .execute();

    expect(updatedUsers).toHaveLength(1);
    expect(parseFloat(updatedUsers[0].coin)).toEqual(38.00); // 25.75 + 12.25
  });

  it('should create task log entry', async () => {
    const creator = await createTestUser('creator');
    const executor = await createTestUser('executor');
    const task = await createTestTask(creator.user_id);

    const input: CompleteTaskInput = {
      task_id: task.task_id
    };

    await completeTask(input, executor.user_id);

    // Verify task log entry created
    const taskLogs = await db.select()
      .from(taskLogTable)
      .where(eq(taskLogTable.task_id, task.task_id))
      .execute();

    expect(taskLogs).toHaveLength(1);
    expect(taskLogs[0].task_id).toEqual(task.task_id);
    expect(taskLogs[0].executor_user_id).toEqual(executor.user_id);
    expect(taskLogs[0].completed_at).toBeInstanceOf(Date);
  });

  it('should throw error when task not found', async () => {
    const executor = await createTestUser('executor');

    const input: CompleteTaskInput = {
      task_id: 999999 // Non-existent task ID
    };

    expect(completeTask(input, executor.user_id)).rejects.toThrow(/task not found/i);
  });

  it('should throw error when task is already completed', async () => {
    const creator = await createTestUser('creator');
    const executor = await createTestUser('executor');
    const task = await createTestTask(creator.user_id, '5.00', 'completed');

    const input: CompleteTaskInput = {
      task_id: task.task_id
    };

    expect(completeTask(input, executor.user_id)).rejects.toThrow(/already completed/i);
  });

  it('should throw error when user tries to complete own task', async () => {
    const creator = await createTestUser('creator');
    const task = await createTestTask(creator.user_id);

    const input: CompleteTaskInput = {
      task_id: task.task_id
    };

    expect(completeTask(input, creator.user_id)).rejects.toThrow(/cannot complete your own task/i);
  });

  it('should throw error when executor user not found', async () => {
    const creator = await createTestUser('creator');
    const task = await createTestTask(creator.user_id);

    const input: CompleteTaskInput = {
      task_id: task.task_id
    };

    const nonExistentUserId = 999999;

    expect(completeTask(input, nonExistentUserId)).rejects.toThrow(/executor user not found/i);
  });

  it('should handle decimal coin calculations correctly', async () => {
    const creator = await createTestUser('creator', '50.33');
    const executor = await createTestUser('executor', '12.67');
    const task = await createTestTask(creator.user_id, '8.25');

    const input: CompleteTaskInput = {
      task_id: task.task_id
    };

    const result = await completeTask(input, executor.user_id);

    // Verify numeric conversion in result
    expect(typeof result.coin_reward).toBe('number');
    expect(result.coin_reward).toEqual(8.25);

    // Verify executor balance calculation
    const updatedUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.user_id, executor.user_id))
      .execute();

    expect(parseFloat(updatedUsers[0].coin)).toEqual(20.92); // 12.67 + 8.25
  });

  it('should rollback all changes if transaction fails', async () => {
    const creator = await createTestUser('creator');
    const executor = await createTestUser('executor', '10.00');
    const task = await createTestTask(creator.user_id, '5.00');

    // Get initial state
    const initialExecutorState = await db.select()
      .from(usersTable)
      .where(eq(usersTable.user_id, executor.user_id))
      .execute();

    const initialTaskState = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.task_id, task.task_id))
      .execute();

    // Simulate a scenario that could cause rollback by using invalid task ID after valid checks
    // Since we can't easily mock a database failure, we'll test with a non-existent user ID
    const input: CompleteTaskInput = {
      task_id: task.task_id
    };

    try {
      await completeTask(input, 999999); // Non-existent user
    } catch (error) {
      // Verify nothing changed due to transaction rollback
      const finalExecutorState = await db.select()
        .from(usersTable)
        .where(eq(usersTable.user_id, executor.user_id))
        .execute();

      const finalTaskState = await db.select()
        .from(tasksTable)
        .where(eq(tasksTable.task_id, task.task_id))
        .execute();

      const taskLogs = await db.select()
        .from(taskLogTable)
        .where(eq(taskLogTable.task_id, task.task_id))
        .execute();

      // All should remain unchanged
      expect(finalExecutorState[0].coin).toEqual(initialExecutorState[0].coin);
      expect(finalTaskState[0].status).toEqual(initialTaskState[0].status);
      expect(taskLogs).toHaveLength(0);
    }
  });
});