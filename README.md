# Epub Reader Demo

Demo version of an epub reader with basic functionality including file upload, reading progress tracking, and text excerpts.

## Features

- 📚 Upload and read EPUB files
- 📖 Automatic reading progress saving
- ✂️ Text excerpts and highlights
- 📱 Mobile-responsive design
- 🌐 Local network access for testing on multiple devices

## Quick Start

### Prerequisites

- Node.js (version 14 or higher)
- npm

### Installation and Setup

1. **Install all dependencies:**
   ```bash
   npm run setup
   ```

2. **Start the development servers:**
   ```bash
   npm run dev
   ```

   This will start both the frontend (React) and backend (Express) servers concurrently.

3. **Access the application:**
   - Local: http://localhost:3000
   - Network: http://[your-ip]:3000 (for testing on mobile devices)

### Individual Commands

- **Start frontend only:** `npm run client`
- **Start backend only:** `npm run server`
- **Install dependencies:** `npm run setup`

## Project Structure

```
epub-reader-demo/
├── client/                 # React frontend
│   ├── public/
│   ├── src/
│   └── package.json
├── server/                 # Express backend
│   ├── database/          # SQLite database setup
│   ├── uploads/           # Uploaded epub files
│   ├── app.js
│   └── package.json
├── package.json           # Root package with scripts
└── README.md
```

## Technology Stack

- **Frontend:** React 18, epub.js
- **Backend:** Node.js, Express
- **Database:** SQLite3
- **Development:** Concurrently for running both servers

## Development

The application runs in development mode with:
- Frontend on port 3000 (with proxy to backend)
- Backend on port 3001
- Hot reloading enabled for both frontend and backend

## Testing Connection

Once both servers are running, the frontend will automatically test the connection to the backend and display the status on the main page.

## Next Steps

This is the basic project structure. Additional features will be implemented in subsequent tasks:
- File upload functionality
- Epub.js integration
- Reading progress tracking
- Text excerpt management
- Mobile responsiveness