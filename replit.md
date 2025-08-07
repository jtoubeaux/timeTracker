# TimeKeeper Pro - Employee Time & Location Tracking

## Overview

TimeKeeper Pro is a professional employee time tracking application with GPS breadcrumb monitoring and automatic spreadsheet integration for field workers. The system provides real-time location tracking, comprehensive timesheet management, and seamless synchronization with Google Sheets for payroll and reporting purposes.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript and Vite for fast development and hot reloading
- **UI Library**: Shadcn/ui components built on Radix UI primitives for accessible, customizable components
- **Styling**: Tailwind CSS with a custom design system including light/dark theme support
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Maps Integration**: Leaflet for interactive mapping and location visualization
- **Real-time Communication**: WebSocket connection for live updates and notifications

### Backend Architecture
- **Framework**: Express.js with TypeScript for type-safe server development
- **API Pattern**: RESTful API design with WebSocket endpoints for real-time features
- **Development Server**: Vite middleware integration for seamless full-stack development
- **Data Validation**: Zod schemas for runtime type checking and API validation
- **Storage Abstraction**: Interface-based storage layer supporting both in-memory and database implementations

### Data Storage Solutions
- **ORM**: Drizzle ORM for type-safe database operations and migrations
- **Database**: PostgreSQL configured for production with Neon serverless database support
- **Schema Design**: Relational model with employees, time entries, location breadcrumbs, and departure tracking
- **Development Storage**: In-memory storage implementation for rapid prototyping and testing

### Location Tracking System
- **GPS Breadcrumbs**: Continuous location logging during active work sessions with configurable accuracy
- **Departure Detection**: Automatic detection and logging of location changes between work sites
- **Geolocation API**: Browser-based location services with fallback handling and error management
- **Address Resolution**: Reverse geocoding for human-readable location descriptions

### External Dependencies

#### Third-Party Services
- **Neon Database**: Serverless PostgreSQL hosting for production data storage
- **Google Sheets API**: Automatic synchronization of departure data for payroll and reporting
- **Leaflet Maps**: Open-source mapping library for location visualization
- **Google Fonts**: Roboto and Roboto Condensed font families for consistent typography

#### Development Tools
- **Replit Integration**: Development environment support with runtime error handling and cartographer plugin
- **ESBuild**: Fast bundling for production server builds
- **PostCSS**: CSS processing with Tailwind CSS and Autoprefixer plugins

#### UI Component Libraries
- **Radix UI**: Comprehensive set of accessible, unstyled UI primitives
- **Lucide React**: Icon library for consistent iconography
- **Class Variance Authority**: Utility for creating variant-based component APIs
- **Embla Carousel**: Touch-friendly carousel components

#### Form and Validation
- **React Hook Form**: Performant form library with minimal re-renders
- **Hookform Resolvers**: Integration layer for Zod schema validation
- **Drizzle Zod**: Automatic schema generation from database models

#### Real-time Features
- **WebSocket**: Native WebSocket implementation for real-time location updates
- **Session Management**: PostgreSQL-based session storage with connect-pg-simple