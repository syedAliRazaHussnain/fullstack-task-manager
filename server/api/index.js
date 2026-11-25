// Vercel entry point. Vercel turns every file in /api into a serverless function.
// It runs `npm run build` first (see vercel.json), so the compiled app in dist/ exists.
// An Express app is a plain (req, res) handler, so it can be the function's default export.
import { createApp } from '../dist/app.js';

export default createApp();
