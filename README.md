<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1I3EHQRK4OofMY8LuI5dlJuJUZDzx2URh

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the server-side environment variables in `.env.local`:
   `GEMINI_API_KEY=your_gemini_key`
   `BLOB_READ_WRITE_TOKEN=your_vercel_blob_read_write_token`
3. In Vercel, add these same variables to the project environments before testing uploads in Preview or Production.
4. Run the app:
   `npm run dev`
