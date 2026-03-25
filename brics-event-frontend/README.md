# BRICS Event Frontend

A comprehensive event management platform for BRICS events, providing seamless registration, delegate management, travel coordination, and administrative controls.

## 🚀 Features

### User Features
- **Event Registration** - Multi-step registration process with role selection
- **Profile Management** - Complete profile with document uploads
- **Delegate Management** - Invite and manage delegates for events
- **Travel Management** - Comprehensive travel details with flight and accommodation tracking
- **Event Attendance** - View and manage event participation
- **Accreditation Pass** - Digital pass generation with QR codes

### Admin Features
- **Dashboard** - Overview of events, delegates, and statistics
- **Event Management** - Create, edit, and manage events (All, Upcoming, Past, Drafts)
- **Event Managers** - Assign and manage event managers
- **DAO Management** - Create and manage Designated Authorized Officers
- **Delegate Oversight** - View and manage all delegates across events

## 📁 Project Structure

```
src/
├── app/                      # Redux store configuration
├── assets/                   # Images, logos, and static assets
├── components/
│   ├── common/              # Shared components (Modals, Loaders, Protected Routes)
│   ├── layout/              # Layout components (Sidebar, Topbar, Layouts)
│   └── ui/                  # Reusable UI components (Cards, Headers, Pass)
├── constants/               # App-wide constants (airports, event categories)
├── features/                # Feature-based modules
│   ├── admin/              # Admin dashboard and management
│   ├── auth/               # Authentication (Login, OTP verification)
│   ├── dashboard/          # User dashboard
│   ├── delegates/          # Delegate management
│   ├── events/             # Event details and management
│   ├── profile/            # User profile
│   ├── registration/       # Event registration flow
│   ├── travel/             # Travel details management
│   └── user/               # User state management
├── hooks/                   # Custom React hooks
├── lib/                     # Third-party library configurations
├── services/                # API service layer
├── utils/                   # Utility functions
└── App.jsx                  # Main application component
```

## 🛠️ Tech Stack

- **Framework:** React 18
- **Build Tool:** Vite
- **State Management:** Redux Toolkit
- **Routing:** React Router v6
- **Styling:** Tailwind CSS
- **Data Fetching:** TanStack Query (React Query)
- **Form Handling:** React Hook Form + Zod
- **Icons:** Lucide React
- **Notifications:** React Toastify
- **PDF Generation:** jsPDF + html2canvas
- **QR Codes:** qrcode.react

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Docker (for containerized deployment)

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd brics-event-frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Environment Variables**
   
   Create a `.env` file in the root directory:
   ```env
   VITE_FRONTEND_URL=http://localhost:5173
   VITE_API_URL=<your-api-url>
   ```

4. **Run development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. **Build for production**
   ```bash
   npm run build
   # or
   yarn build
   ```

6. **Preview production build**
   ```bash
   npm run preview
   # or
   yarn preview
   ```

## 🐳 Docker Deployment

### Build Frontend Docker Image

```bash
docker build -t brics_event_frontend .
```

### Run Frontend Container

```bash
docker run -d -p 80:83 --name brics_event_frontend brics_event_frontend
```

### Stop Frontend Container

```bash
docker stop brics_event_frontend
```

### Remove Frontend Container

```bash
docker rm brics_event_frontend
```

### Redeploy Frontend (One Command)

```bash
docker rm -f brics_event_frontend && docker run -d -p 80:83 --name brics_event_frontend brics_event_frontend
```

### View Frontend Logs

```bash
docker logs brics_event_frontend
```

### Frontend Access

- **Local Development:** http://localhost:5173
- **Docker Container:** http://localhost

## 🔐 User Roles

### Normal Users
- **DAO (Designated Authorized Officer)**
- **Delegate**
- **Head of Delegate**

### Admin Users
- **Super Admin** - Full system access
- **Event Manager** - Event-specific management

## 🎯 Key Features Explained

### Unified Sidebar
The application uses a single, intelligent sidebar component that adapts based on user role:
- **Admin users** see event management, manager controls, and admin dashboard
- **Normal users** see profile, events, travel details, and help

### Role-Based Access Control
- Protected routes ensure users only access authorized sections
- Automatic redirection based on user role after login
- Separate admin and user dashboards

### Travel Management
- Comprehensive travel detail collection
- Flight information tracking
- Accommodation details
- Document upload (tickets, visa, etc.)
- Multi-event travel tracking

### Delegate System
- DAOs can invite delegates to events
- Role selection (Delegate or Head of Delegate)
- Maximum delegate limits per event
- Delegate status tracking (invited, confirmed)

## 🔄 Data Flow

1. **Authentication**
   - OTP-based login system
   - JWT token storage
   - Role-based redirect after login

2. **Protected Routes**
   - Route guards check user authentication
   - Role validation for admin/user sections
   - Automatic navigation to appropriate dashboard

3. **API Integration**
   - Centralized axios instance with interceptors
   - React Query for data fetching and caching
   - Optimistic updates for better UX

## 🎨 Styling Guidelines

- **Tailwind CSS** for utility-first styling
- **Gradient backgrounds** for modern look
- **Responsive design** - Mobile-first approach
- **Consistent spacing** using Tailwind's spacing scale
- **Color scheme:**
  - Primary: Blue (#3B82F6, #2563EB)
  - Success: Green
  - Error: Red
  - Warning: Orange

## 📱 Responsive Design

- **Mobile** - Hamburger menu, stacked layouts
- **Tablet** - Adaptive sidebar, optimized spacing
- **Desktop** - Full sidebar, multi-column layouts

## 🧪 Development Guidelines

### Code Organization
- Feature-based folder structure
- Colocate related components
- Separate business logic from UI components

### Naming Conventions
- **Components:** PascalCase (e.g., `EventCard.jsx`)
- **Utilities:** camelCase (e.g., `formatDateWithOrdinal.js`)
- **Constants:** UPPER_SNAKE_CASE (e.g., `ALL_INDIAN_AIRPORTS`)

### Import Order
1. React and third-party libraries
2. Internal components
3. Utils and services
4. Assets and styles

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint (if configured)

## 🌐 Deployment

### Docker Configuration
- **Image name:** brics_event_frontend
- **Container name:** brics_event_frontend
- **Internal port:** 83
- **Public port:** 80
- **Allowed hosts:** devbricsevents.negd.in

### Build Output
- Build directory: `dist/`
- Preview port: 5173

## 📄 License

[Your License Here]

## 👥 Contributors

[Your Team Information]

## 📞 Support

For support and queries, please contact:
- Email: [support email]
- Website: [website url]

---
