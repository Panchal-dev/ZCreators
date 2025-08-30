# 🌱 Green Hydrogen Subsidy Platform

<div align="center">

![Green Hydrogen Platform](1.png)

**A Revolutionary Blockchain-Based Green Hydrogen Subsidy Management System**

[![React](https://img.shields.io/badge/React-18.2.0-blue.svg)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248.svg)](https://www.mongodb.com/)
[![Blockchain](https://img.shields.io/badge/Blockchain-Ethereum-627EEA.svg)](https://ethereum.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[🚀 Live Demo](#demo) • [📖 Documentation](#documentation) • [🛠️ Installation](#installation) • [🤝 Contributing](#contributing)

</div>

## 📋 Table of Contents

- [🌟 Features](#features)
- [🏗️ Architecture](#architecture)
- [🎯 Screenshots](#screenshots)
- [🚀 Quick Start](#quick-start)
- [📦 Installation](#installation)
- [⚙️ Configuration](#configuration)
- [🔧 API Documentation](#api-documentation)
- [🧪 Testing](#testing)
- [📱 Mobile Support](#mobile-support)
- [🌍 Environment Variables](#environment-variables)
- [🤝 Contributing](#contributing)
- [📄 License](#license)

## 🌟 Features

### 🎨 **Modern UI/UX Design**
- **Dark/Light Theme Support** - Seamless theme switching with beautiful animations
- **Responsive Design** - Optimized for desktop, tablet, and mobile devices
- **Framer Motion Animations** - Smooth, professional animations throughout the app
- **Intuitive Navigation** - Easy-to-use interface with clean design patterns

![Modern UI Design](2.png)

### 🔐 **Multi-Role Authentication System**
- **Government Officials** - Approve and manage subsidy programs
- **Green Hydrogen Producers** - Submit applications and track projects
- **Independent Auditors** - Verify and audit project milestones
- **Data Oracles** - Provide real-time environmental and production data

### ⛓️ **Blockchain Integration**
- **Smart Contract Management** - Automated subsidy distribution
- **Immutable Transaction Records** - Complete audit trail on blockchain
- **Multi-Wallet Support** - MetaMask, WalletConnect, and more
- **Real-time Blockchain Monitoring** - Track all transactions and events

![Blockchain Integration](3.png)

### 📊 **Project Management Dashboard**
- **Real-time Analytics** - Live project statistics and performance metrics
- **Interactive Charts** - Beautiful data visualizations with Recharts
- **Milestone Tracking** - Progress monitoring with automated notifications
- **Document Management** - Secure file upload and version control

![Dashboard Analytics](4.png)

### 💰 **Smart Subsidy Management**
- **Automated Payments** - Smart contract-based subsidy distribution
- **Multi-tier Approval Process** - Government oversight and compliance
- **Performance-based Releases** - Milestone-driven payment system
- **Real-time Verification** - Oracle-based data validation

### 🔍 **Advanced Audit System**
- **Complete Audit Trail** - Every action logged with timestamps
- **Compliance Reporting** - Automated regulatory compliance checks
- **Risk Assessment** - AI-powered risk analysis and alerts
- **Data Export** - Export audit data in multiple formats

![Audit System](5.png)

## 🏗️ Architecture

### 🔧 **Technology Stack**

#### **Frontend (React 18 + Vite)**
- **React 18** - Latest React with concurrent features
- **Vite** - Lightning-fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Production-ready motion library
- **React Query** - Powerful data synchronization
- **Zustand** - Lightweight state management
- **React Router** - Declarative routing
- **Lucide React** - Beautiful, customizable icons

#### **Backend (Node.js + Express)**
- **Node.js 18+** - Latest LTS version
- **Express.js** - Fast, minimalist web framework
- **MongoDB Atlas** - Cloud-native database
- **JWT Authentication** - Secure token-based auth
- **Joi Validation** - Schema validation
- **bcryptjs** - Password hashing
- **Multer** - File upload handling

#### **Blockchain Layer**
- **Ethereum** - Smart contract platform
- **Web3.js** - Blockchain interaction library
- **Ethers.js** - Ethereum library and wallet implementation
- **MetaMask Integration** - Browser wallet connectivity

```mermaid
graph TB
    A[Frontend - React 18] --> B[Backend - Node.js/Express]
    B --> C[MongoDB Atlas Database]
    B --> D[Blockchain Network]
    D --> E[Smart Contracts]
    F[External Oracles] --> B
    G[File Storage] --> B
    H[Email Service] --> B
```

## 🎯 Screenshots

### 🏠 **Landing Page & Authentication**
Beautiful, responsive landing page with seamless authentication flow.

![Landing Page](1.png)

### 📊 **Dashboard Overview**
Comprehensive dashboard with real-time analytics and project insights.

![Dashboard](2.png)

### 🗂️ **Project Management**
Intuitive project creation and management interface.

![Project Management](3.png)

### 📈 **Analytics & Reports**
Advanced analytics with interactive charts and data visualization.

![Analytics](4.png)

### ⚙️ **Settings & Profile**
User-friendly settings panel with theme customization.

![Settings](5.png)

### 📱 **Mobile Responsive**
Fully responsive design optimized for mobile devices.

![Mobile View](6.png)

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ ([Download](https://nodejs.org/))
- **MongoDB Atlas Account** ([Create Account](https://www.mongodb.com/cloud/atlas))
- **Git** ([Download](https://git-scm.com/))

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/yourusername/green-hydrogen-platform.git
cd green-hydrogen-platform
```

### 2️⃣ Backend Setup
```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Start the backend server
npm start
```
🚀 **Backend running on:** `http://localhost:5000`

### 3️⃣ Frontend Setup
```bash
# Navigate to frontend directory
cd frontend-v2

# Install dependencies
npm install

# Start the development server
npm run dev
```
🚀 **Frontend running on:** `http://localhost:3002`

### 4️⃣ Open Your Browser
Navigate to `http://localhost:3002` and start exploring! 🎉

## 📦 Installation

### 🔧 **Detailed Backend Setup**

1. **Install Dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Environment Configuration**
   ```bash
   # Copy environment template
   cp .env.example .env
   ```

3. **Configure Environment Variables**
   ```env
   # Database
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/green-hydrogen
   
   # Authentication
   JWT_SECRET=your-super-secret-jwt-key
   JWT_EXPIRE=30d
   
   # Email Configuration
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   
   # Blockchain
   BLOCKCHAIN_RPC_URL=http://localhost:8545
   CONTRACT_ADDRESS=0x...
   ```

4. **Start the Server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

### 🎨 **Detailed Frontend Setup**

1. **Install Dependencies**
   ```bash
   cd frontend-v2
   npm install
   ```

2. **Environment Configuration**
   ```bash
   # Create environment file
   echo "VITE_API_URL=http://localhost:5000/api" > .env.local
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

4. **Build for Production**
   ```bash
   npm run build
   npm run preview
   ```

## ⚙️ Configuration

### 🔐 **Authentication Setup**

1. **JWT Configuration**
   - Generate a strong JWT secret
   - Set appropriate expiration times
   - Configure refresh token rotation

2. **OAuth Integration** (Optional)
   - Google OAuth setup
   - GitHub OAuth setup
   - Custom OAuth providers

### 📧 **Email Configuration**

1. **Gmail Setup**
   ```bash
   # Enable 2FA on your Gmail account
   # Generate app password
   # Use app password in EMAIL_PASS
   ```

2. **Alternative Email Providers**
   - SendGrid
   - Mailgun
   - AWS SES

### ⛓️ **Blockchain Configuration**

1. **Local Development**
   ```bash
   # Install Ganache
   npm install -g ganache-cli
   
   # Start local blockchain
   ganache-cli --deterministic --accounts 10 --host 0.0.0.0
   ```

2. **Testnet Deployment**
   - Sepolia Testnet
   - Goerli Testnet
   - Mumbai Polygon

## 🔧 API Documentation

### 🔑 **Authentication Endpoints**

```bash
# Register new user
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securePassword123",
  "role": "producer",
  "organization": "Green Energy Corp"
}

# User login
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securePassword123"
}

# Get current user profile
GET /api/auth/profile
Authorization: Bearer <token>
```

### 🏗️ **Project Management Endpoints**

```bash
# Create new project
POST /api/projects
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Solar-Powered Hydrogen Plant",
  "description": "Large-scale hydrogen production facility",
  "location": {
    "coordinates": [-122.4194, 37.7749],
    "address": "San Francisco, CA"
  },
  "expectedCapacity": 1000,
  "totalSubsidy": 500000
}

# Get all projects
GET /api/projects?page=1&limit=10&status=active
Authorization: Bearer <token>

# Update project
PUT /api/projects/:id
Authorization: Bearer <token>
```

### 📊 **Analytics Endpoints**

```bash
# Get dashboard statistics
GET /api/analytics/dashboard
Authorization: Bearer <token>

# Get project analytics
GET /api/analytics/projects/:id
Authorization: Bearer <token>

# Export data
GET /api/analytics/export?format=csv&dateRange=last30days
Authorization: Bearer <token>
```

## 🧪 Testing

### 🔧 **Backend Testing**
```bash
cd backend

# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### 🎨 **Frontend Testing**
```bash
cd frontend-v2

# Run unit tests
npm run test

# Run e2e tests
npm run test:e2e

# Visual regression tests
npm run test:visual
```

## 📱 Mobile Support

### 📱 **Responsive Design**
- **Mobile-First Approach** - Designed for mobile, enhanced for desktop
- **Touch-Friendly Interface** - Large buttons and easy navigation
- **Progressive Web App** - Installable on mobile devices
- **Offline Support** - Basic functionality works offline

### 📲 **PWA Features**
- Service Worker for caching
- Web App Manifest
- Push notifications
- Background sync

## 🌍 Environment Variables

### 🔧 **Backend Environment**

```env
# Server Configuration
NODE_ENV=development
PORT=5000

# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname
MONGODB_TEST_URI=mongodb+srv://username:password@cluster.mongodb.net/test

# Authentication
JWT_SECRET=super-secret-jwt-key
JWT_EXPIRE=30d

# Email Service
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@greenhydrogen.com

# Blockchain
BLOCKCHAIN_NETWORK=mainnet
BLOCKCHAIN_RPC_URL=https://mainnet.infura.io/v3/your-key
CONTRACT_ADDRESS=0x...
PRIVATE_KEY=your-private-key

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

# Security
BCRYPT_ROUNDS=12
MAX_LOGIN_ATTEMPTS=5
LOCK_TIME=900000

# Rate Limiting
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100

# External APIs
WEATHER_API_KEY=your-weather-api-key
ENERGY_API_KEY=your-energy-api-key
```

### 🎨 **Frontend Environment**

```env
# API Configuration
VITE_API_URL=http://localhost:5000/api
VITE_BLOCKCHAIN_NETWORK=localhost
VITE_BLOCKCHAIN_RPC_URL=http://localhost:8545

# Feature Flags
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_PWA=true
VITE_ENABLE_NOTIFICATIONS=true

# External Services
VITE_GOOGLE_ANALYTICS_ID=GA_TRACKING_ID
VITE_SENTRY_DSN=your-sentry-dsn
```

## 🤝 Contributing

We welcome contributions from the community! Here's how you can help:

### 🔧 **Development Process**

1. **Fork the Repository**
   ```bash
   git fork https://github.com/yourusername/green-hydrogen-platform.git
   ```

2. **Create Feature Branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

3. **Make Your Changes**
   - Follow our coding standards
   - Add tests for new features
   - Update documentation

4. **Commit Your Changes**
   ```bash
   git commit -m "Add amazing feature"
   ```

5. **Push to Branch**
   ```bash
   git push origin feature/amazing-feature
   ```

6. **Open Pull Request**
   - Describe your changes
   - Include screenshots if applicable
   - Link any related issues

### 📝 **Coding Standards**

- **JavaScript/React**: ESLint + Prettier configuration
- **Commit Messages**: Conventional Commits format
- **Testing**: Minimum 80% code coverage
- **Documentation**: JSDoc for functions, README updates

### 🐛 **Bug Reports**

Found a bug? Please create an issue with:
- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable
- Environment details

### 💡 **Feature Requests**

Have an idea? Create an issue with:
- Clear description of the feature
- Use case and benefits
- Proposed implementation (optional)
- Mockups or wireframes (if applicable)

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **React Team** - For the amazing React framework
- **Tailwind CSS** - For the utility-first CSS framework
- **Framer Motion** - For beautiful animations
- **MongoDB** - For the powerful database platform
- **Ethereum Foundation** - For blockchain technology

## 📞 Support

Need help? We're here for you:

- 📧 **Email**: support@greenhydrogen.com
- 💬 **Discord**: [Join our community](https://discord.gg/greenhydrogen)
- 🐛 **Issues**: [GitHub Issues](https://github.com/yourusername/green-hydrogen-platform/issues)
- 📚 **Documentation**: [Full Documentation](https://docs.greenhydrogen.com)

---

<div align="center">

**Built with ❤️ by the Green Hydrogen Platform Team**

⭐ **Star this repo if you find it helpful!** ⭐

[🚀 Get Started](#quick-start) • [📖 Documentation](#documentation) • [🤝 Contribute](#contributing)

</div>
