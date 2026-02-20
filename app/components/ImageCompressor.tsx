'use client';

import { useState, useRef, useCallback, ChangeEvent, DragEvent, MouseEvent, TouchEvent } from 'react';
import { Button, Card, Slider, NumberField, Chip, Separator, Spinner } from '@heroui/react';
import { ReactCompareSlider, ReactCompareSliderImage } from 'react-compare-slider';
import JSZip from 'jszip';
import ThemeSwitcher from './ThemeSwitcher';

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
  const [isDragging, setIsDragging] = useState(false);

  const [justDropped, setJustDropped] = useState(false);
  const [bulkJustDropped, setBulkJustDropped] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bulkFileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const bulkDropZoneRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debounce function
  const debounce = <T extends (...args: any[]) => void>(func: T, delay: number) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  };

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
          <p class="font-semibold">Error</p>
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
      showError(`This file extension is not allowed:\n"${file.name}"\n\nPlease upload an image file (JPG, PNG, WebP)`);
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
      const plural = rejectedFiles.length === 1 ? 'file extension is' : 'file extensions are';
      showError(`${rejectedFiles.length} ${plural} not allowed:\n\n${rejectedList}\n\nOnly image files (JPG, PNG, WebP) are supported.`);
    }

    if (imageFiles.length > 0) {
      setBulkImages(imageFiles);
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
    <div className="min-h-screen bg-gradient-to-br from-primary-100 to-secondary-100 dark:from-primary-900 dark:to-secondary-900 p-4 sm:p-8">
      <ThemeSwitcher />
      <div className="max-w-4xl mx-auto">
        <Card className="p-6 sm:p-8 mb-6">
          <h1 className="text-3xl sm:text-4xl font-bold text-center mb-2 text-foreground">
            Image Compressor
          </h1>
          <p className="text-center text-foreground-500 mb-6">Reduce image size while maintaining quality</p>

          {/* Mode Toggle */}
          <div className="flex gap-3 mb-6 justify-center">
            <Button
              onClick={() => setMode('single')}
              variant={mode === 'single' ? 'primary' : 'outline'}
            >
              Single Image
            </Button>
            <Button
              onClick={() => setMode('bulk')}
              variant={mode === 'bulk' ? 'primary' : 'outline'}
            >
              Bulk Process
            </Button>
          </div>

          {/* Single Mode */}
          {mode === 'single' && (
            <div>
              {/* Upload Area */}
              <Card
                ref={dropZoneRef}
                variant="secondary"
                className={`drop-zone border-2 border-dashed transition-all cursor-pointer mb-6 ${
                  justDropped 
                    ? 'drop-success border-success bg-success-50 dark:bg-success-100/10' 
                    : 'border-default-300 hover:border-primary hover:bg-default-100'
                }`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  dropZoneRef.current?.classList.add('drag-over');
                }}
                onDragLeave={() => dropZoneRef.current?.classList.remove('drag-over')}
                onDrop={(e) => {
                  e.preventDefault();
                  dropZoneRef.current?.classList.remove('drag-over');
                  if (e.dataTransfer.files.length > 0 && fileInputRef.current) {
                    setJustDropped(true);
                    setTimeout(() => setJustDropped(false), 1000);
                    fileInputRef.current.files = e.dataTransfer.files;
                    handleFileSelect({ target: fileInputRef.current } as any);
                  }
                }}
              >
                <Card.Content className="text-center p-8">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  <svg className="w-16 h-16 mx-auto mb-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                  </svg>
                  <p className="text-lg font-semibold text-foreground mb-2">Drop image here or click to upload</p>
                  <p className="text-sm text-foreground-500">Supports: JPG, PNG, WebP (converts to JPG)</p>
                </Card.Content>
              </Card>

              {/* Quality Controls */}
              {showControls && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-4 text-foreground">Compression Settings</h3>

                  {/* Presets */}
                  <div className="flex flex-wrap gap-3 mb-4">
                    <Button 
                      onClick={() => handleCompressionChange(10, true)} 
                      variant="primary"
                      className="bg-warning"
                    >
                      Low (10%)
                    </Button>
                    <Button 
                      onClick={() => handleCompressionChange(30, true)} 
                      variant="primary"
                      className="bg-primary"
                    >
                      Medium (30%)
                    </Button>
                    <Button 
                      onClick={() => handleCompressionChange(50, true)} 
                      variant="primary"
                      className="bg-success"
                    >
                      High (50%)
                    </Button>
                  </div>

                  {/* Slider */}
                  <div className="flex items-center gap-4">
                    <label className="text-foreground font-medium min-w-fit">Compression:</label>
                    <Slider
                      minValue={0}
                      maxValue={100}
                      value={compression}
                      onChange={(value) => handleCompressionChange(typeof value === 'number' ? value : value[0])}
                      className="flex-1"
                    >
                      <Slider.Track>
                        <Slider.Fill />
                        <Slider.Thumb />
                      </Slider.Track>
                    </Slider>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={compression}
                      onChange={(e) => {
                        const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                        if (!isNaN(val) && val >= 0 && val <= 100) {
                          handleCompressionChange(val);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.currentTarget.blur();
                        }
                      }}
                      className="w-20 px-3 py-2 text-center font-semibold rounded-lg border-2 border-default-200 bg-default-100 text-foreground focus:border-primary focus:outline-none"
                    />
                    <span className="text-foreground-600 font-medium">%</span>
                  </div>
                </div>
              )}

              {/* Preview Section */}
              {showPreview && originalImageUrl && compressedImageUrl && (
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-foreground">Preview</h3>

                  {/* Image Comparison Slider */}
                  <div className="mb-4 max-w-[800px] mx-auto rounded-xl overflow-hidden shadow-lg">
                    <ReactCompareSlider
                      itemOne={
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          width: '100%',
                          height: '100%',
                          overflow: 'hidden'
                        }}>
                          <img 
                            src={originalImageUrl} 
                            alt="Original"
                            style={{ 
                              width: '100%',
                              height: '100%',
                              objectFit: 'contain',
                              display: 'block'
                            }}
                          />
                        </div>
                      }
                      itemTwo={
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          width: '100%',
                          height: '100%',
                          overflow: 'hidden'
                        }}>
                          <img 
                            src={compressedImageUrl} 
                            alt="Compressed"
                            style={{ 
                              width: '100%',
                              height: '100%',
                              objectFit: 'contain',
                              display: 'block'
                            }}
                          />
                        </div>
                      }
                      position={50}
                      style={{ 
                        display: 'flex',
                        width: '100%',
                        height: 'auto',
                        aspectRatio: 'auto'
                      }}
                    />
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <Card variant="secondary" className="bg-default-100">
                      <Card.Content className="text-center p-4">
                        <p className="text-sm text-foreground-600 mb-1">Original Size</p>
                        <p className="text-xl font-bold text-foreground">{originalSize}</p>
                      </Card.Content>
                    </Card>
                    <Card variant="secondary" className="bg-default-100">
                      <Card.Content className="text-center p-4">
                        <p className="text-sm text-foreground-600 mb-1">Compressed Size</p>
                        <p className="text-xl font-bold text-foreground">{compressedSize}</p>
                      </Card.Content>
                    </Card>
                  </div>

                  {/* Savings */}
                  <Card variant="secondary" className="bg-success-50 dark:bg-success-100/10 border-2 border-success mb-6">
                    <Card.Content className="text-center p-4">
                      <p className="text-sm text-foreground-600 mb-1">Space Saved</p>
                      <p className="text-3xl font-bold text-success">{savings}%</p>
                    </Card.Content>
                  </Card>

                  {/* Download */}
                  <Button
                    onClick={downloadCompressed}
                    variant="primary"
                    className="w-full bg-gradient-to-r from-primary to-secondary"
                  >
                    Download Compressed Image
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Bulk Mode */}
          {mode === 'bulk' && (
            <div>
              {/* Bulk Upload Area */}
              <Card
                ref={bulkDropZoneRef}
                variant="secondary"
                className={`drop-zone border-2 border-dashed transition-all cursor-pointer mb-6 ${
                  bulkJustDropped 
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
                <Card.Content className="text-center p-8">
                  <input
                    ref={bulkFileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleBulkFileSelect}
                  />
                  <svg className="w-16 h-16 mx-auto mb-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                  </svg>
                  <p className="text-lg font-semibold text-foreground mb-2">Drop multiple images here or click to upload</p>
                  <p className="text-sm text-foreground-500">Supports: JPG, PNG, WebP (converts to JPG)</p>
                </Card.Content>
              </Card>

              {/* Bulk Controls */}
              {showBulkControls && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-4 text-foreground">Compression Settings (Applied to All)</h3>

                  {/* Presets */}
                  <div className="flex flex-wrap gap-3 mb-4">
                    <Button 
                      onClick={() => setCompression(10)} 
                      variant="primary"
                      className="bg-warning"
                    >
                      Low (10%)
                    </Button>
                    <Button 
                      onClick={() => setCompression(30)} 
                      variant="primary"
                      className="bg-primary"
                    >
                      Medium (30%)
                    </Button>
                    <Button 
                      onClick={() => setCompression(50)} 
                      variant="primary"
                      className="bg-success"
                    >
                      High (50%)
                    </Button>
                  </div>

                  {/* Slider */}
                  <div className="flex items-center gap-4 mb-4">
                    <label className="text-foreground font-medium min-w-fit">Compression:</label>
                    <Slider
                      minValue={0}
                      maxValue={100}
                      value={compression}
                      onChange={(value) => setCompression(typeof value === 'number' ? value : value[0])}
                      className="flex-1"
                    >
                      <Slider.Track>
                        <Slider.Fill />
                        <Slider.Thumb />
                      </Slider.Track>
                    </Slider>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={compression}
                      onChange={(e) => {
                        const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                        if (!isNaN(val) && val >= 0 && val <= 100) {
                          setCompression(val);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.currentTarget.blur();
                        }
                      }}
                      className="w-20 px-3 py-2 text-center font-semibold rounded-lg border-2 border-default-200 bg-default-100 text-foreground focus:border-primary focus:outline-none"
                    />
                    <span className="text-foreground-600 font-medium">%</span>
                  </div>

                  {/* Files List with Previews */}
                  <div className="mb-6">
                    <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                      Selected Files: <Chip variant="primary" className="bg-primary text-primary-foreground">{bulkImages.length}</Chip>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                      {bulkImages.map((file, index) => (
                        <Card key={index} variant="secondary" className="bg-default-100 relative group">
                          <Card.Content className="p-3">
                            {/* Image Preview */}
                            <div className="relative mb-2 aspect-square rounded-lg overflow-hidden bg-default-200">
                              <img
                                src={URL.createObjectURL(file)}
                                alt={file.name}
                                className="w-full h-full object-cover"
                                onLoad={(e) => URL.revokeObjectURL(e.currentTarget.src)}
                              />
                              {/* Remove Button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const newImages = bulkImages.filter((_, i) => i !== index);
                                  setBulkImages(newImages);
                                  if (newImages.length === 0) {
                                    setShowBulkControls(false);
                                    setShowBulkResults(false);
                                  }
                                }}
                                className="absolute top-2 right-2 bg-danger text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-danger-600"
                                title="Remove image"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                              </button>
                            </div>
                            {/* File Name */}
                            <p className="text-xs text-foreground-600 truncate" title={file.name}>
                              {file.name}
                            </p>
                            {/* File Size */}
                            <p className="text-xs text-foreground-400">
                              {formatFileSize(file.size)}
                            </p>
                          </Card.Content>
                        </Card>
                      ))}
                    </div>
                  </div>

                  {/* Process Button */}
                  <Button
                    onClick={processBulkImages}
                    isDisabled={bulkProcessing}
                    variant="primary"
                    className="w-full bg-gradient-to-r from-primary to-secondary"
                  >
                    {bulkProcessing ? 'Processing...' : 'Compress & Download ZIP'}
                  </Button>

                  {/* Progress Bar */}
                  {bulkProcessing && (
                    <div className="mt-4">
                      <div className="bg-default-200 rounded-full h-4 overflow-hidden">
                        <div
                          className="progress-bar bg-gradient-to-r from-primary to-secondary h-full flex items-center justify-center text-xs text-white font-semibold transition-all duration-300"
                          style={{ width: `${bulkProgress}%` }}
                        >
                          {bulkProgress}%
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Bulk Results */}
              {showBulkResults && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  <Card variant="secondary" className="bg-primary-50 dark:bg-primary-100/10 border-2 border-primary">
                    <Card.Content className="text-center p-4">
                      <p className="text-sm text-foreground-600 mb-1">Total Original</p>
                      <p className="text-xl font-bold text-primary">{formatFileSize(bulkStats.original)}</p>
                    </Card.Content>
                  </Card>
                  <Card variant="secondary" className="bg-success-50 dark:bg-success-100/10 border-2 border-success">
                    <Card.Content className="text-center p-4">
                      <p className="text-sm text-foreground-600 mb-1">Total Compressed</p>
                      <p className="text-xl font-bold text-success">{formatFileSize(bulkStats.compressed)}</p>
                    </Card.Content>
                  </Card>
                  <Card variant="secondary" className="bg-secondary-50 dark:bg-secondary-100/10 border-2 border-secondary">
                    <Card.Content className="text-center p-4">
                      <p className="text-sm text-foreground-600 mb-1">Total Saved</p>
                      <p className="text-xl font-bold text-secondary">{formatFileSize(bulkStats.saved)}</p>
                    </Card.Content>
                  </Card>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-foreground-500 dark:text-foreground-400 text-sm">
          <p>All processing happens in your browser. No files are uploaded to any server.</p>
        </div>
      </div>
    </div>
  );
}
