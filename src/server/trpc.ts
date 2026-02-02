import { initTRPC } from '@trpc/server';
import { transformer } from '../transformer';
import { Context } from './context';
import { context, reddit, redis } from '@devvit/web/server';
import { countDecrement, countGet, countIncrement } from './core/count';
import { z } from 'zod';

/**
 * Initialization of tRPC backend
 * Should be done only once per backend!
 */
interface RedditUser {
  snoovatarImage?: string;
  iconImg?: string;
}

const t = initTRPC.context<Context>().create({
  transformer,
});

/**
 * Export reusable router and procedure helpers
 * that can be used throughout the router
 */
export const router = t.router;
export const publicProcedure = t.procedure;

export const appRouter = t.router({
  init: t.router({
    get: publicProcedure.query(async () => {
      const [count, username] = await Promise.all([
        countGet(),
        reddit.getCurrentUsername(),
      ]);

      return {
        count,
        postId: context.postId,
        username,
      };
    }),
  }),
  counter: t.router({
    increment: publicProcedure
      .input(z.number().optional())
      .mutation(async ({ input }) => {
        const { postId } = context;
        return {
          count: await countIncrement(input),
          postId,
          type: 'increment',
        };
      }),
    decrement: publicProcedure
      .input(z.number().optional())
      .mutation(async ({ input }) => {
        const { postId } = context;
        return {
          count: await countDecrement(input),
          postId,
          type: 'decrement',
        };
      }),
    get: publicProcedure.query(async () => {
      return await countGet();
    }),
  }),
  leaderboard: t.router({
    submit: publicProcedure
      .input(z.object({ score: z.number() }))
      .mutation(async ({ input }) => {
        const username = await reddit.getCurrentUsername() || 'Anonymous';
        const subredditId = (await context.subredditId) || 'unknown';

        await Promise.all([
          redis.zAdd('global_leaderboard', { member: username, score: input.score }),
          redis.zAdd(`subreddit_leaderboard:${subredditId}`, { member: username, score: input.score })
        ]);

        return { success: true };
      }),
    get: publicProcedure.query(async () => {
      const subredditId = (await context.subredditId) || 'unknown';

      const [globalTop, subredditTop] = await Promise.all([
        redis.zRange('global_leaderboard', 0, 4, { by: 'rank', reverse: true }),
        redis.zRange(`subreddit_leaderboard:${subredditId}`, 0, 4, { by: 'rank', reverse: true })
      ]);

      return {
        global: globalTop,
        subreddit: subredditTop,
      };
    }),

  }),
  user: t.router({
    getPreferences: publicProcedure.query(async () => {
      const username = await reddit.getCurrentUsername() || 'Anonymous';
      const currentUser = await reddit.getCurrentUser();
      const [selectedSkin, highScore] = await Promise.all([
        redis.get(`user:${username}:skin`),
        redis.zScore('global_leaderboard', username)
      ]);
      const avatarUrl = (currentUser as RedditUser)?.snoovatarImage || (currentUser as RedditUser)?.iconImg || '';

      return {
        selectedSkin: (selectedSkin as string) || '🧌',
        highScore: highScore || 0,
        avatarUrl,
      };
    }),
    updateSkin: publicProcedure
      .input(z.object({ skin: z.string() }))
      .mutation(async ({ input }) => {
        const username = await reddit.getCurrentUsername() || 'Anonymous';
        await redis.set(`user:${username}:skin`, input.skin);
        return { success: true };
      }),
  }),
  challenges: t.router({
    getDaily: publicProcedure.query(async () => {
      const day = new Date().getUTCDay();
      const challenges = [
        { id: 'high_score', title: 'Sky High', description: 'Reach 5000 altitude', target: 5000 },
        { id: 'upvotes', title: 'Karma Collector', description: 'Hit 10 upvotes in one run', target: 10 },
        { id: 'powerups', title: 'Power Lush', description: 'Collect 3 power-ups in one run', target: 3 },
        { id: 'stratosphere', title: 'Aeronaut', description: 'Reach the Stratosphere zone', target: 2000 },
        { id: 'space', title: 'Astronaut', description: 'Reach Space zone', target: 5000 },
        { id: 'beyond', title: 'Light Year', description: 'Reach the Beyond zone', target: 10000 },
        { id: 'fast_start', title: 'Fast Start', description: 'Reach 1000 altitude in 5 seconds', target: 1000 },
      ];
      return challenges[day % challenges.length];
    }),
    submit: publicProcedure
      .input(z.object({ challengeId: z.string() }))
      .mutation(async ({ input }) => {
        const username = await reddit.getCurrentUsername() || 'Anonymous';
        const key = `user:${username}:challenge:${input.challengeId}`;
        await redis.set(key, 'completed');
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
