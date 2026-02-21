import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/migrate.ts'],
  format: ['esm'],
  target: 'node24',
  outDir: 'dist',
  splitting: false,
  clean: true,
  external: [
    '@aws-sdk/client-s3',
    '@hono/node-server',
    '@octokit/auth-app',
    '@octokit/rest',
    'dotenv',
    'drizzle-orm',
    'hono',
    'isomorphic-git',
    'jose',
    'openai',
    'postgres',
    'zod',
  ],
})
