import { initTRPC, TRPCError } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import { 
  registerInputSchema, 
  loginInputSchema, 
  createTaskInputSchema, 
  completeTaskInputSchema 
} from './schema';

// Import handlers
import { register } from './handlers/register';
import { login } from './handlers/login';
import { createTask } from './handlers/create_task';
import { getTasks } from './handlers/get_tasks';
import { completeTask } from './handlers/complete_task';
import { getDashboard } from './handlers/get_dashboard';
import { getUserProfile } from './handlers/get_user_profile';

// Context type for authentication
interface Context {
  userId?: number;
  token?: string;
}

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

// Protected procedure that requires authentication
const protectedProcedure = publicProcedure.use(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ 
      code: 'UNAUTHORIZED', 
      message: 'Authentication required' 
    });
  }
  return next({
    ctx: {
      ...ctx,
      userId: ctx.userId, // Ensure userId is defined
    },
  });
});

const appRouter = router({
  // Health check endpoint
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Authentication endpoints
  register: publicProcedure
    .input(registerInputSchema)
    .mutation(({ input }) => register(input)),

  login: publicProcedure
    .input(loginInputSchema)
    .mutation(({ input }) => login(input)),

  // User profile endpoint
  getUserProfile: protectedProcedure
    .query(({ ctx }) => getUserProfile(ctx.userId)),

  // Dashboard endpoint
  getDashboard: protectedProcedure
    .query(({ ctx }) => getDashboard(ctx.userId)),

  // Task management endpoints
  createTask: protectedProcedure
    .input(createTaskInputSchema)
    .mutation(({ input, ctx }) => createTask(input, ctx.userId)),

  getTasks: publicProcedure
    .query(() => getTasks()),

  completeTask: protectedProcedure
    .input(completeTaskInputSchema)
    .mutation(({ input, ctx }) => completeTask(input, ctx.userId)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors({
        origin: process.env['CLIENT_URL'] || 'http://localhost:3000',
        credentials: true,
      })(req, res, next);
    },
    router: appRouter,
    createContext({ req }): Context {
      // Extract authentication token from Authorization header
      const authHeader = req.headers.authorization;
      let userId: number | undefined;
      let token: string | undefined;

      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
        // TODO: Implement JWT token verification and extract userId
        // For now, this is a placeholder - real implementation should:
        // 1. Verify JWT token signature
        // 2. Check token expiration
        // 3. Extract userId from token payload
        // userId = verifyJWTAndExtractUserId(token);
      }

      return { userId, token };
    },
  });

  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
  console.log(`Available endpoints:
    - POST /register - User registration
    - POST /login - User authentication  
    - GET /getUserProfile - Get current user profile (protected)
    - GET /getDashboard - Get user dashboard data (protected)
    - POST /createTask - Create new task (protected)
    - GET /getTasks - Get all open tasks
    - POST /completeTask - Complete a task (protected)
    - GET /healthcheck - Server health check
  `);
}

start();