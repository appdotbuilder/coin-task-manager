import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type RegisterInput } from '../schema';
import { register } from '../handlers/register';
import { eq } from 'drizzle-orm';
import { createHash } from 'crypto';

// Test input with all required fields
const testInput: RegisterInput = {
  username: 'testuser123',
  password: 'securepassword123'
};

describe('register', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should register a new user successfully', async () => {
    const result = await register(testInput);

    // Validate returned user data
    expect(result.username).toEqual('testuser123');
    expect(result.coin).toEqual(100);
    expect(result.user_id).toBeDefined();
    expect(typeof result.user_id).toBe('number');
    expect(result.user_id).toBeGreaterThan(0);
    expect(result.created_at).toBeInstanceOf(Date);
    
    // Ensure password hash is not included in response
    expect((result as any).password_hash).toBeUndefined();
  });

  it('should save user to database with hashed password', async () => {
    const result = await register(testInput);

    // Query database to verify user was saved
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.user_id, result.user_id))
      .execute();

    expect(users).toHaveLength(1);
    const savedUser = users[0];
    
    expect(savedUser.username).toEqual('testuser123');
    expect(parseFloat(savedUser.coin)).toEqual(100);
    expect(savedUser.password_hash).toBeDefined();
    expect(savedUser.password_hash).not.toEqual(testInput.password); // Should be hashed
    expect(savedUser.created_at).toBeInstanceOf(Date);

    // Verify password was properly hashed using crypto
    const [hash, salt] = savedUser.password_hash.split(':');
    const expectedHash = createHash('sha256').update(testInput.password + salt).digest('hex');
    expect(hash).toEqual(expectedHash);
  });

  it('should throw error for duplicate username', async () => {
    // Create first user
    await register(testInput);

    // Attempt to create second user with same username
    const duplicateInput: RegisterInput = {
      username: 'testuser123', // Same username
      password: 'differentpassword'
    };

    await expect(register(duplicateInput)).rejects.toThrow(/username already exists/i);
  });

  it('should handle different usernames correctly', async () => {
    // Register first user
    const user1 = await register(testInput);

    // Register second user with different username
    const input2: RegisterInput = {
      username: 'anotheruser456',
      password: 'anotherpassword'
    };
    const user2 = await register(input2);

    // Both users should be created successfully
    expect(user1.username).toEqual('testuser123');
    expect(user2.username).toEqual('anotheruser456');
    expect(user1.user_id).not.toEqual(user2.user_id);

    // Verify both users exist in database
    const allUsers = await db.select()
      .from(usersTable)
      .execute();

    expect(allUsers).toHaveLength(2);
    expect(allUsers.map(u => u.username)).toContain('testuser123');
    expect(allUsers.map(u => u.username)).toContain('anotheruser456');
  });

  it('should initialize new users with correct coin balance', async () => {
    const result = await register(testInput);

    expect(result.coin).toEqual(100);
    expect(typeof result.coin).toBe('number');

    // Verify in database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.user_id, result.user_id))
      .execute();

    expect(parseFloat(users[0].coin)).toEqual(100);
  });

  it('should handle passwords with special characters', async () => {
    const specialPasswordInput: RegisterInput = {
      username: 'specialuser',
      password: 'P@ssw0rd!@#$%^&*()'
    };

    const result = await register(specialPasswordInput);
    expect(result.username).toEqual('specialuser');

    // Verify password hashing worked with special characters
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.user_id, result.user_id))
      .execute();

    const [hash, salt] = users[0].password_hash.split(':');
    const expectedHash = createHash('sha256').update(specialPasswordInput.password + salt).digest('hex');
    expect(hash).toEqual(expectedHash);
  });
});