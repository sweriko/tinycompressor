class TinyCompressor {
    constructor() {
        this.apiKey = localStorage.getItem('tinypng-api-key') || '';
        this.workerUrl = window.location.origin; // Use current domain
        this.processingQueue = new Map();
        this.currentMode = 'compressor'; // compressor, converter, resizer
        this.modes = ['compressor', 'converter', 'resizer'];
        this.modeTexts = ['COMPRESSOR', 'CONVERTER', 'RESIZER'];
        this.aspectRatioLocked = true;
        this.currentAspectRatio = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadApiKey();
        // Initialize with 50% preset selected by default
        this.setResizePreset(50);
    }

    setupEventListeners() {
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('fileInput');
        const apiKeyInput = document.getElementById('apiKey');
        const saveApiKeyBtn = document.getElementById('saveApiKey');

        // API Key management
        apiKeyInput.addEventListener('input', (e) => {
            this.apiKey = e.target.value;
            this.toggleCustomPlaceholder();
        });

        // Handle custom placeholder visibility
        apiKeyInput.addEventListener('focus', () => {
            this.toggleCustomPlaceholder();
        });

        apiKeyInput.addEventListener('blur', () => {
            this.toggleCustomPlaceholder();
        });

        saveApiKeyBtn.addEventListener('click', () => {
            this.saveApiKey();
        });

        // Mode switching
        const modeSwitchBtn = document.getElementById('modeSwitch');
        modeSwitchBtn.addEventListener('click', () => {
            this.switchMode();
        });

        // Resizer controls
        const resize50Btn = document.getElementById('resize50');
        const resize75Btn = document.getElementById('resize75');
        const customWidthInput = document.getElementById('customWidth');
        const customHeightInput = document.getElementById('customHeight');
        const aspectRatioLockBtn = document.getElementById('aspectRatioLock');

        resize50Btn.addEventListener('click', () => {
            this.setResizePreset(50);
        });

        resize75Btn.addEventListener('click', () => {
            this.setResizePreset(75);
        });

        customWidthInput.addEventListener('input', (e) => {
            this.handleCustomDimensionChange('width', e.target.value);
        });

        customHeightInput.addEventListener('input', (e) => {
            this.handleCustomDimensionChange('height', e.target.value);
        });

        aspectRatioLockBtn.addEventListener('click', () => {
            this.toggleAspectRatioLock();
        });

        // File input
        fileInput.addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
        });

        // Drop zone events
        dropZone.addEventListener('click', () => {
            fileInput.click();
        });

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        dropZone.addEventListener('dragleave', () => {
            // No styling changes needed for local drop zone events
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            // Remove green outline
            dropZone.classList.remove('border-green-500', 'shadow-[8px_8px_0px_rgba(34,197,94,0.3)]');
            this.handleFiles(e.dataTransfer.files);
        });

        // Global drag-drop functionality
        document.addEventListener('dragover', (e) => {
            e.preventDefault();
            // Add green outline to drop zone when dragging files anywhere on page
            const dropZone = document.getElementById('dropZone');
            dropZone.classList.add('border-green-500', 'shadow-[8px_8px_0px_rgba(34,197,94,0.3)]');
        });

        document.addEventListener('dragleave', (e) => {
            // Only remove outline if leaving the entire window
            if (e.clientX === 0 && e.clientY === 0) {
                const dropZone = document.getElementById('dropZone');
                dropZone.classList.remove('border-green-500', 'shadow-[8px_8px_0px_rgba(34,197,94,0.3)]');
            }
        });

        document.addEventListener('drop', (e) => {
            e.preventDefault();
            // Remove green outline
            const dropZone = document.getElementById('dropZone');
            dropZone.classList.remove('border-green-500', 'shadow-[8px_8px_0px_rgba(34,197,94,0.3)]');
            
            // Only handle files if not dropped on the drop zone
            if (!e.target.closest('#dropZone')) {
                this.handleFiles(e.dataTransfer.files);
            }
        });
    }

    switchMode() {
        const currentIndex = this.modes.indexOf(this.currentMode);
        const nextIndex = (currentIndex + 1) % this.modes.length;
        this.currentMode = this.modes[nextIndex];
        
        this.animateModeSwitch();
        this.updateModeUI();
    }

    animateModeSwitch() {
        const modeText = document.getElementById('modeText');
        const currentIndex = this.modes.indexOf(this.currentMode);
        const newText = this.modeTexts[currentIndex];
        
        // Quick slide animation
        modeText.style.transform = 'translateX(-100%)';
        
        setTimeout(() => {
            modeText.textContent = newText;
            modeText.style.transform = 'translateX(100%)';
            
            setTimeout(() => {
                modeText.style.transform = 'translateX(0)';
            }, 50);
        }, 150);
    }

    updateModeUI() {
        const converterControls = document.getElementById('converterControls');
        const resizerControls = document.getElementById('resizerControls');
        
        // Hide all controls first
        converterControls.classList.add('hidden');
        resizerControls.classList.add('hidden');
        
        // Show controls based on current mode
        if (this.currentMode === 'converter') {
            converterControls.classList.remove('hidden');
        } else if (this.currentMode === 'resizer') {
            resizerControls.classList.remove('hidden');
            // Set 50% resize as default
            this.setResizePreset(50);
        }
    }

    setResizePreset(percentage) {
        const customWidth = document.getElementById('customWidth');
        const customHeight = document.getElementById('customHeight');
        const resize50Btn = document.getElementById('resize50');
        const resize75Btn = document.getElementById('resize75');
        
        // Clear custom inputs to indicate preset is active
        customWidth.value = '';
        customHeight.value = '';
        customWidth.placeholder = `${percentage}%`;
        customHeight.placeholder = `${percentage}%`;
        
        // Update button states to show which preset is selected
        if (percentage === 50) {
            resize50Btn.classList.add('bg-[#FFEB3B]');
            resize50Btn.classList.remove('bg-[#FFF5B4]');
            resize75Btn.classList.add('bg-[#FFF5B4]');
            resize75Btn.classList.remove('bg-[#FFEB3B]');
        } else if (percentage === 75) {
            resize75Btn.classList.add('bg-[#FFEB3B]');
            resize75Btn.classList.remove('bg-[#FFF5B4]');
            resize50Btn.classList.add('bg-[#FFF5B4]');
            resize50Btn.classList.remove('bg-[#FFEB3B]');
        }
    }

    handleCustomDimensionChange(dimension, value) {
        const customWidth = document.getElementById('customWidth');
        const customHeight = document.getElementById('customHeight');
        const resize50Btn = document.getElementById('resize50');
        const resize75Btn = document.getElementById('resize75');
        
        // Clear preset button selection when custom values are entered
        if (value) {
            resize50Btn.classList.add('bg-[#FFF5B4]');
            resize50Btn.classList.remove('bg-[#FFEB3B]');
            resize75Btn.classList.add('bg-[#FFF5B4]');
            resize75Btn.classList.remove('bg-[#FFEB3B]');
            
            // Clear placeholders
            customWidth.placeholder = 'Width';
            customHeight.placeholder = 'Height';
        }
        
        if (!this.aspectRatioLocked || !this.currentAspectRatio) return;
        
        if (dimension === 'width' && value) {
            const newHeight = Math.round(value / this.currentAspectRatio);
            customHeight.value = newHeight;
        } else if (dimension === 'height' && value) {
            const newWidth = Math.round(value * this.currentAspectRatio);
            customWidth.value = newWidth;
        }
    }

    toggleAspectRatioLock() {
        this.aspectRatioLocked = !this.aspectRatioLocked;
        const lockBtn = document.getElementById('aspectRatioLock');
        
        if (this.aspectRatioLocked) {
            lockBtn.classList.remove('bg-gray-400');
            lockBtn.classList.add('bg-[#6C5CE7]');
            lockBtn.innerHTML = `
                <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path d="M6 10v-4a6 6 0 1 1 12 0v4"/>
                    <rect x="2" y="10" width="20" height="10" rx="2" ry="2"/>
                </svg>
            `;
        } else {
            lockBtn.classList.remove('bg-[#6C5CE7]');
            lockBtn.classList.add('bg-gray-400');
            lockBtn.innerHTML = `
                <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <rect x="3" y="11" width="18" height="10" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 5-5 5 5 0 0 1 5 5"/>
                </svg>
            `;
        }
    }

    loadApiKey() {
        const apiKeyInput = document.getElementById('apiKey');
        if (this.apiKey) {
            apiKeyInput.value = this.apiKey;
        }
        this.toggleCustomPlaceholder();
    }

    toggleCustomPlaceholder() {
        const apiKeyInput = document.getElementById('apiKey');
        const customPlaceholder = document.getElementById('customPlaceholder');
        
        if (apiKeyInput.value.length > 0) {
            customPlaceholder.style.display = 'none';
            // Add purple background and white text when typing
            apiKeyInput.classList.add('bg-[#6C5CE7]', 'text-white');
        } else {
            customPlaceholder.style.display = 'block';
            // Remove purple background when empty
            apiKeyInput.classList.remove('bg-[#6C5CE7]', 'text-white');
        }
    }

    saveApiKey() {
        if (!this.apiKey) {
            this.showNotification('Please enter a valid API key', 'error', 2000);
            return;
        }

        localStorage.setItem('tinypng-api-key', this.apiKey);
        this.showNotification('API key saved successfully!', 'success');
    }

    handleFiles(files) {
        if (!this.apiKey) {
            this.showNotification('Please enter and save your TinyPNG API key first', 'error', 2000);
            return;
        }

        const imageFiles = Array.from(files).filter(file => 
            file.type.startsWith('image/')
        );

        if (imageFiles.length === 0) {
            this.showNotification('Please select image files only', 'error');
            return;
        }

        // Process all images in parallel
        imageFiles.forEach(file => {
            this.processImage(file);
        });
    }

    async processImage(file) {
        const itemId = Date.now() + Math.random();
        
        try {
            // Set aspect ratio for resizer if it's the first image
            if (this.currentMode === 'resizer' && !this.currentAspectRatio) {
                this.currentAspectRatio = await this.getImageAspectRatio(file);
            }
            
            // Get image dimensions for resizer mode
            let imageDimensions = null;
            if (this.currentMode === 'resizer') {
                imageDimensions = await this.getImageDimensions(file);
            }
            
            // Add to processing queue first
            this.processingQueue.set(itemId, {
                file,
                element: null,
                status: 'processing',
                imageDimensions
            });
            
            // Then create queue item with correct dimensions
            const queueItem = this.createQueueItem(file, itemId);
            
            // Update the queue item reference
            this.processingQueue.set(itemId, {
                ...this.processingQueue.get(itemId),
                element: queueItem
            });

            // Create form data
            const formData = new FormData();
            formData.append('image', file);
            formData.append('apiKey', this.apiKey);
            formData.append('mode', this.currentMode);

            // Add mode-specific parameters
            if (this.currentMode === 'converter') {
                const targetFormat = document.getElementById('targetFormat').value;
                formData.append('targetFormat', targetFormat);
            } else if (this.currentMode === 'resizer') {
                const customWidth = document.getElementById('customWidth').value;
                const customHeight = document.getElementById('customHeight').value;
                
                if (customWidth || customHeight) {
                    formData.append('customWidth', customWidth);
                    formData.append('customHeight', customHeight);
                    formData.append('aspectRatioLocked', this.aspectRatioLocked);
                } else {
                    // Check for preset percentage
                    const widthPlaceholder = document.getElementById('customWidth').placeholder;
                    if (widthPlaceholder.includes('%')) {
                        const percentage = parseInt(widthPlaceholder.replace('%', ''));
                        formData.append('resizePercentage', percentage);
                    }
                }
            }

            // Send to worker with timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minutes timeout
            
            const response = await fetch(this.workerUrl, {
                method: 'POST',
                body: formData,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success) {
                this.updateQueueItem(itemId, result.data);
            } else {
                throw new Error(result.error || 'Processing failed');
            }

        } catch (error) {
            console.error('Error processing image:', error);
            this.updateQueueItemError(itemId, error.message);
        }
    }

    createQueueItem(file, itemId) {
        const queueContainer = document.getElementById('queueContainer');
        
        const queueItem = document.createElement('div');
        queueItem.className = 'bg-white border-2 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] rounded-lg p-3 sm:p-4';
        queueItem.dataset.itemId = itemId;
        
        // Create optimized image preview for large files
        const img = document.createElement('img');
        if (file.size > 10 * 1024 * 1024) { // 10MB+
            // For very large files, create a smaller preview
            this.createImagePreview(file).then(previewUrl => {
                img.src = previewUrl;
            });
        } else {
            img.src = URL.createObjectURL(file);
        }
        img.alt = file.name;
        
        const originalSize = this.formatFileSize(file.size);
        const estimatedTime = this.estimateProcessingTime(file.size);
        
        // Get filesize display based on mode
        let fileSizeDisplay = originalSize;
        if (this.currentMode === 'resizer') {
            const dimensions = this.processingQueue.get(itemId)?.imageDimensions;
            if (dimensions) {
                fileSizeDisplay = `${dimensions.resolution} • ${originalSize}`;
            }
        }

        queueItem.innerHTML = `
            <div class="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 lg:gap-6">
                <div class="flex items-center gap-3 sm:gap-4 lg:gap-6 flex-1 min-w-0">
                    <img src="${URL.createObjectURL(file)}" alt="${file.name}" class="w-10 h-10 sm:w-12 sm:h-12 object-cover border-2 border-black rounded-md flex-shrink-0">
                    <div class="flex-1 min-w-0 lg:max-w-none">
                        <div class="font-bold text-black mb-1 line-clamp-2 text-sm sm:text-base">${file.name}</div>
                        <div class="font-medium text-gray-600 text-xs sm:text-sm file-info">${fileSizeDisplay}</div>
                    </div>
                </div>
                <div class="flex items-center gap-2 sm:gap-3 lg:gap-4 flex-wrap sm:flex-nowrap">
                    <div class="savings font-bold text-gray-500 text-xs sm:text-sm min-w-[50px] sm:min-w-[60px] lg:min-w-[70px]">...</div>
                    <button class="action-btn px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 border-2 border-black bg-[#FF8C42] rounded-md font-bold text-xs sm:text-sm cursor-not-allowed flex items-center gap-1.5 sm:gap-2 text-white transition-all duration-300 ease-out" disabled>
                        <div class="w-2.5 h-2.5 sm:w-3 sm:h-3 border-2 border-white rounded-full animate-spin border-t-transparent"></div>
                        <span class="action-text">PROCESSING</span>
                    </button>
                </div>
            </div>
        `;
        
        queueContainer.appendChild(queueItem);
        return queueItem;
    }

    async createImagePreview(file) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = () => {
                // Create a smaller preview (max 200x200)
                const maxSize = 200;
                const ratio = Math.min(maxSize / img.width, maxSize / img.height);
                canvas.width = img.width * ratio;
                canvas.height = img.height * ratio;
                
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
            
            img.src = URL.createObjectURL(file);
        });
    }

    async getImageAspectRatio(file) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const aspectRatio = img.width / img.height;
                resolve(aspectRatio);
                URL.revokeObjectURL(img.src);
            };
            img.src = URL.createObjectURL(file);
        });
    }

    async getImageDimensions(file) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const dimensions = {
                    width: img.width,
                    height: img.height,
                    resolution: `${img.width}x${img.height}`
                };
                resolve(dimensions);
                URL.revokeObjectURL(img.src);
            };
            img.src = URL.createObjectURL(file);
        });
    }

    estimateProcessingTime(fileSize) {
        // Rough estimates based on file size
        if (fileSize < 1024 * 1024) return '~10-20 seconds';
        if (fileSize < 5 * 1024 * 1024) return '~30-60 seconds';
        if (fileSize < 10 * 1024 * 1024) return '~1-2 minutes';
        return '~2-5 minutes';
    }

    updateQueueItem(itemId, data) {
        const queueItem = document.querySelector(`[data-item-id="${itemId}"]`);
        if (!queueItem) return;

        const originalSize = this.processingQueue.get(itemId).file.size;
        const compressedSize = data.compressedSize;
        const savings = originalSize - compressedSize;
        const savingsPercent = Math.round((savings / originalSize) * 100);

        // Update based on current mode
        // Transform the action button from processing to download state
        const actionBtn = queueItem.querySelector('.action-btn');
        const savingsElement = queueItem.querySelector('.savings');
        
        if (this.currentMode === 'converter') {
            // For converter mode: show filesize in savings position
            const targetFormat = document.getElementById('targetFormat').value;
            const fileType = targetFormat.split('/')[1].toUpperCase();
            
            savingsElement.textContent = this.formatFileSize(compressedSize);
            savingsElement.className = 'savings font-bold text-gray-600 text-xs sm:text-sm min-w-[50px] sm:min-w-[60px] lg:min-w-[70px]';
            
            // Transform button to download state
            actionBtn.disabled = false;
            actionBtn.className = 'action-btn px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 border-2 border-black bg-[#6C5CE7] hover:bg-[#5a4fcf] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] active:bg-[#4c43b7] rounded-md font-bold text-xs sm:text-sm cursor-pointer transition-all duration-300 ease-out flex items-center gap-1.5 sm:gap-2 text-white';
            actionBtn.innerHTML = `
                <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                </svg>
                <span class="action-text">${fileType}</span>
            `;
            actionBtn.onclick = () => this.downloadImage(data.compressedImageData, data.filename);

        } else if (this.currentMode === 'resizer') {
            // For resizer mode: show filesize in savings position and original resolution in file info
            savingsElement.textContent = this.formatFileSize(compressedSize);
            savingsElement.className = 'savings font-bold text-gray-600 text-xs sm:text-sm min-w-[50px] sm:min-w-[60px] lg:min-w-[70px]';
            
            // Update file info to show original resolution
            const fileInfo = queueItem.querySelector('.file-info');
            if (data.originalResolution) {
                fileInfo.textContent = `${data.originalResolution} • ${this.formatFileSize(originalSize)}`;
            }
            
            // Transform button to download state
            actionBtn.disabled = false;
            actionBtn.className = 'action-btn px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 border-2 border-black bg-[#6C5CE7] hover:bg-[#5a4fcf] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] active:bg-[#4c43b7] rounded-md font-bold text-xs sm:text-sm cursor-pointer transition-all duration-300 ease-out flex items-center gap-1.5 sm:gap-2 text-white';
            actionBtn.innerHTML = `
                <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                </svg>
                <span class="action-text">${data.newResolution || 'Resized'}</span>
            `;
            actionBtn.onclick = () => this.downloadImage(data.compressedImageData, data.filename);

        } else {
            // Default compressor mode: show savings percentage
            savingsElement.textContent = `SAVINGS: -${savingsPercent}%`;
            savingsElement.className = 'savings font-bold text-[#00B894] text-xs sm:text-sm min-w-[50px] sm:min-w-[60px] lg:min-w-[70px]';
            
            // Transform button to download state
            actionBtn.disabled = false;
            actionBtn.className = 'action-btn px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 border-2 border-black bg-[#6C5CE7] hover:bg-[#5a4fcf] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] active:bg-[#4c43b7] rounded-md font-bold text-xs sm:text-sm cursor-pointer transition-all duration-300 ease-out flex items-center gap-1.5 sm:gap-2 text-white';
            actionBtn.innerHTML = `
                <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                </svg>
                <span class="action-text">${this.formatFileSize(compressedSize)}</span>
            `;
            actionBtn.onclick = () => this.downloadImage(data.compressedImageData, data.filename);
        }

        // Update queue data
        this.processingQueue.set(itemId, {
            ...this.processingQueue.get(itemId),
            status: 'completed',
            data
        });

        // No additional animation needed - button transforms directly
    }

    updateQueueItemError(itemId, errorMessage) {
        const queueItem = document.querySelector(`[data-item-id="${itemId}"]`);
        if (!queueItem) return;

        // Update savings area based on mode
        const savingsElement = queueItem.querySelector('.savings');
        if (this.currentMode === 'converter' || this.currentMode === 'resizer') {
            savingsElement.style.display = 'none';
        } else {
            savingsElement.textContent = 'Error';
            savingsElement.className = 'savings font-bold text-[#E17055] text-xs sm:text-sm min-w-[50px] sm:min-w-[60px] lg:min-w-[70px]';
        }

        // Transform action button to error state
        const actionBtn = queueItem.querySelector('.action-btn');
        actionBtn.disabled = true;
        actionBtn.className = 'action-btn px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 border-2 border-black bg-[#E17055] rounded-md font-bold text-xs sm:text-sm cursor-not-allowed transition-all duration-300 ease-out flex items-center gap-1.5 sm:gap-2 text-white';
        actionBtn.innerHTML = `
            <svg class="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
            <span class="action-text">ERROR</span>
        `;

        // Update queue data
        this.processingQueue.set(itemId, {
            ...this.processingQueue.get(itemId),
            status: 'error',
            error: errorMessage
        });
    }

    downloadImage(imageData, filename) {
        // Convert base64 to blob
        const byteCharacters = atob(imageData);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        
        // Determine MIME type based on file extension
        let mimeType = 'image/png';
        if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) {
            mimeType = 'image/jpeg';
        } else if (filename.endsWith('.webp')) {
            mimeType = 'image/webp';
        } else if (filename.endsWith('.avif')) {
            mimeType = 'image/avif';
        }
        
        const blob = new Blob([byteArray], { type: mimeType });

        // Create download link
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    showNotification(message, type = 'info', duration = 4000) {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => notification.remove());

        // Create notification element
        const notification = document.createElement('div');
        const bgColor = type === 'error' ? 'bg-[#E17055]' : 
                       type === 'success' ? 'bg-[#00B894]' : 
                       'bg-[#6C5CE7]';
        
        notification.className = `notification absolute -top-1 -right-1 z-50 ${bgColor} border-2 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] rounded-lg p-4 font-bold text-white max-w-xs`;
        notification.innerHTML = `
            <div class="flex items-center gap-3">
                <svg class="w-5 h-5 flex-shrink-0 text-white" fill="currentColor" viewBox="0 0 24 24">
                    ${type === 'error' ? 
                        '<path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>' :
                        type === 'success' ? 
                        '<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>' :
                        '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>'
                    }
                </svg>
                <span class="text-sm text-white">${message}</span>
            </div>
        `;

        // Add to header
        const header = document.querySelector('header');
        header.appendChild(notification);

        // Remove after specified duration
        setTimeout(() => {
            notification.remove();
        }, duration);
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    new TinyCompressor();
}); 