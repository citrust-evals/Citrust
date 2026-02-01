# 🍋 Citrus AI - LLM Evaluation Dashboard

A professional, modern dashboard for evaluating and comparing Language Model responses.

## ✨ Features

- **🎨 Modern Glass-morphism UI** - Beautiful, clean interface with smooth animations
- **💬 Chat Playground** - Compare dual responses from multiple LLM models side-by-side
- **📊 Evaluations Dashboard** - Track and analyze user preferences and feedback
- **🔍 Trace Analytics** - Detailed span-level performance monitoring
- **📈 Real-time Metrics** - Live statistics and performance charts
- **⚡ Full Backend Integration** - Connected to FastAPI backend with MongoDB

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Backend API running on `http://localhost:8000`

### Installation

1. **Install dependencies:**

```bash
npm install
```

1. **Create environment file:**

```bash
# Create .env file
echo "VITE_API_URL=http://localhost:8000" > .env
```

1. **Start development server:**

```bash
npm run dev
```

1. **Open browser:**
Navigate to `http://localhost:5173`

## 🏗️ Project Structure

```
citrus_frontend/
├── src/
│   ├── api.ts                 # API client with all backend endpoints
│   ├── utils.ts               # Utility functions (formatting, helpers)
│   ├── index.css              # Global styles with Tailwind
│   ├── App.tsx                # Main app with routing
│   ├── main.tsx               # Entry point
│   ├── components/            # Reusable UI components
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   ├── MetricCard.tsx
│   │   ├── StatusBadge.tsx
│   │   └── UIComponents.tsx
│   └── pages/                 # Main application pages
│       ├── ChatPlayground.tsx
│       ├── EvaluationsDashboard.tsx
│       ├── TracesPage.tsx
│       └── SettingsPage.tsx
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

## 📋 Available Scripts

```bash
npm run dev      # Start development server (port 5173)
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

## 🎯 Key Features Breakdown

### Chat Playground

- Dual-model response comparison
- Server-Sent Events (SSE) streaming
- Response selection and preference tracking
- Session management
- Beautiful chat interface with code highlighting

### Evaluations Dashboard

- Real-time evaluation statistics
- Filterable evaluation history
- Detailed evaluation viewer
- User preference tracking
- Export capabilities

### Trace Analytics

- Comprehensive trace visualization
- Span-level performance metrics
- Token usage tracking
- Model comparison charts
- Latency analysis (P50, P95, P99)

### Settings

- System health monitoring
- API configuration
- Version information
- Database connection status

## 🔌 API Integration

The frontend connects to these backend endpoints:

### Chat

- `POST /api/dual-responses` - Streaming dual responses

### Evaluations

- `GET /api/v1/evaluations` - List evaluations
- `GET /api/v1/evaluations/{id}` - Get specific evaluation
- `GET /api/v1/evaluations/stats` - Get statistics
- `POST /api/v1/evaluations/preference` - Submit preference

### Traces

- `GET /api/v1/traces` - List traces
- `GET /api/v1/traces/{id}` - Get specific trace
- `GET /api/v1/traces/statistics` - Get statistics
- `GET /api/v1/traces/session/{id}` - Get session traces

### Health

- `POST /api/health` - Health check

## 🎨 Design System

### Colors

- **Primary**: `#caff61` (Citrus Green)
- **Background**: `#0A0E12` (Dark)
- **Surface**: `#161810` (Dark Surface)
- **Glass**: `rgba(26, 32, 41, 0.5)` with blur

### Typography

- **Display**: Space Grotesk
- **Monospace**: JetBrains Mono

### Components

- Glass-morphism panels
- Smooth animations
- Material Icons
- Responsive design

## 🛠️ Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **React Router** - Routing
- **Recharts** - Data visualization
- **Lucide React** - Icons
- **date-fns** - Date formatting

## 📦 Environment Variables

```bash
VITE_API_URL=http://localhost:8000  # Backend API URL
```

## 🔧 Configuration

### Vite Proxy

The development server proxies `/api` requests to the backend:

```typescript
proxy: {
  '/api': {
    target: 'http://localhost:8000',
    changeOrigin: true,
  }
}
```

## 📱 Responsive Design

The dashboard is fully responsive and works on:

- Desktop (1920px+)
- Laptop (1280px)
- Tablet (768px)
- Mobile (375px+)

## 🚀 Deployment

### Build for Production

```bash
npm run build
```

This creates optimized files in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - See LICENSE file for details

## 🙏 Acknowledgments

- Built with React and TypeScript
- Designed for modern AI/ML workflows
- Inspired by professional analytics platforms

---

**Built with ❤️ by the Citrus AI Team**
