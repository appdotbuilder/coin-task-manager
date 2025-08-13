import { serial, text, pgTable, timestamp, numeric, integer, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Task status enum
export const taskStatusEnum = pgEnum('task_status', ['open', 'completed']);

// Users table
export const usersTable = pgTable('users', {
  user_id: serial('user_id').primaryKey(),
  username: text('username').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  coin: numeric('coin', { precision: 10, scale: 2 }).notNull().default('0.00'), // Use numeric for monetary values with precision
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Tasks table
export const tasksTable = pgTable('tasks', {
  task_id: serial('task_id').primaryKey(),
  creator_user_id: integer('creator_user_id').notNull().references(() => usersTable.user_id),
  link: text('link').notNull(),
  coin_reward: numeric('coin_reward', { precision: 10, scale: 2 }).notNull(), // Use numeric for monetary values with precision
  status: taskStatusEnum('status').notNull().default('open'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Task log table
export const taskLogTable = pgTable('task_log', {
  log_id: serial('log_id').primaryKey(),
  task_id: integer('task_id').notNull().references(() => tasksTable.task_id),
  executor_user_id: integer('executor_user_id').notNull().references(() => usersTable.user_id),
  completed_at: timestamp('completed_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  createdTasks: many(tasksTable),
  completedTasks: many(taskLogTable),
}));

export const tasksRelations = relations(tasksTable, ({ one, many }) => ({
  creator: one(usersTable, {
    fields: [tasksTable.creator_user_id],
    references: [usersTable.user_id],
  }),
  taskLogs: many(taskLogTable),
}));

export const taskLogRelations = relations(taskLogTable, ({ one }) => ({
  task: one(tasksTable, {
    fields: [taskLogTable.task_id],
    references: [tasksTable.task_id],
  }),
  executor: one(usersTable, {
    fields: [taskLogTable.executor_user_id],
    references: [usersTable.user_id],
  }),
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect; // For SELECT operations
export type NewUser = typeof usersTable.$inferInsert; // For INSERT operations

export type Task = typeof tasksTable.$inferSelect;
export type NewTask = typeof tasksTable.$inferInsert;

export type TaskLog = typeof taskLogTable.$inferSelect;
export type NewTaskLog = typeof taskLogTable.$inferInsert;

// Important: Export all tables and relations for proper query building
export const tables = { 
  users: usersTable, 
  tasks: tasksTable, 
  taskLog: taskLogTable 
};