export type Locale = 'en' | 'es';

export interface TranslationKeys {
    appTitle: string;
    appSubtitle: string;
    privacyNotice: string;
    viewSource: string;

    // Mode toggles
    singleImage: string;
    bulkProcess: string;

    // Shared
    error: string;
    fileNotAllowed: string;
    fileNotAllowedHint: string;
    filesNotAllowed: (count: number) => string;
    onlyImagesSupported: string;

    // Single mode
    dropTitle: string;
    dropSubtitle: string;
    compressionSettings: string;
    low: string;
    medium: string;
    high: string;
    compression: string;

    // Preview
    preview: string;
    originalSize: string;
    compressedSize: string;
    spaceSaved: string;
    downloadCompressed: string;

    // Bulk mode
    bulkDropTitle: string;
    bulkDropSubtitle: string;
    bulkCompressionSettings: string;
    selectedFiles: string;
    removeImage: string;
    processing: string;
    compressDownloadZip: string;

    // Bulk results
    totalOriginal: string;
    totalCompressed: string;
    totalSaved: string;
}

export const translations: Record<Locale, TranslationKeys> = {
    en: {
        appTitle: 'Image Compressor',
        appSubtitle: 'Reduce image size while maintaining quality',
        privacyNotice: 'All processing happens in your browser. No files are uploaded to any server.',
        viewSource: 'View source on GitHub',

        singleImage: 'Single Image',
        bulkProcess: 'Bulk Process',

        error: 'Error',
        fileNotAllowed: 'This file extension is not allowed:',
        fileNotAllowedHint: 'Please upload an image file (JPG, PNG, WebP)',
        filesNotAllowed: (count: number) => `${count} file extension${count === 1 ? ' is' : 's are'} not allowed:`,
        onlyImagesSupported: 'Only image files (JPG, PNG, WebP) are supported.',

        dropTitle: 'Drop image here or click to upload',
        dropSubtitle: 'Supports: JPG, PNG, WebP (converts to JPG)',
        compressionSettings: 'Compression Settings',
        low: 'Low (10%)',
        medium: 'Medium (30%)',
        high: 'High (50%)',
        compression: 'Compression:',

        preview: 'Preview',
        originalSize: 'Original Size',
        compressedSize: 'Compressed Size',
        spaceSaved: 'Space Saved',
        downloadCompressed: 'Download Compressed Image',

        bulkDropTitle: 'Drop multiple images here or click to upload',
        bulkDropSubtitle: 'Supports: JPG, PNG, WebP (converts to JPG)',
        bulkCompressionSettings: 'Compression Settings (Applied to All)',
        selectedFiles: 'Selected Files:',
        removeImage: 'Remove image',
        processing: 'Processing...',
        compressDownloadZip: 'Compress & Download ZIP',

        totalOriginal: 'Total Original',
        totalCompressed: 'Total Compressed',
        totalSaved: 'Total Saved',
    },

    es: {
        appTitle: 'Compresor de Imágenes',
        appSubtitle: 'Reducí el tamaño de tus imágenes',
        privacyNotice: 'Todo el procesamiento ocurre en tu navegador. No se sube ningún archivo a ningún servidor.',
        viewSource: 'Ver código en GitHub',

        singleImage: 'Una sola imagen',
        bulkProcess: 'Múltiples imágenes',

        error: 'Error',
        fileNotAllowed: 'Esta extensión de archivo no está permitida:',
        fileNotAllowedHint: 'Subí un archivo de imagen (JPG, PNG, WebP)',
        filesNotAllowed: (count: number) => `${count} extensión${count === 1 ? '' : 'es'} de archivo no permitida${count === 1 ? '' : 's'}:`,
        onlyImagesSupported: 'Solo se admiten archivos de imagen (JPG, PNG, WebP).',

        dropTitle: 'Arrastrá una imagen aquí o hacé click para subir',
        dropSubtitle: 'Soporta: JPG, PNG, WebP (convierte a JPG)',
        compressionSettings: 'Ajustes de compresión',
        low: 'Baja (10%)',
        medium: 'Media (30%)',
        high: 'Alta (50%)',
        compression: 'Compresión:',

        preview: 'Vista previa',
        originalSize: 'Tamaño original',
        compressedSize: 'Tamaño comprimido',
        spaceSaved: 'Espacio ahorrado',
        downloadCompressed: 'Descargar imagen comprimida',

        bulkDropTitle: 'Arrastrá varias imágenes aquí o hacé click para subir',
        bulkDropSubtitle: 'Soporta: JPG, PNG, WebP (convierte a JPG)',
        bulkCompressionSettings: 'Ajustes de compresión (aplicados a todas)',
        selectedFiles: 'Archivos seleccionados:',
        removeImage: 'Eliminar imagen',
        processing: 'Procesando...',
        compressDownloadZip: 'Comprimir y descargar ZIP',

        totalOriginal: 'Total original',
        totalCompressed: 'Total comprimido',
        totalSaved: 'Total ahorrado',
    },
};
