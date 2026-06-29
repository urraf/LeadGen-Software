# LeadGen AI SaaS — Project Walkthrough

The production-ready, personal-use AI-powered Lead Generation SaaS has been successfully built according to the 20-module implementation plan. Both the backend (Express + TypeScript + BullMQ) and frontend (React + Vite + Tailwind) are fully coded, typed, and compiled successfully.

> [!TIP]
> This platform runs in a Dockerized environment and uses a rich, dark-themed UI.

## Features Completed

### 1. Backend Core & Integrations
- **Google Places API**: Automated search with pagination and filtering for local businesses.
- **Groq AI (Llama 3)**: Intelligent lead scoring and hyper-personalized WhatsApp message generation.
- **WhatsApp Web (Puppeteer)**: Local authentication and automated message sending, including reading incoming replies to update lead statuses.
- **Background Jobs (BullMQ)**: Redis-backed queues for campaign searches, sending initial messages, and scheduling smart follow-ups (up to 2 follow-ups spaced 3 days apart).
- **Security & Database**: Express with Helmet, Zod validation, rate-limiting, MongoDB models, and secure JWT authentication.

### 2. Frontend Interface
- **Dashboard**: High-level metrics, line charts for daily lead generation, and recent active campaigns.
- **Campaigns Page**: Manage automated searches. You can create campaigns with filters (e.g., minimum rating, specific cities, exclude businesses with websites) and schedule them to run daily at 8 AM.
- **Leads Manager**: Filterable data table to review, AI-score, and export leads. Clicking a lead opens a detailed drawer with message history and quick actions.
- **Analytics**: Deep dive into funnel conversions and top-performing categories/cities with Recharts visualizations.

## Setup & Running Locally

1. **Environment Variables**:
   In `/Users/farhan/Desktop/github/lead generation bot/`, ensure your `.env` file is properly populated (you can use `.env.example` as a template). Since you do not have a Google Places API key, the system will log a warning and gracefully skip the search functionality without crashing.

2. **Start the Database & Cache**:
   ```bash
   docker-compose up -d mongo redis
   ```

3. **Start the Backend**:
   In a new terminal window:
   ```bash
   cd backend
   npm run dev
   ```
   > [!IMPORTANT]
   > On the first run, it will automatically generate the admin user (`admin@leadgen.com` / `admin123`) and a QR code in the terminal. **Scan this QR code with your WhatsApp app to authenticate.**

4. **Start the Frontend**:
   In another terminal window:
   ```bash
   cd frontend
   npm run dev
   ```
   Visit `http://localhost:3000` and sign in.

## Next Steps & Verification

Everything compiled successfully and all dependencies are installed. When you are ready to test it completely end-to-end, you will simply need to add a Google Places API key to your `.env` file, and scan the WhatsApp QR code that appears in your backend console log.
