/** @type { import("drizzle-kit").Config } */
export default {
	schema: './src/lib/server/db/schema.ts',
	dialect: 'turso',
	dbCredentials: {
		url: process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || 'file:local.db',
		authToken: process.env.TURSO_AUTH_TOKEN || process.env.DATABASE_AUTH_TOKEN
	},
	verbose: true,
	strict: true
};
