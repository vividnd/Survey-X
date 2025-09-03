# Deploying survey-x-frontend to Vercel

1. Create a new Vercel project and set the project root to `survey-x-frontend`.
2. Set environment variables in Vercel (Project Settings → Environment Variables):
   - `NEXT_PUBLIC_PROGRAM_ID=FoZGZMWrz5ATiCDJsyakp8bxF9gZjGBWZFGpJQrLEgtY`
   - `NEXT_PUBLIC_CLUSTER_OFFSET=1116522165`
   - `NEXT_PUBLIC_HELIUS_API_KEY=YOUR_HELIUS_KEY`
3. Framework preset: Next.js. Build command: `npm run build`. Output: `.next` (default).
4. Connect GitHub repo or use `vercel` CLI from this folder to deploy.

After deploy, open the URL, connect Phantom on Devnet, and use the app.
