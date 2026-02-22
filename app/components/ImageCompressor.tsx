'use client';

import { useState, useRef, useCallback, ChangeEvent } from 'react';
import { Button, Card, Slider, Chip, Link } from '@heroui/react';
import { ReactCompareSlider } from 'react-compare-slider';
import NextLink from "next/link";
import JSZip from 'jszip';
import ThemeSwitcher from './ThemeSwitcher';
import LanguageSwitcher from './LanguageSwitcher';
import { useTranslation } from '../i18n/LanguageContext';

export default function ImageCompressor() {
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [compression, setCompression] = useState(20);
  const [currentImage, setCurrentImage] = useState<HTMLImageElement | null>(null);
  const [currentImageName, setCurrentImageName] = useState('');
  const [originalSize, setOriginalSize] = useState('0 KB');
  const [compressedSize, setCompressedSize] = useState('0 KB');
  const [savings, setSavings] = useState('0');
  const [compressedBlob, setCompressedBlob] = useState<Blob | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string>('');
  const [compressedImageUrl, setCompressedImageUrl] = useState<string>('');
  const [bulkImages, setBulkImages] = useState<File[]>([]);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [bulkStats, setBulkStats] = useState({ original: 0, compressed: 0, saved: 0 });
  const [showControls, setShowControls] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showBulkControls, setShowBulkControls] = useState(false);
  const [showBulkResults, setShowBulkResults] = useState(false);

  const [justDropped, setJustDropped] = useState(false);
  const [bulkJustDropped, setBulkJustDropped] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bulkFileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const bulkDropZoneRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { t } = useTranslation();

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 KB';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Show error notification
  const showError = (message: string) => {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'fixed top-4 right-4 bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-4 rounded-lg shadow-lg z-50 max-w-md transform transition-all duration-300 translate-x-full';
    errorDiv.innerHTML = `
      <div class="flex items-start gap-3">
        <svg class="w-6 h-6 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <div class="flex-1">
          <p class="font-semibold">${t.error}</p>
          <p class="text-sm mt-1 whitespace-pre-line">${message}</p>
        </div>
      </div>
    `;
    document.body.appendChild(errorDiv);
    setTimeout(() => errorDiv.classList.remove('translate-x-full'), 10);
    setTimeout(() => {
      errorDiv.classList.add('translate-x-full');
      setTimeout(() => document.body.removeChild(errorDiv), 300);
    }, 5000);
  };

  // Compress image function
  const compressImage = async (file: File, img: HTMLImageElement) => {
    const compressionPercent = compression;
    const quality = (100 - compressionPercent) / 100;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    return new Promise<Blob>((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
        },
        'image/jpeg',
        quality
      );
    });
  };

  // Handle single file upload
  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      const extension = file.name.substring(file.name.lastIndexOf('.')) || 'unknown';
      showError(`${t.fileNotAllowed}\n"${file.name}"\n\n${t.fileNotAllowedHint}`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setCurrentImageName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        setCurrentImage(img);
        setOriginalSize(formatFileSize(file.size));
        setShowControls(true);
        setShowPreview(true);

        const originalUrl = event.target?.result as string;
        setOriginalImageUrl(originalUrl);

        // Initial compression
        const blob = await compressImage(file, img);
        const compressedUrl = URL.createObjectURL(blob);
        setCompressedImageUrl(compressedUrl);
        setCompressedBlob(blob);
        setCompressedSize(formatFileSize(blob.size));
        const savingsPercent = ((file.size - blob.size) / file.size * 100).toFixed(1);
        setSavings(savingsPercent);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Compress image (actual compression logic)
  const performCompression = useCallback(async (compressionValue?: number) => {
    if (!currentImage || !fileInputRef.current?.files?.[0]) return;

    const file = fileInputRef.current.files[0];
    const compressionToUse = compressionValue ?? compression;
    const quality = (100 - compressionToUse) / 100;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    canvas.width = currentImage.width;
    canvas.height = currentImage.height;

    ctx.drawImage(currentImage, 0, 0);

    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob(
        (b) => resolve(b!),
        'image/jpeg',
        quality
      );
    });

    setCompressedImageUrl(URL.createObjectURL(blob));
    setCompressedBlob(blob);
    setCompressedSize(formatFileSize(blob.size));
    const savingsPercent = ((file.size - blob.size) / file.size * 100).toFixed(1);
    setSavings(savingsPercent);
  }, [currentImage, compression]);

  // Handle compression change (updates slider value immediately, compresses after delay)
  const handleCompressionChange = useCallback((value: number, immediate = false) => {
    setCompression(value);

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // If immediate is true (e.g., preset button click), compress right away
    if (immediate) {
      performCompression(value);
    } else {
      // Set new timer - compress after 1000ms of no changes
      debounceTimerRef.current = setTimeout(() => {
        performCompression(value);
      }, 1000);
    }
  }, [performCompression]);

  // Reset bulk mode to initial state
  const resetBulk = () => {
    setBulkImages([]);
    setShowBulkControls(false);
    setShowBulkResults(false);
    setBulkProcessing(false);
    setBulkProgress(0);
    setBulkStats({ original: 0, compressed: 0, saved: 0 });
    if (bulkFileInputRef.current) bulkFileInputRef.current.value = '';
  };

  // Reset single mode to initial state
  const resetSingle = () => {
    setCurrentImage(null);
    setCurrentImageName('');
    setOriginalSize('0 KB');
    setCompressedSize('0 KB');
    setSavings('0');
    setCompressedBlob(null);
    setOriginalImageUrl('');
    setCompressedImageUrl('');
    setShowControls(false);
    setShowPreview(false);
    setCompression(20);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Download compressed image
  const downloadCompressed = () => {
    if (!compressedBlob) return;

    const url = URL.createObjectURL(compressedBlob);
    const a = document.createElement('a');
    a.href = url;
    const nameWithoutExt = currentImageName.substring(0, currentImageName.lastIndexOf('.')) || currentImageName;
    a.download = `${nameWithoutExt}_compressed.jpg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Bulk file handling
  const handleBulkFileSelect = () => {
    const allFiles = Array.from(bulkFileInputRef.current?.files || []);
    const imageFiles = allFiles.filter(f => f.type.startsWith('image/'));
    const rejectedFiles = allFiles.filter(f => !f.type.startsWith('image/'));

    if (rejectedFiles.length > 0) {
      const rejectedList = rejectedFiles.map(f => `• ${f.name}`).join('\n');
      showError(`${t.filesNotAllowed(rejectedFiles.length)}\n\n${rejectedList}\n\n${t.onlyImagesSupported}`);
    }

    if (imageFiles.length > 0) {
      setBulkImages(prev => [...prev, ...imageFiles]);
      setShowBulkControls(true);
      setShowBulkResults(false);
    } else if (rejectedFiles.length > 0) {
      if (bulkFileInputRef.current) bulkFileInputRef.current.value = '';
    }
  };

  // Process bulk images
  const processBulkImages = async () => {
    setBulkProcessing(true);
    setBulkProgress(0);

    let totalOriginal = 0;
    let totalCompressed = 0;
    const compressedFiles: { name: string; blob: Blob }[] = [];

    for (let i = 0; i < bulkImages.length; i++) {
      const file = bulkImages[i];
      totalOriginal += file.size;

      const img = await new Promise<HTMLImageElement>((resolve) => {
        const image = new Image();
        const reader = new FileReader();
        reader.onload = (e) => {
          image.onload = () => resolve(image);
          image.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
      });

      const blob = await compressImage(file, img);
      totalCompressed += blob.size;

      const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      compressedFiles.push({ name: `${nameWithoutExt}_compressed.jpg`, blob });

      setBulkProgress(Math.round(((i + 1) / bulkImages.length) * 100));
    }

    const zip = new JSZip();
    compressedFiles.forEach(({ name, blob }) => {
      zip.file(name, blob);
    });

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'compressed_images.zip';
    a.click();
    URL.revokeObjectURL(url);

    const savedBytes = totalOriginal - totalCompressed;
    setBulkStats({ original: totalOriginal, compressed: totalCompressed, saved: savedBytes });
    setShowBulkResults(true);
    setBulkProcessing(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary-100 to-secondary-100 dark:from-primary-900 dark:to-secondary-900">
      <div className="flex-1 flex flex-col p-4 sm:p-6">
        <div className="max-w-6xl w-full mx-auto flex-1 flex flex-col">
        <Card className="flex-1 flex flex-col p-6 sm:p-8">
          {/* Toolbar row */}
          <div className="flex items-center justify-end gap-2 mb-4">
            <LanguageSwitcher />
            <ThemeSwitcher />
          </div>

          {/* Shared header – always shown for both modes */}
          {(mode === 'single' || mode === 'bulk') && (
            <div className="text-center mb-6">
              <h1 className="text-3xl sm:text-4xl font-bold mb-2 text-foreground">{t.appTitle}</h1>
              <p className="text-foreground-500 mb-5">{t.appSubtitle}</p>
              <div className="flex gap-3 justify-center">
                <Button onClick={() => setMode('single')} variant={mode === 'single' ? 'primary' : 'outline'}>{t.singleImage}</Button>
                <Button onClick={() => setMode('bulk')} variant={mode === 'bulk' ? 'primary' : 'outline'}>{t.bulkProcess}</Button>
              </div>
            </div>
          )}

          {/* Single Mode */}
          {mode === 'single' && (
            <>
              {/* Hidden file input */}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />

              {/* ── Initial drop zone (all screen sizes) ── */}
              {!showPreview && (
                <Card
                  ref={dropZoneRef}
                  variant="secondary"
                  className={`drop-zone border-2 border-dashed transition-all cursor-pointer flex-1 flex flex-col justify-center ${justDropped ? 'drop-success border-success bg-success-50 dark:bg-success-100/10' : 'border-default-300 hover:border-primary hover:bg-default-100'}`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); dropZoneRef.current?.classList.add('drag-over'); }}
                  onDragLeave={() => dropZoneRef.current?.classList.remove('drag-over')}
                  onDrop={(e) => { e.preventDefault(); dropZoneRef.current?.classList.remove('drag-over'); if (e.dataTransfer.files.length > 0 && fileInputRef.current) { setJustDropped(true); setTimeout(() => setJustDropped(false), 1000); fileInputRef.current.files = e.dataTransfer.files; handleFileSelect({ target: fileInputRef.current } as any); } }}
                >
                  <Card.Content className="text-center py-16 sm:py-24 px-8">
                    <svg className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                    </svg>
                    <p className="text-xl font-semibold text-foreground mb-2">{t.dropTitle}</p>
                    <p className="text-sm text-foreground-500">{t.dropSubtitle}</p>
                  </Card.Content>
                </Card>
              )}

              {/* ── Post-upload: mobile stacked ── */}
              {showPreview && (
                <div className="lg:hidden">
                  <div className="flex justify-center mb-6">
                    <Button variant="outline" onClick={resetSingle} className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path>
                      </svg>
                      {t.tryAnotherImage}
                    </Button>
                  </div>
                  {showControls && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold mb-4 text-foreground">{t.compressionSettings}</h3>
                      <div className="flex flex-wrap gap-3 mb-4">
                        <Button onClick={() => handleCompressionChange(10, true)} variant="primary" className="bg-warning">{t.low}</Button>
                        <Button onClick={() => handleCompressionChange(30, true)} variant="primary" className="bg-primary">{t.medium}</Button>
                        <Button onClick={() => handleCompressionChange(50, true)} variant="primary" className="bg-success">{t.high}</Button>
                      </div>
                      <div className="flex items-center gap-4">
                        <label className="text-foreground font-medium min-w-fit">{t.compression}</label>
                        <Slider minValue={0} maxValue={100} value={compression} onChange={(value) => handleCompressionChange(typeof value === 'number' ? value : value[0])} className="flex-1">
                          <Slider.Track><Slider.Fill /><Slider.Thumb /></Slider.Track>
                        </Slider>
                        <input type="number" min={0} max={100} value={compression}
                          onChange={(e) => { const val = e.target.value === '' ? 0 : parseInt(e.target.value); if (!isNaN(val) && val >= 0 && val <= 100) handleCompressionChange(val); }}
                          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                          className="w-20 px-3 py-2 text-center font-semibold rounded-lg border-2 border-default-200 bg-default-100 text-foreground focus:border-primary focus:outline-none"
                        />
                        <span className="text-foreground-600 font-medium">%</span>
                      </div>
                    </div>
                  )}
                  {originalImageUrl && compressedImageUrl && (
                    <>
                      <h3 className="text-lg font-semibold mb-4 text-foreground">{t.preview}</h3>
                      <div className="mb-4 rounded-xl overflow-hidden shadow-lg">
                        <ReactCompareSlider
                          itemOne={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', overflow: 'hidden' }}><img src={originalImageUrl} alt="Original" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} /></div>}
                          itemTwo={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', overflow: 'hidden' }}><img src={compressedImageUrl} alt="Compressed" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} /></div>}
                          position={50} style={{ display: 'flex', width: '100%', height: 'auto', aspectRatio: 'auto' }}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <Card variant="secondary" className="bg-default-100"><Card.Content className="text-center p-4"><p className="text-sm text-foreground-600 mb-1">{t.originalSize}</p><p className="text-xl font-bold text-foreground">{originalSize}</p></Card.Content></Card>
                        <Card variant="secondary" className="bg-default-100"><Card.Content className="text-center p-4"><p className="text-sm text-foreground-600 mb-1">{t.compressedSize}</p><p className="text-xl font-bold text-foreground">{compressedSize}</p></Card.Content></Card>
                      </div>
                      <Card variant="secondary" className="bg-success-50 dark:bg-success-100/10 border-2 border-success mb-6"><Card.Content className="text-center p-4"><p className="text-sm text-foreground-600 mb-1">{t.spaceSaved}</p><p className="text-3xl font-bold text-success">{savings}%</p></Card.Content></Card>
                      <Button onClick={downloadCompressed} variant="primary" className="w-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                        {t.downloadCompressed}
                      </Button>
                    </>
                  )}
                </div>
              )}

              {/* ── DESKTOP 2-COL: after upload ── */}
              {showPreview && originalImageUrl && compressedImageUrl && (
                <div className="hidden lg:grid lg:grid-cols-[1fr_260px] lg:gap-6 lg:items-start">
                  {/* Left: preview slider */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-foreground">{t.preview}</h3>
                    <div className="rounded-xl overflow-hidden shadow-lg">
                      <ReactCompareSlider
                        itemOne={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', overflow: 'hidden' }}><img src={originalImageUrl} alt="Original" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} /></div>}
                        itemTwo={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', overflow: 'hidden' }}><img src={compressedImageUrl} alt="Compressed" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} /></div>}
                        position={50} style={{ display: 'flex', width: '100%', height: 'auto', aspectRatio: 'auto' }}
                      />
                    </div>
                  </div>
                  {/* Right: compression controls + stats + download */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-foreground">{t.compressionSettings}</h3>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <Button onClick={() => handleCompressionChange(10, true)} variant="primary" className="bg-warning">{t.low}</Button>
                      <Button onClick={() => handleCompressionChange(30, true)} variant="primary" className="bg-primary">{t.medium}</Button>
                      <Button onClick={() => handleCompressionChange(50, true)} variant="primary" className="bg-success">{t.high}</Button>
                    </div>
                    <div className="flex items-center gap-2 mb-5">
                      <Slider minValue={0} maxValue={100} value={compression} onChange={(value) => handleCompressionChange(typeof value === 'number' ? value : value[0])} className="flex-1">
                        <Slider.Track><Slider.Fill /><Slider.Thumb /></Slider.Track>
                      </Slider>
                      <input type="number" min={0} max={100} value={compression}
                        onChange={(e) => { const val = e.target.value === '' ? 0 : parseInt(e.target.value); if (!isNaN(val) && val >= 0 && val <= 100) handleCompressionChange(val); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                        className="w-16 px-2 py-1.5 text-center font-semibold rounded-lg border-2 border-default-200 bg-default-100 text-foreground focus:border-primary focus:outline-none text-sm"
                      />
                      <span className="text-foreground-600 font-medium text-sm">%</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <Card variant="secondary" className="bg-default-100"><Card.Content className="text-center p-3"><p className="text-xs text-foreground-600 mb-1">{t.originalSize}</p><p className="text-lg font-bold text-foreground">{originalSize}</p></Card.Content></Card>
                      <Card variant="secondary" className="bg-default-100"><Card.Content className="text-center p-3"><p className="text-xs text-foreground-600 mb-1">{t.compressedSize}</p><p className="text-lg font-bold text-foreground">{compressedSize}</p></Card.Content></Card>
                    </div>
                    <Card variant="secondary" className="bg-success-50 dark:bg-success-100/10 border-2 border-success mb-4"><Card.Content className="text-center p-3"><p className="text-xs text-foreground-600 mb-1">{t.spaceSaved}</p><p className="text-2xl font-bold text-success">{savings}%</p></Card.Content></Card>
                    <Button onClick={downloadCompressed} variant="primary" className="w-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                      {t.downloadCompressed}
                    </Button>
                    <Button variant="outline" onClick={resetSingle} className="flex items-center justify-center gap-2 w-full mt-3">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path>
                      </svg>
                      {t.tryAnotherImage}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Bulk Mode */}
          {mode === 'bulk' && (
            <>
              {/* Bulk Upload Area */}
              <Card
                ref={bulkDropZoneRef}
                variant="secondary"
                className={`drop-zone border-2 border-dashed transition-all cursor-pointer ${!showBulkControls ? 'flex-1 flex flex-col justify-center' : 'mb-6 lg:hidden'} ${bulkJustDropped
                    ? 'drop-success border-success bg-success-50 dark:bg-success-100/10'
                    : 'border-default-300 hover:border-primary hover:bg-default-100'
                  }`}
                onClick={() => bulkFileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  bulkDropZoneRef.current?.classList.add('drag-over');
                }}
                onDragLeave={() => bulkDropZoneRef.current?.classList.remove('drag-over')}
                onDrop={(e) => {
                  e.preventDefault();
                  bulkDropZoneRef.current?.classList.remove('drag-over');
                  if (e.dataTransfer.files.length > 0 && bulkFileInputRef.current) {
                    setBulkJustDropped(true);
                    setTimeout(() => setBulkJustDropped(false), 1000);
                    bulkFileInputRef.current.files = e.dataTransfer.files;
                    handleBulkFileSelect();
                  }
                }}
              >
                <Card.Content className={`text-center ${!showBulkControls ? 'py-16 sm:py-24 px-8' : 'p-6'}`}>
                  <input
                    ref={bulkFileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleBulkFileSelect}
                  />
                  <svg className={`mx-auto text-primary ${!showBulkControls ? 'w-20 h-20 sm:w-24 sm:h-24 mb-6' : 'w-10 h-10 mb-2'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                  </svg>
                  <p className={`font-semibold text-foreground mb-2 ${!showBulkControls ? 'text-xl' : 'text-sm'}`}>{t.bulkDropTitle}</p>
                  {!showBulkControls && <p className="text-sm text-foreground-500">{t.bulkDropSubtitle}</p>}
                </Card.Content>
              </Card>

              {/* ── Bulk post-upload: mobile stacked ── */}
              {showBulkControls && (
                <div className="lg:hidden mb-6">
                  <div className="flex gap-3 mb-5">
                    <Button variant="outline" onClick={resetBulk} className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                      </svg>
                      {t.startOver}
                    </Button>
                  </div>
                  <h3 className="text-lg font-semibold mb-4 text-foreground">{t.bulkCompressionSettings}</h3>
                  <div className="flex flex-wrap gap-3 mb-4">
                    <Button onClick={() => setCompression(10)} variant="primary" className="bg-warning">{t.low}</Button>
                    <Button onClick={() => setCompression(30)} variant="primary" className="bg-primary">{t.medium}</Button>
                    <Button onClick={() => setCompression(50)} variant="primary" className="bg-success">{t.high}</Button>
                  </div>
                  <div className="flex items-center gap-4 mb-4">
                    <label className="text-foreground font-medium min-w-fit">{t.compression}</label>
                    <Slider minValue={0} maxValue={100} value={compression} onChange={(value) => setCompression(typeof value === 'number' ? value : value[0])} className="flex-1">
                      <Slider.Track><Slider.Fill /><Slider.Thumb /></Slider.Track>
                    </Slider>
                    <input type="number" min={0} max={100} value={compression}
                      onChange={(e) => { const val = e.target.value === '' ? 0 : parseInt(e.target.value); if (!isNaN(val) && val >= 0 && val <= 100) setCompression(val); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                      className="w-20 px-3 py-2 text-center font-semibold rounded-lg border-2 border-default-200 bg-default-100 text-foreground focus:border-primary focus:outline-none"
                    />
                    <span className="text-foreground-600 font-medium">%</span>
                  </div>
                  <div className="mb-6">
                    <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                      {t.selectedFiles} <Chip variant="primary" className="bg-primary text-primary-foreground">{bulkImages.length}</Chip>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto">
                      {bulkImages.map((file, index) => (
                        <Card key={index} variant="secondary" className="bg-default-100 relative group">
                          <Card.Content className="p-3">
                            <div className="relative mb-2 aspect-square rounded-lg overflow-hidden bg-default-200">
                              <img src={URL.createObjectURL(file)} alt={file.name} className="w-full h-full object-cover" onLoad={(e) => URL.revokeObjectURL(e.currentTarget.src)} />
                              <button onClick={(e) => { e.stopPropagation(); const n = bulkImages.filter((_, i) => i !== index); setBulkImages(n); if (n.length === 0) { setShowBulkControls(false); setShowBulkResults(false); } }} className="absolute top-2 right-2 bg-danger text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-danger-600" title={t.removeImage}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                              </button>
                            </div>
                            <p className="text-xs text-foreground-600 truncate" title={file.name}>{file.name}</p>
                            <p className="text-xs text-foreground-400">{formatFileSize(file.size)}</p>
                          </Card.Content>
                        </Card>
                      ))}
                    </div>
                  </div>
                  <Button onClick={processBulkImages} isDisabled={bulkProcessing} variant="primary" className="w-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center gap-2">
                    {bulkProcessing ? (
                      <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                    )}
                    {bulkProcessing ? t.processing : t.compressDownloadZip}
                  </Button>
                  {bulkProcessing && (
                    <div className="mt-4"><div className="bg-default-200 rounded-full h-4 overflow-hidden"><div className="progress-bar bg-gradient-to-r from-primary to-secondary h-full flex items-center justify-center text-xs text-white font-semibold transition-all duration-300" style={{ width: `${bulkProgress}%` }}>{bulkProgress}%</div></div></div>
                  )}
                  {showBulkResults && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                      <Card variant="secondary" className="bg-primary-50 dark:bg-primary-100/10 border-2 border-primary"><Card.Content className="text-center p-4"><p className="text-sm text-foreground-600 mb-1">{t.totalOriginal}</p><p className="text-xl font-bold text-primary">{formatFileSize(bulkStats.original)}</p></Card.Content></Card>
                      <Card variant="secondary" className="bg-success-50 dark:bg-success-100/10 border-2 border-success"><Card.Content className="text-center p-4"><p className="text-sm text-foreground-600 mb-1">{t.totalCompressed}</p><p className="text-xl font-bold text-success">{formatFileSize(bulkStats.compressed)}</p></Card.Content></Card>
                      <Card variant="secondary" className="bg-secondary-50 dark:bg-secondary-100/10 border-2 border-secondary"><Card.Content className="text-center p-4"><p className="text-sm text-foreground-600 mb-1">{t.totalSaved}</p><p className="text-xl font-bold text-secondary">{formatFileSize(bulkStats.saved)}</p></Card.Content></Card>
                    </div>
                  )}
                </div>
              )}

              {/* ── Bulk DESKTOP 2-COL: after files selected ── */}
              {showBulkControls && (
                <div className="hidden lg:grid lg:grid-cols-[1fr_260px] lg:gap-6 lg:items-start">
                  {/* Left: file list + add more */}
                  <div>
                    <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                      {t.selectedFiles} <Chip variant="primary" className="bg-primary text-primary-foreground">{bulkImages.length}</Chip>
                    </h4>
                    <div className="grid grid-cols-2 gap-3 max-h-[420px] overflow-y-auto">
                      {/* Add more tile – pinned first */}
                      <button
                        onClick={() => bulkFileInputRef.current?.click()}
                        onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('drag-over'); }}
                        onDragLeave={(e) => { e.currentTarget.classList.remove('drag-over'); }}
                        onDrop={(e) => { e.preventDefault(); const el = e.currentTarget; el.classList.remove('drag-over'); if (e.dataTransfer.files.length > 0 && bulkFileInputRef.current) { setBulkJustDropped(true); setTimeout(() => setBulkJustDropped(false), 1000); el.classList.add('drop-success'); setTimeout(() => el.classList.remove('drop-success'), 700); bulkFileInputRef.current.files = e.dataTransfer.files; handleBulkFileSelect(); } }}
                        className="add-more-tile drop-zone relative border-2 border-dashed border-default-300 hover:border-primary hover:bg-default-100 rounded-xl transition-all flex flex-col items-center justify-center gap-1 aspect-square text-foreground-400 hover:text-primary px-3 text-center cursor-pointer"
                      >
                        <svg className="upload-icon w-8 h-8 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                        <span className="text-xs font-semibold leading-tight">{t.addMoreFiles}</span>
                        <span className="text-[10px] text-foreground-400 leading-tight">{t.dropSubtitle}</span>
                      </button>
                      {bulkImages.map((file, index) => (
                        <Card key={index} variant="secondary" className="bg-default-100 relative group">
                          <Card.Content className="p-3">
                            <div className="relative mb-2 aspect-square rounded-lg overflow-hidden bg-default-200">
                              <img src={URL.createObjectURL(file)} alt={file.name} className="w-full h-full object-cover" onLoad={(e) => URL.revokeObjectURL(e.currentTarget.src)} />
                              <button onClick={(e) => { e.stopPropagation(); const n = bulkImages.filter((_, i) => i !== index); setBulkImages(n); if (n.length === 0) { setShowBulkControls(false); setShowBulkResults(false); } }} className="absolute top-2 right-2 bg-danger text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-danger-600" title={t.removeImage}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                              </button>
                            </div>
                            <p className="text-xs text-foreground-600 truncate" title={file.name}>{file.name}</p>
                            <p className="text-xs text-foreground-400">{formatFileSize(file.size)}</p>
                          </Card.Content>
                        </Card>
                      ))}
                    </div>
                  </div>
                  {/* Right: compression + process + results */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-foreground">{t.bulkCompressionSettings}</h3>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <Button onClick={() => setCompression(10)} variant="primary" className="bg-warning">{t.low}</Button>
                      <Button onClick={() => setCompression(30)} variant="primary" className="bg-primary">{t.medium}</Button>
                      <Button onClick={() => setCompression(50)} variant="primary" className="bg-success">{t.high}</Button>
                    </div>
                    <div className="flex items-center gap-2 mb-5">
                      <Slider minValue={0} maxValue={100} value={compression} onChange={(value) => setCompression(typeof value === 'number' ? value : value[0])} className="flex-1">
                        <Slider.Track><Slider.Fill /><Slider.Thumb /></Slider.Track>
                      </Slider>
                      <input type="number" min={0} max={100} value={compression}
                        onChange={(e) => { const val = e.target.value === '' ? 0 : parseInt(e.target.value); if (!isNaN(val) && val >= 0 && val <= 100) setCompression(val); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                        className="w-16 px-2 py-1.5 text-center font-semibold rounded-lg border-2 border-default-200 bg-default-100 text-foreground focus:border-primary focus:outline-none text-sm"
                      />
                      <span className="text-foreground-600 font-medium text-sm">%</span>
                    </div>
                    <Button onClick={processBulkImages} isDisabled={bulkProcessing} variant="primary" className="w-full bg-gradient-to-r from-primary to-secondary mb-3 flex items-center justify-center gap-2">
                      {bulkProcessing ? (
                        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                      )}
                      {bulkProcessing ? t.processing : t.compressDownloadZip}
                    </Button>
                    {bulkProcessing && (
                      <div className="mb-4"><div className="bg-default-200 rounded-full h-4 overflow-hidden"><div className="progress-bar bg-gradient-to-r from-primary to-secondary h-full flex items-center justify-center text-xs text-white font-semibold transition-all duration-300" style={{ width: `${bulkProgress}%` }}>{bulkProgress}%</div></div></div>
                    )}
                    {showBulkResults && (
                      <div className="flex flex-col gap-3">
                        <Card variant="secondary" className="bg-primary-50 dark:bg-primary-100/10 border-2 border-primary"><Card.Content className="text-center p-3"><p className="text-xs text-foreground-600 mb-1">{t.totalOriginal}</p><p className="text-lg font-bold text-primary">{formatFileSize(bulkStats.original)}</p></Card.Content></Card>
                        <Card variant="secondary" className="bg-success-50 dark:bg-success-100/10 border-2 border-success"><Card.Content className="text-center p-3"><p className="text-xs text-foreground-600 mb-1">{t.totalCompressed}</p><p className="text-lg font-bold text-success">{formatFileSize(bulkStats.compressed)}</p></Card.Content></Card>
                        <Card variant="secondary" className="bg-secondary-50 dark:bg-secondary-100/10 border-2 border-secondary"><Card.Content className="text-center p-3"><p className="text-xs text-foreground-600 mb-1">{t.totalSaved}</p><p className="text-lg font-bold text-secondary">{formatFileSize(bulkStats.saved)}</p></Card.Content></Card>
                      </div>
                    )}
                    <Button variant="outline" onClick={resetBulk} className="flex items-center justify-center gap-2 w-full mt-3">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                      </svg>
                      {t.startOver}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center p-4 sm:p-6 space-y-3">
        <p className="text-foreground-500 dark:text-foreground-400 text-sm">
          {t.privacyNotice}
        </p>
        <Link
          href="https://github.com/juliancasaburi/image-compressor"
        >
          <Button
            variant="ghost"
            className="bg-default-100 dark:bg-default-50 text-foreground-600 hover:text-primary gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                clipRule="evenodd"
              />
            </svg>
            {t.viewSource}
          </Button>
        </Link>
      </div>
    </div>
  );
}
