# Image Compressor

A modern, client-side image compression web application with real-time preview and batch processing capabilities.

## Features

- **Single Image Mode**: Upload, compress, and compare images side-by-side with an interactive slider
- **Bulk Processing**: Compress multiple images at once with individual preview and removal
- **Real-time Compression**: Adjustable quality slider (0-100%) with live preview
- **Preset Options**: Quick compression presets (Low/Medium/High)
- **Dark Mode**: Automatic theme detection with manual toggle
- **Privacy-First**: All processing happens client-side - no server uploads
- **Download Options**: Single JPG download or bulk ZIP export

## Tech Stack

- **Framework**: Next.js 16.1.6 (App Router, Static Export)
- **UI Library**: HeroUI v3 (beta)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Image Comparison**: react-compare-slider
- **ZIP Generation**: JSZip

## Development

Install dependencies:
```bash
npm install
```

Run development server:
```bash
npm run dev
```

Open [http://localhost:3000/image-compressor](http://localhost:3000/image-compressor) in your browser.

## Build

Create production build:
```bash
npm run build
```

Static files will be generated in the `out/` directory, ready for deployment to any static hosting service (GitHub Pages, Vercel, Netlify, etc.).

## Deployment

The app is configured for static export and includes a GitHub Actions workflow for automatic deployment to GitHub Pages.

1. Push to GitHub repository
2. Enable GitHub Pages (Settings → Pages → Source: GitHub Actions)
3. Workflow will automatically build and deploy on push to main branch
