# 📊 Bull Market Support Band Dashboard

> Real-time Bull Market Support Band analysis for top 100 cryptocurrencies

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fsatsoft%2Fbullmarketsupportband)

## 🚀 Features

- **Real-time BMSB Analysis** - Live Bull Market Support Band calculations for top 100 cryptocurrencies
- **20W SMA & 21W EMA** - Accurate weekly simple and exponential moving averages
- **TradingView Integration** - Interactive charts with exchange-specific symbol mapping
- **Smart Token Filtering** - Excludes stablecoins, wrapped tokens, and derivatives
- **Dynamic Gold Token Selection** - Automatically shows PAXG or XAUT based on market cap
- **Automated Updates** - Price updates every 10 minutes, BMSB calculations every hour
- **Health Indicators** - Visual band health status (healthy/mixed/weak)
- **Production Ready** - Full automation, security, and monitoring

## 📈 What is BMSB?

The Bull Market Support Band (BMSB) is a technical analysis tool using:
- **20-week Simple Moving Average (SMA)** - Long-term trend baseline
- **21-week Exponential Moving Average (EMA)** - More responsive trend indicator

When price stays above both moving averages, it indicates a healthy bull market. The band acts as dynamic support during market corrections.

## 🛠️ Tech Stack

- **Framework**: Next.js 13+ with App Router
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS + shadcn/ui
- **Charts**: TradingView Charting Library
- **Data Source**: CoinGecko API
- **Deployment**: Vercel
- **Automation**: GitHub Actions
- **TypeScript**: Full type safety

## ⚡ Quick Start

### 1. Clone & Install
```bash
git clone https://github.com/satsoft/bullmarketsupportband.git
cd bullmarketsupportband
npm install
```

### 2. Environment Setup
```bash
cp .env.example .env.local
# Edit .env.local with your API keys and database credentials
```

### 3. Database Setup
1. Create a [Supabase](https://supabase.com) project
2. Run the SQL schema from `lib/database-schema.sql`
3. Configure Row Level Security policies (see `DATABASE_SECURITY.md`)

### 4. API Keys
- **CoinGecko API**: Get a free key from [CoinGecko](https://www.coingecko.com/en/api)
- **Supabase**: Get URL and keys from your project settings

### 5. Run Development
```bash
npm run dev
# Open http://localhost:3000
```

## 🚀 Deployment

### Quick Deploy to Vercel
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fsatsoft%2Fbullmarketsupportband)

### Manual Deployment
See comprehensive [Deployment Guide](./DEPLOYMENT_GUIDE.md) for step-by-step instructions.

### Key Requirements
- Vercel account (or alternative hosting)
- Supabase database
- CoinGecko API key
- GitHub repository (for automation)

## 🤖 Automation

The project includes GitHub Actions for:
- **Price Updates**: Every 10 minutes
- **BMSB Calculations**: Every hour  
- **Token Discovery**: Daily at 1AM UTC
- **System Health**: Weekly validation

See [GitHub Automation Setup](./GITHUB_AUTOMATION_SETUP.md) for configuration details.

## 📊 API Endpoints

### Public APIs
- `GET /api/bmsb-data` - BMSB analysis for top cryptocurrencies
- `GET /api/summary` - Market overview and health statistics
- `GET /api/cryptocurrencies` - Cryptocurrency list with current prices

### Admin APIs (Require Authentication)
- `POST /api/admin/update-prices` - Manual price update
- `POST /api/admin/update-top-150` - Refresh top 150 cryptocurrencies
- `GET /api/admin/test-setup` - System health check

## 🔒 Security Features

- **API Authentication** - Admin endpoints protected with API keys
- **Rate Limiting** - Public APIs limited to 60 requests/minute
- **Database Security** - Row Level Security (RLS) policies
- **Input Validation** - Comprehensive request validation
- **CORS Configuration** - Proper cross-origin resource sharing
- **Security Headers** - XSS protection and content security

## 📚 Documentation

- [Deployment Guide](./DEPLOYMENT_GUIDE.md) - Complete deployment instructions
- [Database Security](./DATABASE_SECURITY.md) - Security configuration guide
- [GitHub Automation](./GITHUB_AUTOMATION_SETUP.md) - Automation setup
- [Production Checklist](./PRODUCTION_LAUNCH_CHECKLIST.md) - Launch checklist
- [Scripts Documentation](./scripts/README.md) - Available scripts

## 🏗️ Project Structure

```
bullmarketsupportband/
├── app/
│   ├── api/                    # API routes
│   ├── components/             # React components
│   ├── globals.css            # Global styles
│   ├── layout.tsx             # Root layout with SEO
│   └── page.tsx               # Homepage
├── lib/
│   ├── coingecko.ts           # CoinGecko API client
│   ├── database-bmsb-calculator.ts # BMSB calculation logic
│   ├── token-filters.ts       # Token filtering system
│   ├── auth.ts                # Authentication utilities
│   └── ...                    # Other utilities
├── scripts/
│   ├── calculate-database-bmsb.ts # BMSB calculation script
│   ├── update-current-prices.ts   # Price update script
│   └── ...                        # Other maintenance scripts
├── .github/workflows/         # GitHub Actions automation
└── public/                    # Static assets
```

## 🧮 BMSB Calculation Details

### Data Requirements
- **365 days** of historical price data for stable EMA calculations
- **Weekly closing prices** using Monday-Sunday cycles
- **CoinGecko integration** with proper data alignment

### Calculation Method
1. Fetch 365 days of daily prices from CoinGecko
2. Convert to weekly closing prices (Sunday close = Monday open)
3. Calculate 20-week SMA using simple average
4. Calculate 21-week EMA using exponential weighting (α = 2/22)
5. Determine support band boundaries and price position
6. Classify band health based on trend and position

### Health Classification
- **Healthy**: Price above both moving averages, upward trends
- **Mixed**: Price between moving averages or mixed trends  
- **Weak**: Price below both moving averages, downward trends
- **Stablecoin**: Excluded from BMSB analysis

## 🌟 Contributing

We welcome contributions! Here's how to get started:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests and linting
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Add proper error handling
- Include JSDoc comments for functions
- Test API endpoints thoroughly
- Update documentation for new features

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 👤 Author

**StableScarab**
- Twitter: [@StableScarab](https://x.com/StableScarab)
- GitHub: [@satsoft](https://github.com/satsoft)

## 🙏 Acknowledgments

- [CoinGecko](https://www.coingecko.com) for cryptocurrency data
- [TradingView](https://www.tradingview.com) for charting library
- [Supabase](https://supabase.com) for database infrastructure
- [Vercel](https://vercel.com) for hosting and deployment
- Bull Market Support Band concept by [Benjamin Cowen](https://www.youtube.com/c/BenjaminCowen)

## 📊 Live Demo

Visit the live dashboard: [bullmarketsupportband.com](https://bullmarketsupportband.com)

---

**Built with ❤️ for the crypto community**

*Track the BMSB, stay in the band! 📈*