# FocusFlow - Brain-Aware Productivity App

A clean scaffold for a brain-aware productivity app built with Next.js, Tailwind CSS, and modern web technologies.

## Features

- **Session Page**: 3-column responsive layout with task management, timer, and live focus tracking
- **History Page**: Analytics and session history with charts
- **Top Bar**: App branding, focus status indicator, EEG connection status, and navigation
- **Responsive Design**: Works on desktop and mobile devices
- **Dark Mode**: Automatic dark/light mode support

## Tech Stack

- **Next.js 15** - React framework
- **Tailwind CSS v4** - Utility-first CSS framework
- **Geist Font** - Modern typography
- **Responsive Grid** - Mobile-first design

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```

3. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── app/
│   ├── layout.js          # Root layout with top bar
│   ├── page.js           # Session page (main)
│   ├── history/
│   │   └── page.js       # History page
│   └── globals.css        # Global styles with Tailwind
├── components/            # React components (to be added)
├── store/                 # State management (to be added)
├── hooks/                 # Custom hooks (to be added)
└── db/                    # Database layer (to be added)
```

## Pages

### Session Page (`/`)
- **Left Column**: TaskList placeholder for task management
- **Center Column**: TimerRing and Controls for focus sessions
- **Right Column**: LiveTimeline and SessionStats for real-time feedback

### History Page (`/history`)
- **Charts Section**: Focus distribution and task performance
- **Sessions Table**: Recent session data with analytics

## Top Bar Features

- **App Name**: FocusFlow branding
- **Status Pill**: Shows current focus state (Focused/Unfocused)
- **EEG Indicator**: Connection status dot
- **Navigation**: Links to Session and History pages

## Styling

The app uses a minimal, neutral design with:
- Custom CSS variables for theming
- Responsive breakpoints (mobile-first)
- Dark mode support
- Focus/unfocus color coding (green/red)
- Clean typography with Geist fonts

## Next Steps

This scaffold provides the foundation for building a full brain-aware productivity app. Future development can include:

1. **State Management**: Zustand store for session data
2. **Database**: Dexie for IndexedDB persistence  
3. **EEG Integration**: Mock WebSocket for brain data
4. **Components**: TaskList, TimerRing, Controls, etc.
5. **Analytics**: Recharts for data visualization

## Development

The app is ready for development with:
- ✅ Tailwind CSS configured
- ✅ Responsive layout structure
- ✅ Navigation between pages
- ✅ Placeholder components
- ✅ Clean, minimal styling

Start building your brain-aware productivity features on this solid foundation!