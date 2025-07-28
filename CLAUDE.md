# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an investment tracking dashboard application that allows users to manage investments across two currencies (BRL for Brazil and CAD for Canada). The application consists of a CRUD interface for investment registration and a dashboard for visualizing investment data.

## Tech Stack Requirements

- **Backend**: .NET 8
- **Database**: PostgreSQL
- **Frontend**: Free choice (recommend React/Vue/Angular)
- **Deployment**: Docker with docker-compose
- **Data Persistence**: PostgreSQL data should be stored in `./data/postgres` volume

## Core Features to Implement

### Investment Registration
- Value input
- Currency selection (BRL/CAD)
- Date picker
- Description field
- Category selection ("Renda Fixa", "Stocks", "FIIs")
- Account field
- Auto-generated ID

### Dashboard Views
- List of all investments/assets
- Graph showing assets per account
- Assets breakdown per country (based on currency)

## Development Commands

Since this is a new project, the following commands will need to be established:

**Backend (.NET 8)**
```bash
# When created, typical commands will be:
dotnet run
dotnet build
dotnet test
```

**Frontend**
```bash
# Commands depend on chosen framework (React/Vue/Angular)
npm install
npm run dev
npm run build
npm run test
```

**Docker**
```bash
docker-compose up -d
docker-compose down
docker-compose build
```

## Database Schema Considerations

The main investment entity should include:
- ID (auto-generated)
- Value (decimal)
- Currency (BRL/CAD enum)
- Date
- Description
- Category (enum: "Renda Fixa", "Stocks", "FIIs")
- Account
- Country (derived from currency)

## Development Setup

1. Set up PostgreSQL container with volume mapping to `./data/postgres`
2. Create .NET 8 Web API project for backend
3. Choose and set up frontend framework
4. Configure docker-compose for all services
5. Implement database migrations for investment schema