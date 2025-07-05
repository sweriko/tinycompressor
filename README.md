# TinyCompressor

A minimalistic and fast image compression webapp using the TinyPNG API, built with Cloudflare Workers and vanilla JavaScript.

## Features

- 🚀 **Fast & Minimalistic**: Clean, modern UI with drag-and-drop functionality
- 📁 **Drag Anywhere**: Drop images anywhere on the page, not just in the designated area
- 🔄 **Parallel Processing**: Process multiple images simultaneously
- 📊 **Compression Stats**: Shows before/after file sizes and percentage savings
- 🔑 **Secure API Key Storage**: Store your TinyPNG API key locally in your browser
- 📱 **Responsive Design**: Works on desktop and mobile devices
- ⚡ **Cloudflare Workers**: Serverless backend for optimal performance

## Setup Instructions

### Prerequisites

- Node.js (v18 or higher)
- A TinyPNG API key (get one free at [tinypng.com](https://tinypng.com/developers))
- A Cloudflare account

### Local Development

1. **Clone and install dependencies**:
   ```bash
   npm install
   ```

2. **Login to Cloudflare**:
   ```bash
   npx wrangler login
   ```

3. **Start both development servers**:
   ```bash
   npm run start
   ```
   
   This will start:
   - Worker API at `http://127.0.0.1:8787`
   - Frontend at `http://localhost:3000`

4. **Test the application**:
   - Open your browser and go to `http://localhost:3000`
   - Enter your TinyPNG API key and save it
   - Try uploading some images!

### Production Deployment

#### Deploy the Worker

1. **Update wrangler.toml**:
   ```toml
   name = "your-app-name"
   main = "src/worker.ts"
   compatibility_date = "2023-11-21"
   
   [env.production]
   name = "your-app-name"
   ```

2. **Deploy to Cloudflare Workers**:
   ```bash
   npm run deploy
   ```

3. **Note the worker URL** that's shown after deployment (e.g., `https://your-app-name.your-subdomain.workers.dev`)

#### Deploy the Frontend

1. **Update the worker URL** in `public/script.js`:
   ```javascript
   // Replace with your deployed worker URL
   this.workerUrl = 'https://your-app-name.your-subdomain.workers.dev';
   ```

2. **Deploy to Cloudflare Pages**:
   - Go to your Cloudflare dashboard
   - Navigate to Pages
   - Connect your Git repository or upload the `public` folder
   - Set build settings:
     - Build command: (leave empty)
     - Build output directory: `public`

## Project Structure

```
tinycompressor/
├── public/                 # Frontend files
│   ├── index.html         # Main HTML file
│   ├── styles.css         # Styling
│   └── script.js          # Frontend JavaScript
├── src/                   # Backend files
│   └── worker.ts          # Cloudflare Worker
├── package.json           # Dependencies
├── tsconfig.json          # TypeScript config
├── wrangler.toml          # Cloudflare Worker config
└── README.md              # This file
```

## Usage

1. **Get a TinyPNG API Key**:
   - Go to [tinypng.com/developers](https://tinypng.com/developers)
   - Sign up for a free account
   - Copy your API key

2. **Set up the API Key**:
   - Open the webapp
   - Enter your API key in the input field
   - Click "Save" to store it locally

3. **Compress Images**:
   - Drag and drop images anywhere on the page
   - Or click the upload area to select files
   - Watch as images are processed in parallel
   - Download compressed images individually

## ⚡ Performance Notes

**Processing Times:**
- **Small images** (<1MB): ~10-20 seconds
- **Medium images** (1-5MB): ~30-60 seconds  
- **Large images** (5-10MB): ~1-2 minutes
- **Very large images** (10MB+): ~2-5 minutes

**Speed Factors:**
- **Local development** is slower than production (no edge caching)
- **Production deployment** is significantly faster due to Cloudflare's global network
- **TinyPNG API** processing time depends on file size and server load
- **Network speed** affects upload/download times

**Optimizations in this app:**
- Parallel processing of multiple images
- Optimized previews for large files (10MB+)
- 5-minute timeout protection
- Estimated processing time display

## API Limits

- **Free TinyPNG Account**: 500 compressions per month
- **Paid Plans**: Available for higher usage
- **TinyPNG API File Size Limit**: 500MB per image (!)
- **Cloudflare Workers Limit**: 100MB per image (practical limit)
- **Supported Formats**: PNG, JPEG, WebP, AVIF

## Development

### Local Testing
```bash
npm run start    # Start both worker and frontend
# OR run separately:
npm run dev      # Start worker only
npm run frontend # Start frontend only
```

### Building
```bash
npm run build
```

### Deployment
```bash
npm run deploy
```

## Troubleshooting

### Common Issues

1. **"Method Not Allowed" Error**:
   - This is normal! The worker URL (127.0.0.1:8787) is just the API
   - Use the frontend URL (localhost:3000) in your browser instead

2. **API Key Not Working**:
   - Ensure your TinyPNG API key is valid
   - Check if you've exceeded your monthly limit

3. **Worker Not Responding**:
   - Verify the worker URL is correct in `script.js`
   - Check Cloudflare Workers dashboard for errors

4. **CORS Issues**:
   - The worker includes CORS headers for browser compatibility
   - Ensure you're using the correct worker URL

5. **Large Files**:
   - TinyPNG API supports up to 500MB per image
   - Cloudflare Workers limit is 100MB per image
   - Consider resizing extremely large images before compression

## Security Notes

- API keys are stored locally in your browser's localStorage
- API keys are sent to the worker for TinyPNG API calls
- No data is permanently stored on the server
- All processing happens in Cloudflare's secure environment

## License

MIT License - feel free to use and modify as needed! 