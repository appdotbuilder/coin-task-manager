import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput } from '../schema';
import { login } from '../handlers/login';

// Test user data
const testUser = {
  username: 'testuser',
  password: 'password123',
  coin: '150.75'
};

// Simple hash function matching the one in the handler
async function hashPassword(password: string): Promise<string> {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `hash_${hash.toString(36)}`;
}

describe('login', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should successfully login with valid credentials', async () => {
    // Create test user with hashed password
    const hashedPassword = await hashPassword(testUser.password);
    await db.insert(usersTable)
      .values({
        username: testUser.username,
        password_hash: hashedPassword,
        coin: testUser.coin
      })
      .execute();

    const loginInput: LoginInput = {
      username: testUser.username,
      password: testUser.password
    };

    const result = await login(loginInput);

    // Validate user data
    expect(result.user.username).toEqual(testUser.username);
    expect(result.user.coin).toEqual(150.75); // Should be converted to number
    expect(typeof result.user.coin).toBe('number');
    expect(result.user.user_id).toBeDefined();
    expect(result.user.created_at).toBeInstanceOf(Date);

    // Validate token
    expect(result.token).toBeDefined();
    expect(typeof result.token).toBe('string');

    // Verify token contains correct data (decode base64)
    const decodedToken = JSON.parse(Buffer.from(result.token, 'base64').toString());
    expect(decodedToken.user_id).toEqual(result.user.user_id);
    expect(decodedToken.username).toEqual(testUser.username);
    expect(decodedToken.exp).toBeGreaterThan(Date.now());
  });

  it('should successfully login with plain text password for testing', async () => {
    // Create test user with plain text password (for testing flexibility)
    await db.insert(usersTable)
      .values({
        username: testUser.username,
        password_hash: testUser.password, // Store plain password for this test
        coin: testUser.coin
      })
      .execute();

    const loginInput: LoginInput = {
      username: testUser.username,
      password: testUser.password
    };

    const result = await login(loginInput);

    expect(result.user.username).toEqual(testUser.username);
    expect(result.user.coin).toEqual(150.75);
    expect(result.token).toBeDefined();
  });

  it('should reject login with invalid username', async () => {
    // Create test user
    const hashedPassword = await hashPassword(testUser.password);
    await db.insert(usersTable)
      .values({
        username: testUser.username,
        password_hash: hashedPassword,
        coin: testUser.coin
      })
      .execute();

    const loginInput: LoginInput = {
      username: 'nonexistentuser',
      password: testUser.password
    };

    await expect(login(loginInput)).rejects.toThrow(/invalid username or password/i);
  });

  it('should reject login with invalid password', async () => {
    // Create test user
    const hashedPassword = await hashPassword(testUser.password);
    await db.insert(usersTable)
      .values({
        username: testUser.username,
        password_hash: hashedPassword,
        coin: testUser.coin
      })
      .execute();

    const loginInput: LoginInput = {
      username: testUser.username,
      password: 'wrongpassword'
    };

    await expect(login(loginInput)).rejects.toThrow(/invalid username or password/i);
  });

  it('should handle user with zero coins correctly', async () => {
    // Create test user with zero coins
    const hashedPassword = await hashPassword(testUser.password);
    await db.insert(usersTable)
      .values({
        username: testUser.username,
        password_hash: hashedPassword,
        coin: '0.00'
      })
      .execute();

    const loginInput: LoginInput = {
      username: testUser.username,
      password: testUser.password
    };

    const result = await login(loginInput);

    expect(result.user.coin).toEqual(0);
    expect(typeof result.user.coin).toBe('number');
  });

  it('should not include password hash in response', async () => {
    // Create test user
    const hashedPassword = await hashPassword(testUser.password);
    await db.insert(usersTable)
      .values({
        username: testUser.username,
        password_hash: hashedPassword,
        coin: testUser.coin
      })
      .execute();

    const loginInput: LoginInput = {
      username: testUser.username,
      password: testUser.password
    };

    const result = await login(loginInput);

    // Ensure password hash is not exposed
    expect(result.user).not.toHaveProperty('password_hash');
    expect(JSON.stringify(result)).not.toContain(hashedPassword);
  });

  it('should generate unique tokens for different login sessions', async () => {
    // Create test user
    const hashedPassword = await hashPassword(testUser.password);
    await db.insert(usersTable)
      .values({
        username: testUser.username,
        password_hash: hashedPassword,
        coin: testUser.coin
      })
      .execute();

    const loginInput: LoginInput = {
      username: testUser.username,
      password: testUser.password
    };

    // Login twice
    const result1 = await login(loginInput);
    // Add small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));
    const result2 = await login(loginInput);

    // Tokens should be different due to different timestamps
    expect(result1.token).not.toEqual(result2.token);
  });

  it('should handle users with high coin amounts correctly', async () => {
    // Create test user with high coin amount
    const hashedPassword = await hashPassword(testUser.password);
    await db.insert(usersTable)
      .values({
        username: testUser.username,
        password_hash: hashedPassword,
        coin: '9999.99'
      })
      .execute();

    const loginInput: LoginInput = {
      username: testUser.username,
      password: testUser.password
    };

    const result = await login(loginInput);

    expect(result.user.coin).toEqual(9999.99);
    expect(typeof result.user.coin).toBe('number');
  });
});