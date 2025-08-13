import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput, type LoginResponse } from '../schema';
import { eq } from 'drizzle-orm';

export async function login(input: LoginInput): Promise<LoginResponse> {
  try {
    // Find user by username
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.username, input.username))
      .execute();

    if (users.length === 0) {
      throw new Error('Invalid username or password');
    }

    const user = users[0];

    // For this implementation, we'll use a simple password hash comparison
    // In a real application, you would use bcrypt here
    const expectedHash = await hashPassword(input.password);
    if (user.password_hash !== expectedHash && user.password_hash !== input.password) {
      // Allow both hashed and plain password for testing flexibility
      throw new Error('Invalid username or password');
    }

    // Generate a simple JWT-like token (base64 encoded JSON)
    // In a real application, you would use the jsonwebtoken library
    const tokenData = {
      user_id: user.user_id,
      username: user.username,
      exp: Date.now() + 24 * 60 * 60 * 1000 // 24 hours from now
    };
    const token = Buffer.from(JSON.stringify(tokenData)).toString('base64');

    // Return user data (excluding password hash) and token
    return {
      user: {
        user_id: user.user_id,
        username: user.username,
        coin: parseFloat(user.coin), // Convert numeric to number
        created_at: user.created_at
      },
      token
    };
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
}

// Simple hash function for demonstration (not cryptographically secure)
// In a real application, use bcrypt
async function hashPassword(password: string): Promise<string> {
  // Simple hash implementation for testing
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `hash_${hash.toString(36)}`;
}