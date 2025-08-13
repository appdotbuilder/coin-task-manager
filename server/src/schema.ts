import { z } from 'zod';

// User schema
export const userSchema = z.object({
  user_id: z.number(),
  username: z.string(),
  password_hash: z.string(),
  coin: z.number(), // Stored as numeric in DB, but we use number in TS
  created_at: z.coerce.date() // Automatically converts string timestamps to Date objects
});

export type User = z.infer<typeof userSchema>;

// Public user schema (without password hash)
export const publicUserSchema = z.object({
  user_id: z.number(),
  username: z.string(),
  coin: z.number(),
  created_at: z.coerce.date()
});

export type PublicUser = z.infer<typeof publicUserSchema>;

// Task status enum
export const taskStatusEnum = z.enum(['open', 'completed']);
export type TaskStatus = z.infer<typeof taskStatusEnum>;

// Task schema
export const taskSchema = z.object({
  task_id: z.number(),
  creator_user_id: z.number(),
  link: z.string(),
  coin_reward: z.number(), // Stored as numeric in DB, but we use number in TS
  status: taskStatusEnum,
  created_at: z.coerce.date()
});

export type Task = z.infer<typeof taskSchema>;

// Task log schema
export const taskLogSchema = z.object({
  log_id: z.number(),
  task_id: z.number(),
  executor_user_id: z.number(),
  completed_at: z.coerce.date()
});

export type TaskLog = z.infer<typeof taskLogSchema>;

// Input schema for user registration
export const registerInputSchema = z.object({
  username: z.string().min(3).max(50), // Username validation
  password: z.string().min(6) // Password validation
});

export type RegisterInput = z.infer<typeof registerInputSchema>;

// Input schema for user login
export const loginInputSchema = z.object({
  username: z.string(),
  password: z.string()
});

export type LoginInput = z.infer<typeof loginInputSchema>;

// Login response schema
export const loginResponseSchema = z.object({
  user: publicUserSchema,
  token: z.string()
});

export type LoginResponse = z.infer<typeof loginResponseSchema>;

// Input schema for creating tasks
export const createTaskInputSchema = z.object({
  link: z.string().url(), // Validate that link is a valid URL
  coin_reward: z.number().positive() // Validate that coin reward is positive
});

export type CreateTaskInput = z.infer<typeof createTaskInputSchema>;

// Input schema for completing tasks
export const completeTaskInputSchema = z.object({
  task_id: z.number()
});

export type CompleteTaskInput = z.infer<typeof completeTaskInputSchema>;

// Task with creator info schema (for displaying tasks with creator details)
export const taskWithCreatorSchema = z.object({
  task_id: z.number(),
  creator_user_id: z.number(),
  creator_username: z.string(),
  link: z.string(),
  coin_reward: z.number(),
  status: taskStatusEnum,
  created_at: z.coerce.date()
});

export type TaskWithCreator = z.infer<typeof taskWithCreatorSchema>;

// Dashboard data schema (for user dashboard)
export const dashboardDataSchema = z.object({
  user: publicUserSchema,
  created_tasks: z.array(taskSchema),
  available_tasks: z.array(taskWithCreatorSchema),
  completed_tasks_count: z.number()
});

export type DashboardData = z.infer<typeof dashboardDataSchema>;