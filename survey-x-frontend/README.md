# Survey X - Blockchain-Powered Survey Platform

A modern survey platform built with Next.js, Solana blockchain integration, and real-time analytics.

## Features

✅ **Real-time Survey Management**
- Create, edit, and delete surveys
- Dynamic response counting
- Real survey statistics (no fake data)

✅ **Advanced Timing Controls**
- Set survey start and end dates
- Limit maximum responses
- Automatic survey availability management
- Real-time status indicators (Active, Scheduled, Ended, Full)

✅ **Solana Wallet Integration**
- Phantom wallet support
- Devnet configuration
- Ready for mainnet deployment

✅ **Modern UI/UX**
- Responsive design with Tailwind CSS
- Dark mode support
- Smooth animations
- Mobile-friendly interface

✅ **Data Persistence**
- Local storage for survey data
- Response tracking
- Survey analytics

## Quick Start

### Prerequisites
- Node.js 18+ installed
- Git

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd survey-x-frontend
```

2. **Install dependencies**
```bash
npm install
```

3. **Start development server**
```bash
npm run dev
```

4. **Open browser**
Visit `http://localhost:3000`

## Deployment on Vercel

### Option 1: Deploy from GitHub (Recommended)

1. **Push to GitHub**
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/survey-x.git
git push -u origin main
```

2. **Deploy on Vercel**
- Go to [vercel.com](https://vercel.com)
- Click "Import Project"
- Connect your GitHub repository
- Vercel will auto-detect Next.js and deploy

### Option 2: Direct Deploy

1. **Install Vercel CLI**
```bash
npm i -g vercel
```

2. **Deploy**
```bash
vercel --prod
```

## Environment Configuration

The app works out of the box with no environment variables needed for basic functionality.

For production, you may want to configure:

```bash
# .env.local
NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta  # or devnet
NEXT_PUBLIC_RPC_ENDPOINT=your-rpc-endpoint
```

## Project Structure

```
survey-x-frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout with wallet provider
│   │   ├── page.tsx           # Main dashboard page
│   │   └── globals.css        # Global styles
│   └── components/
│       ├── WalletProvider.tsx  # Solana wallet integration
│       ├── SurveyCreator.tsx  # Survey creation form
│       ├── SurveyList.tsx     # Survey display with timing
│       ├── SurveyResponse.tsx # Survey response form
│       └── SurveyStats.tsx    # Analytics dashboard
├── package.json
└── README.md
```

## How to Use

### Creating Surveys
1. Click "Create New Survey"
2. Fill in title and description
3. **Set timing options** (optional):
   - Start date/time
   - End date/time
   - Maximum responses
4. Add questions (text, multiple choice, or rating)
5. Save survey

### Managing Surveys
- **View responses**: Click "Take Survey" (only when available)
- **Check analytics**: Click "Stats" for detailed metrics
- **Delete surveys**: Click "Delete" to remove permanently

### Survey Availability
Surveys are automatically managed based on:
- **Scheduled**: Not yet started (shows start time)
- **Active**: Currently accepting responses
- **Ended**: Past end date
- **Full**: Reached maximum responses
- **Inactive**: Manually disabled

## Technical Details

- **Framework**: Next.js 15.5.2
- **Styling**: Tailwind CSS
- **Forms**: React Hook Form + Zod validation
- **Blockchain**: Solana Web3.js + Wallet Adapter
- **Storage**: localStorage (can be upgraded to database)
- **TypeScript**: Full type safety

## Troubleshooting

### Build Issues
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Remove turbopack if issues
npm run build
```

### Wallet Connection Issues
- Ensure Phantom wallet is installed
- Check network settings (devnet/mainnet)
- Refresh page if connection fails

### Deployment Issues
- Ensure all dependencies are in package.json
- Check build succeeds locally first
- Verify environment variables if using custom RPC

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License

MIT License - see LICENSE file for details.

---

**Live Demo**: Deploy to see it in action!
**Support**: Create an issue for bugs or feature requests.# Force Vercel rebuild - Fri Sep  5 04:50:58 WAT 2025
