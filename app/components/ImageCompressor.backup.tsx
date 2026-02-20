'use client';

import { useState, useRef, ChangeEvent, DragEvent, MouseEvent, TouchEvent } from 'react';
import JSZip from 'jszip';

export default function ImageCompressor() {
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [compression, setCompression] = useState(20);
  const [currentImage, setCurrentImage] = useState<HTMLImageElement | null>(null);
  const [currentImageName, setCurrentImageName] = useState('');
  const [originalSize, setOriginalSize] = useState('0 KB');
  const [compressedSize, setCompressedSize] = useState('0 KB');
  const [savings, setSavings] = useState('0');
  const [compressedBlob, setCompressedBlob] = useState<Blob | null>(null);
  const [bulkImages, setBulkImages] = useState<File[]>([]);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [bulkStats, setBulkStats] = useState({ original: 0, compressed: 0, saved: 0 });
  const [showControls, setShowControls] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showBulkControls, setShowBulkControls] = useState(false);
  const [showBulkResults, setShowBulkResults] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [sliderDragging, setSliderDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bulkFileInputRef = useRef<HTMLInputElement>(null);
  const originalPreviewRef = useRef<HTMLImageElement>(null);
  const compressedPreviewRef = useRef<HTMLImageElement>(null);
  const comparisonContainerRef = useRef<HTMLDivElement>(null);
  const comparisonBeforeRef = useRef<HTMLDivElement>(null);
  const comparisonHandleRef = useRef<HTMLDivElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const bulkDropZoneRef = useRef<HTMLDivElement>(null);

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

        if (originalPreviewRef.current) originalPreviewRef.current.src = event.target?.result as string;

        // Initial compression
        const blob = await compressImage(file, img);
        if (compressedPreviewRef.current) {
          compressedPreviewRef.current.src = URL.createObjectURL(blob);
        }
        setCompressedBlob(blob);
        setCompressedSize(formatFileSize(blob.size));
        const savingsPercent = ((file.size - blob.size) / file.size * 100).toFixed(1);
        setSavings(savingsPercent);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Debounced compress for slider
  const debouncedCompressImage = debounce(async () => {
    if (!currentImage || !fileInputRef.current?.files?.[0]) return;

    const file = fileInputRef.current.files[0];
    const blob = await compressImage(file, currentImage);

    if (compressedPreviewRef.current) {
      compressedPreviewRef.current.src = URL.createObjectURL(blob);
    }
    setCompressedBlob(blob);
    setCompressedSize(formatFileSize(blob.size));
    const savingsPercent = ((file.size - blob.size) / file.size * 100).toFixed(1);
    setSavings(savingsPercent);
  }, 300);

  // Handle compression change
  const handleCompressionChange = (value: number) => {
    setCompression(value);
    debouncedCompressImage();
  };

  // Slider position update
  const updateSliderPosition = (x: number) => {
    if (!comparisonContainerRef.current || !compressedPreviewRef.current) return;

    const containerRect = comparisonContainerRef.current.getBoundingClientRect();
    const img = compressedPreviewRef.current;

    if (!img.naturalWidth || !img.naturalHeight) return;

    const imgAspect = img.naturalWidth / img.naturalHeight;
    const containerAspect = containerRect.width / containerRect.height;

    let imgWidth: number, imgLeft: number;

    if (imgAspect > containerAspect) {
      imgWidth = containerRect.width;
      imgLeft = 0;
    } else {
      imgWidth = containerRect.height * imgAspect;
      imgLeft = (containerRect.width - imgWidth) / 2;
    }

    const mouseX = x - containerRect.left;
    const clampedX = Math.max(imgLeft, Math.min(mouseX, imgLeft + imgWidth));
    const handleLeft = (clampedX / containerRect.width) * 100;
    const clipRight = ((containerRect.width - clampedX) / containerRect.width) * 100;

    if (comparisonBeforeRef.current) {
      comparisonBeforeRef.current.style.clipPath = `inset(0 ${clipRight}% 0 0)`;
    }
    if (comparisonHandleRef.current) {
      comparisonHandleRef.current.style.left = `${handleLeft}%`;
    }
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
    <div className="min-h-screen gradient-bg p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="glass rounded-2xl shadow-2xl p-6 sm:p-8 mb-6">
          <h1 className="text-3xl sm:text-4xl font-bold text-center mb-2 bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            Image Compressor
          </h1>
          <p className="text-center text-gray-600 mb-6">Reduce image size while maintaining quality</p>

          {/* Mode Toggle */}
          <div className="flex gap-3 mb-6 justify-center">
            <button
              onClick={() => setMode('single')}
              className={`mode-btn px-6 py-2 rounded-lg font-medium transition-all ${
                mode === 'single' ? 'bg-purple-600 text-white shadow-lg' : 'bg-white text-gray-700'
              }`}
            >
              Single Image
            </button>
            <button
              onClick={() => setMode('bulk')}
              className={`mode-btn px-6 py-2 rounded-lg font-medium transition-all ${
                mode === 'bulk' ? 'bg-purple-600 text-white shadow-lg' : 'bg-white text-gray-700'
              }`}
            >
              Bulk Process
            </button>
          </div>

          {/* Single Mode */}
          {mode === 'single' && (
            <div>
              {/* Upload Area */}
              <div
                ref={dropZoneRef}
                className="drop-zone rounded-xl p-8 text-center mb-6 cursor-pointer hover:bg-purple-50"
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
                    fileInputRef.current.files = e.dataTransfer.files;
                    handleFileSelect({ target: fileInputRef.current } as any);
                  }
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <svg className="w-16 h-16 mx-auto mb-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                </svg>
                <p className="text-lg font-semibold text-gray-700 mb-2">Drop image here or click to upload</p>
                <p className="text-sm text-gray-500">Supports: JPG, PNG, WebP (converts to JPG)</p>
              </div>

              {/* Quality Controls */}
              {showControls && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800">Compression Settings</h3>

                  {/* Presets */}
                  <div className="flex flex-wrap gap-3 mb-4">
                    <button onClick={() => handleCompressionChange(10)} className="preset-btn px-4 py-2 rounded-lg font-medium transition-all hover:shadow-md bg-orange-500 text-white">
                      Low (10%)
                    </button>
                    <button onClick={() => handleCompressionChange(30)} className="preset-btn px-4 py-2 rounded-lg font-medium transition-all hover:shadow-md bg-blue-500 text-white">
                      Medium (30%)
                    </button>
                    <button onClick={() => handleCompressionChange(50)} className="preset-btn px-4 py-2 rounded-lg font-medium transition-all hover:shadow-md bg-green-500 text-white">
                      High (50%)
                    </button>
                  </div>

                  {/* Slider */}
                  <div className="flex items-center gap-4">
                    <label className="text-gray-700 font-medium min-w-fit">Compression:</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={compression}
                      onChange={(e) => handleCompressionChange(parseInt(e.target.value))}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                    />
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={compression}
                      onChange={(e) => {
                        const input = e.target.value;
                        if (input === '') {
                          setCompression(0);
                          return;
                        }
                        let value = parseInt(input);
                        if (isNaN(value)) return;
                        if (value > 100) value = 100;
                        if (value < 0) value = 0;
                        handleCompressionChange(value);
                      }}
                      className="w-20 px-3 py-2 border-2 border-gray-300 rounded-lg text-center font-semibold focus:border-purple-600 focus:outline-none"
                    />
                    <span className="text-gray-600 font-medium">%</span>
                  </div>
                </div>
              )}

              {/* Preview Section */}
              {showPreview && (
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-gray-800">Preview</h3>

                  {/* Image Comparison Slider */}
                  <div
                    ref={comparisonContainerRef}
                    className="image-comparison-container mb-4"
                    onMouseDown={(e: MouseEvent) => {
                      if (e.target === comparisonHandleRef.current || (e.target as Element).closest('.image-comparison-handle')) {
                        setSliderDragging(true);
                        if (comparisonContainerRef.current) {
                          comparisonContainerRef.current.style.cursor = 'grabbing';
                        }
                      }
                    }}
                    onMouseMove={(e: MouseEvent) => {
                      if (sliderDragging) {
                        updateSliderPosition(e.clientX);
                      }
                    }}
                    onMouseUp={() => {
                      if (sliderDragging) {
                        setSliderDragging(false);
                        if (comparisonContainerRef.current) {
                          comparisonContainerRef.current.style.cursor = 'ew-resize';
                        }
                      }
                    }}
                    onClick={(e: MouseEvent) => {
                      if (e.target === comparisonHandleRef.current || (e.target as Element).closest('.image-comparison-handle')) return;
                      updateSliderPosition(e.clientX);
                    }}
                  >
                    <img ref={compressedPreviewRef} alt="Compressed" />
                    <div ref={comparisonBeforeRef} className="image-comparison-before">
                      <img ref={originalPreviewRef} alt="Original" />
                    </div>
                    <div ref={comparisonHandleRef} className="image-comparison-handle"></div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <p className="text-sm text-gray-600 mb-1">Original Size</p>
                      <p className="text-xl font-bold text-gray-800">{originalSize}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <p className="text-sm text-gray-600 mb-1">Compressed Size</p>
                      <p className="text-xl font-bold text-gray-800">{compressedSize}</p>
                    </div>
                  </div>

                  {/* Savings */}
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg p-4 mb-6 text-center">
                    <p className="text-sm text-gray-600 mb-1">Space Saved</p>
                    <p className="text-3xl font-bold text-green-600">{savings}%</p>
                  </div>

                  {/* Download */}
                  <button
                    onClick={downloadCompressed}
                    className="w-full py-3 px-6 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                  >
                    Download Compressed Image
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Bulk Mode */}
          {mode === 'bulk' && (
            <div>
              {/* Bulk Upload Area */}
              <div
                ref={bulkDropZoneRef}
                className="drop-zone rounded-xl p-8 text-center mb-6 cursor-pointer hover:bg-purple-50"
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
                    bulkFileInputRef.current.files = e.dataTransfer.files;
                    handleBulkFileSelect();
                  }
                }}
              >
                <input
                  ref={bulkFileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleBulkFileSelect}
                />
                <svg className="w-16 h-16 mx-auto mb-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                </svg>
                <p className="text-lg font-semibold text-gray-700 mb-2">Drop multiple images here or click to upload</p>
                <p className="text-sm text-gray-500">Supports: JPG, PNG, WebP (converts to JPG)</p>
              </div>

              {/* Bulk Controls */}
              {showBulkControls && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800">Compression Settings (Applied to All)</h3>

                  {/* Presets */}
                  <div className="flex flex-wrap gap-3 mb-4">
                    <button onClick={() => setCompression(10)} className="preset-btn px-4 py-2 rounded-lg font-medium transition-all hover:shadow-md bg-orange-500 text-white">
                      Low (10%)
                    </button>
                    <button onClick={() => setCompression(30)} className="preset-btn px-4 py-2 rounded-lg font-medium transition-all hover:shadow-md bg-blue-500 text-white">
                      Medium (30%)
                    </button>
                    <button onClick={() => setCompression(50)} className="preset-btn px-4 py-2 rounded-lg font-medium transition-all hover:shadow-md bg-green-500 text-white">
                      High (50%)
                    </button>
                  </div>

                  {/* Slider */}
                  <div className="flex items-center gap-4 mb-4">
                    <label className="text-gray-700 font-medium min-w-fit">Compression:</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={compression}
                      onChange={(e) => setCompression(parseInt(e.target.value))}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                    />
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={compression}
                      onChange={(e) => {
                        const input = e.target.value;
                        if (input === '') {
                          setCompression(0);
                          return;
                        }
                        let value = parseInt(input);
                        if (isNaN(value)) return;
                        if (value > 100) value = 100;
                        if (value < 0) value = 0;
                        setCompression(value);
                      }}
                      className="w-20 px-3 py-2 border-2 border-gray-300 rounded-lg text-center font-semibold focus:border-purple-600 focus:outline-none"
                    />
                    <span className="text-gray-600 font-medium">%</span>
                  </div>

                  {/* Files List */}
                  <div className="mb-6">
                    <h4 className="font-semibold text-gray-700 mb-3">
                      Selected Files: <span className="text-purple-600">{bulkImages.length}</span>
                    </h4>
                    <div className="bg-gray-50 rounded-lg p-4 max-h-48 overflow-y-auto">
                      {bulkImages.map((file, index) => (
                        <div key={index} className="text-sm text-gray-600 py-1 border-b border-gray-200 last:border-b-0">
                          {file.name}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Process Button */}
                  <button
                    onClick={processBulkImages}
                    disabled={bulkProcessing}
                    className="w-full py-3 px-6 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {bulkProcessing ? 'Processing...' : 'Compress & Download ZIP'}
                  </button>

                  {/* Progress Bar */}
                  {bulkProcessing && (
                    <div className="mt-4">
                      <div className="bg-gray-200 rounded-full h-4 overflow-hidden">
                        <div
                          className="progress-bar bg-gradient-to-r from-purple-600 to-indigo-600 h-full flex items-center justify-center text-xs text-white font-semibold"
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
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 text-center border-2 border-blue-200">
                    <p className="text-sm text-gray-600 mb-1">Total Original</p>
                    <p className="text-xl font-bold text-blue-600">{formatFileSize(bulkStats.original)}</p>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 text-center border-2 border-green-200">
                    <p className="text-sm text-gray-600 mb-1">Total Compressed</p>
                    <p className="text-xl font-bold text-green-600">{formatFileSize(bulkStats.compressed)}</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 text-center border-2 border-purple-200">
                    <p className="text-sm text-gray-600 mb-1">Total Saved</p>
                    <p className="text-xl font-bold text-purple-600">{formatFileSize(bulkStats.saved)}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-white/80 text-sm">
          <p>All processing happens in your browser. No files are uploaded to any server.</p>
        </div>
      </div>

      <style jsx>{`
        .gradient-bg {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .glass {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .drop-zone {
          border: 2px dashed #667eea;
          transition: all 0.3s ease;
        }
        .drop-zone.drag-over {
          background-color: rgba(102, 126, 234, 0.1);
          border-color: #764ba2;
          transform: scale(1.02);
        }
        .drop-zone svg {
          transition: transform 0.3s ease;
        }
        .drop-zone.drag-over svg {
          transform: translateY(-10px);
          animation: bounce 0.6s ease infinite;
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(-10px); }
          50% { transform: translateY(-20px); }
        }
        .progress-bar {
          transition: width 0.3s ease;
        }
        .mode-btn:not(.bg-purple-600):hover {
          background-color: #f3f4f6;
        }
        .image-comparison-container {
          position: relative;
          width: 100%;
          max-width: 800px;
          margin: 0 auto;
          overflow: hidden;
          border-radius: 0.75rem;
          line-height: 0;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
          cursor: ew-resize;
          transition: box-shadow 0.3s ease, transform 0.2s ease;
        }
        .image-comparison-container:hover {
          box-shadow: 0 15px 50px rgba(102, 126, 234, 0.25);
        }
        .image-comparison-container:active {
          transform: scale(0.995);
        }
        .image-comparison-container img {
          display: block;
          width: 100%;
          height: auto;
          max-height: 500px;
          object-fit: contain;
          pointer-events: none;
          user-select: none;
        }
        .image-comparison-before {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
          z-index: 2;
          clip-path: inset(0 50% 0 0);
          pointer-events: none;
        }
        .image-comparison-before img {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }
        .image-comparison-handle {
          position: absolute;
          top: 0;
          bottom: 0;
          left: 50%;
          width: 4px;
          background: linear-gradient(180deg, 
            rgba(102, 126, 234, 0.3) 0%, 
            rgba(102, 126, 234, 0.9) 20%,
            rgba(118, 75, 162, 1) 50%,
            rgba(102, 126, 234, 0.9) 80%,
            rgba(102, 126, 234, 0.3) 100%);
          cursor: grab;
          z-index: 5;
          transform: translateX(-50%);
          box-shadow: 0 0 20px rgba(102, 126, 234, 0.6), 
                      0 0 40px rgba(118, 75, 162, 0.4),
                      inset 0 0 10px rgba(255, 255, 255, 0.3);
          transition: width 0.3s ease, box-shadow 0.3s ease;
        }
        .image-comparison-handle:active {
          cursor: grabbing;
        }
        .image-comparison-handle:hover {
          width: 5px;
          box-shadow: 0 0 30px rgba(102, 126, 234, 0.8), 
                      0 0 60px rgba(118, 75, 162, 0.6),
                      inset 0 0 15px rgba(255, 255, 255, 0.5);
        }
        .image-comparison-handle::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 56px;
          height: 56px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: 4px solid white;
          border-radius: 50%;
          transform: translate(-50%, -50%);
          box-shadow: 0 4px 20px rgba(102, 126, 234, 0.5),
                      0 8px 40px rgba(118, 75, 162, 0.3),
                      inset 0 2px 10px rgba(255, 255, 255, 0.3);
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .image-comparison-handle:hover::after {
          transform: translate(-50%, -50%) scale(1.15);
          box-shadow: 0 6px 28px rgba(102, 126, 234, 0.7),
                      0 12px 56px rgba(118, 75, 162, 0.5),
                      inset 0 2px 15px rgba(255, 255, 255, 0.4);
        }
        .image-comparison-handle:active::after {
          transform: translate(-50%, -50%) scale(1.05);
        }
        .image-comparison-handle::before {
          content: '⟷';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 28px;
          font-weight: bold;
          color: white;
          z-index: 1;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3),
                       0 4px 16px rgba(0, 0, 0, 0.2);
          transition: transform 0.3s ease;
        }
        .image-comparison-handle:hover::before {
          transform: translate(-50%, -50%) scale(1.1);
        }
      `}</style>
    </div>
  );
}
