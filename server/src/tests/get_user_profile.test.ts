import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { getUserProfile } from '../handlers/get_user_profile';
import { eq } from 'drizzle-orm';

describe('getUserProfile', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should get user profile by user_id', async () => {
    // Create test user
    const testUser = await db.insert(usersTable)
      .values({
        username: 'testuser',
        password_hash: 'hashed_password',
        coin: '150.50'
      })
      .returning()
      .execute();

    const userId = testUser[0].user_id;

    // Get user profile
    const result = await getUserProfile(userId);

    // Verify returned data
    expect(result.user_id).toEqual(userId);
    expect(result.username).toEqual('testuser');
    expect(result.coin).toEqual(150.50);
    expect(typeof result.coin).toEqual('number'); // Verify numeric conversion
    expect(result.created_at).toBeInstanceOf(Date);
    
    // Verify password hash is not included
    expect((result as any).password_hash).toBeUndefined();
  });

  it('should return user with zero coin balance', async () => {
    // Create user with zero balance
    const testUser = await db.insert(usersTable)
      .values({
        username: 'zerouser',
        password_hash: 'hashed_password',
        coin: '0.00'
      })
      .returning()
      .execute();

    const result = await getUserProfile(testUser[0].user_id);

    expect(result.coin).toEqual(0);
    expect(typeof result.coin).toEqual('number');
  });

  it('should handle large coin values correctly', async () => {
    // Create user with large coin balance
    const testUser = await db.insert(usersTable)
      .values({
        username: 'richuser',
        password_hash: 'hashed_password',
        coin: '99999.99'
      })
      .returning()
      .execute();

    const result = await getUserProfile(testUser[0].user_id);

    expect(result.coin).toEqual(99999.99);
    expect(typeof result.coin).toEqual('number');
  });

  it('should throw error when user does not exist', async () => {
    const nonExistentUserId = 99999;

    await expect(getUserProfile(nonExistentUserId))
      .rejects.toThrow(/user not found/i);
  });

  it('should verify user exists in database after creation', async () => {
    // Create test user
    const testUser = await db.insert(usersTable)
      .values({
        username: 'verifyuser',
        password_hash: 'hashed_password',
        coin: '75.25'
      })
      .returning()
      .execute();

    const userId = testUser[0].user_id;

    // Get profile
    const profile = await getUserProfile(userId);

    // Verify data matches what's in database
    const dbUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.user_id, userId))
      .execute();

    expect(dbUsers).toHaveLength(1);
    expect(profile.user_id).toEqual(dbUsers[0].user_id);
    expect(profile.username).toEqual(dbUsers[0].username);
    expect(profile.coin).toEqual(parseFloat(dbUsers[0].coin));
    expect(profile.created_at).toEqual(dbUsers[0].created_at);
  });

  it('should handle special characters in username', async () => {
    // Create user with special characters
    const testUser = await db.insert(usersTable)
      .values({
        username: 'user@test-123',
        password_hash: 'hashed_password',
        coin: '42.42'
      })
      .returning()
      .execute();

    const result = await getUserProfile(testUser[0].user_id);

    expect(result.username).toEqual('user@test-123');
    expect(result.coin).toEqual(42.42);
  });
});