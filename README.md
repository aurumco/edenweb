# Eden Raid Manager

Eden Raid Manager is a Next.js-based web application for managing World of Warcraft raid rosters, signups, and run organization. It connects to a Cloudflare Worker backend (`eden-worker`) and integrates with Discord for authentication and notifications.

## Tech Stack

- **Frontend:** Next.js 15 (App Router), Tailwind CSS, shadcn/ui, Lucide Icons
- **Backend:** Cloudflare Workers, D1 Database
- **Authentication:** Discord OAuth2
- **State/Data:** SWR, Server Actions (optional), Fetch API

## Getting Started

1.  **Install Dependencies:**
    ```bash
    npm install
    ```

2.  **Environment Setup:**
    Create a `.env` (or `.env.local`) file with the following:
    ```bash
    NEXT_PUBLIC_API_URL=https://api.edenhub.net
    NEXT_PUBLIC_SERVER_ID=your_discord_server_id
    ```

3.  **Run Development Server:**
    ```bash
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000) in your browser.

## Key Features

- **Dashboard:** View upcoming runs and manage character availability.
- **Profile:** Track gold balance, performance stats, and reliability score.
- **Admin:**
    - Create and manage raid runs.
    - Drag-and-drop roster management.
    - Manual signups and roster announcements to Discord.
- **Character Management:** Register characters with ilevel and specs.

## Deployment

This project is configured for deployment on Vercel or Cloudflare Pages. Ensure the environment variables are set in your deployment settings.
