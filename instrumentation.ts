/**
 * Next.js instrumentation file for server-side initialization
 * This runs once when the server starts
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Dynamic import to avoid bundling server code in client
    const { initializeApp } = await import('./lib/init');
    initializeApp();
  }
}