# Follow Investments

A comprehensive investment tracking dashboard built with .NET 8, React, and PostgreSQL, allowing users to manage investments across multiple currencies (BRL and CAD).

## Features

- **Investment Registration**: Add investments with value, currency, date, description, category, and account
- **Multi-Currency Support**: Support for Brazilian Real (BRL) and Canadian Dollar (CAD)
- **Dashboard**: Visual representation of investments with charts and tables
- **Categories**: Support for "Renda Fixa", "Stocks", and "FIIs"
- **Country-based Analytics**: Automatic country assignment based on currency

## Tech Stack

- **Backend**: .NET 8 Web API
- **Frontend**: React 18 with TypeScript (Vite)
- **Database**: PostgreSQL 15
- **Containerization**: Docker & Docker Compose
- **Charts**: Recharts library

## Project Structure

```
follow-investments/
├── backend/
│   └── FollowInvestments.Api/          # .NET 8 Web API
├── frontend/
│   └── investment-dashboard/           # React TypeScript App
├── data/
│   └── postgres/                       # PostgreSQL data volume
├── docker-compose.yml                  # Docker orchestration
└── README.md
```

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Git

### Running the Application

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd follow-investments
   ```

2. **Start all services**
   ```bash
   docker-compose up -d
   ```

3. **Access the application**
   - Frontend: http://localhost:9000
   - Backend API: http://localhost:9900
   - Swagger UI: http://localhost:9900/swagger

4. **Stop the application**
   ```bash
   docker-compose down
   ```

## Development

### Backend Development

```bash
cd backend/FollowInvestments.Api
dotnet restore
dotnet run
```

### Frontend Development

```bash
cd frontend/investment-dashboard
npm install
npm run dev
```

### Database Operations

```bash
# Create migration
cd backend/FollowInvestments.Api
dotnet ef migrations add <MigrationName>

# Update database
dotnet ef database update
```

## API Endpoints

### Investments

- `GET /api/investments` - Get all investments
- `GET /api/investments/{id}` - Get investment by ID
- `POST /api/investments` - Create new investment
- `PUT /api/investments/{id}` - Update investment
- `DELETE /api/investments/{id}` - Delete investment
- `GET /api/investments/dashboard` - Get dashboard data

### Request/Response Examples

**Create Investment**
```json
{
  "value": 1000.50,
  "currency": "BRL",
  "date": "2024-01-15",
  "description": "Investment in Brazilian stocks",
  "category": "Stocks",
  "account": "XP Investimentos"
}
```

## Environment Variables

### Backend
- `ConnectionStrings__DefaultConnection`: PostgreSQL connection string
- `ASPNETCORE_ENVIRONMENT`: Environment (Development/Production)

### Frontend
- API_BASE_URL: Backend API URL (configured in api.ts)

## Database Schema

### Investment Entity
- `Id` (int, auto-generated)
- `Value` (decimal)
- `Currency` (enum: BRL, CAD)
- `Date` (DateTime)
- `Description` (string, max 500 chars)
- `Category` (enum: RendaFixa, Stocks, FIIs)
- `Account` (string, max 100 chars)
- `Country` (computed: Brazil for BRL, Canada for CAD)

## Docker Configuration

The application uses multi-stage Docker builds:

- **PostgreSQL**: Official postgres:15-alpine image with data persistence
- **Backend**: Multi-stage .NET build with ASP.NET Core runtime
- **Frontend**: Node.js build stage + Nginx for serving static files

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.
