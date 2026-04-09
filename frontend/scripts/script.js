document.addEventListener('DOMContentLoaded', () => {
    // Navigation
    const navButtons = document.querySelectorAll('.nav-button');
    const pages = document.querySelectorAll('.page');
    const ctaButton = document.querySelector('.cta-button');

    // Handle navigation
    function navigateToPage(pageId) {
        const currentPage = document.querySelector('.page.active');
        const nextPage = document.getElementById(pageId);
        
        if (currentPage && nextPage && currentPage !== nextPage) {
            // Remove hidden attribute if it exists
            nextPage.hidden = false;
            
            // Determine direction (left or right)
            const currentIndex = Array.from(currentPage.parentNode.children).indexOf(currentPage);
            const nextIndex = Array.from(nextPage.parentNode.children).indexOf(nextPage);
            const goingForward = nextIndex > currentIndex;

            // Set initial position for next page
            nextPage.style.display = 'block';
            nextPage.classList.add(goingForward ? 'exit-right' : 'exit-left');
            
            // Force a reflow
            nextPage.offsetHeight;
            
            // Start transition
            currentPage.classList.add(goingForward ? 'exit-left' : 'exit-right');
            currentPage.classList.remove('active');
            nextPage.classList.add('active');
            nextPage.classList.remove('exit-left', 'exit-right');

            // Update navigation buttons
            document.querySelectorAll('.nav-button').forEach(btn => {
                btn.classList.remove('active');
                if (btn.dataset.page === pageId.replace('Page', '')) {
                    btn.classList.add('active');
                }
            });

            // Clean up after transition
            const onTransitionEnd = () => {
                currentPage.style.display = 'none';
                currentPage.classList.remove('exit-left', 'exit-right');
                nextPage.removeEventListener('transitionend', onTransitionEnd);
            };
            
            nextPage.addEventListener('transitionend', onTransitionEnd);
        }
    }

    // Add navigation event listeners
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            navigateToPage(`${button.dataset.page}Page`);
        });
    });

    // CTA button navigation
    if (ctaButton) {
        ctaButton.addEventListener('click', () => {
            navigateToPage('scanPage');
        });
    }

    // Image Upload Handling
    const uploadButton = document.getElementById('uploadButton');
    const cameraButton = document.getElementById('cameraButton');
    const imageInput = document.getElementById('imageInput');
    const uploadArea = document.getElementById('uploadArea');
    const previewContainer = document.getElementById('previewContainer');
    const imagePreview = document.getElementById('imagePreview');
    const removeButton = document.getElementById('removeButton');
    const analyzeButton = document.getElementById('analyzeButton');

    // Update the image input accept attribute to allow all image types
    if (imageInput) {
        imageInput.accept = "image/*";
    }

    // Upload button click
    uploadButton?.addEventListener('click', () => {
        imageInput.click();
    });

    // Add these variables at the top of your script
    let stream = null;
    let facingMode = 'environment'; // Start with back camera

    // Camera handling functions
    async function initializeCamera() {
        const cameraModal = document.getElementById('cameraModal');
        const cameraFeed = document.getElementById('cameraFeed');
        const captureBtn = document.getElementById('captureBtn');
        const closeCamera = document.getElementById('closeCamera');
        const switchCamera = document.getElementById('switchCamera');
        const canvas = document.getElementById('photoCanvas');

        // Camera button click handler
        cameraButton?.addEventListener('click', async () => {
            try {
                await startCamera();
                cameraModal.classList.add('active');
            } catch (err) {
                console.error('Camera error:', err);
                showNotification('Camera access denied or not available', 'error');
            }
        });

        async function startCamera() {
            try {
                // Stop any existing stream
                if (stream) {
                    stream.getTracks().forEach(track => track.stop());
                }

                // Request camera access
                stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: facingMode,
                        width: { ideal: 1920 },
                        height: { ideal: 1080 }
                    }
                });

                // Connect stream to video element
                cameraFeed.srcObject = stream;
                await cameraFeed.play();
            } catch (err) {
                console.error('Camera start error:', err);
                throw err;
            }
        }

        function stopCamera() {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
                stream = null;
            }
            cameraModal.classList.remove('active');
        }

        function capturePhoto() {
            if (!stream) return;

            const ctx = canvas.getContext('2d');
            
            // Set canvas size to video size
            canvas.width = cameraFeed.videoWidth;
            canvas.height = cameraFeed.videoHeight;

            // Draw the video frame to canvas
            ctx.save();
            if (facingMode === 'user') {
                // Flip horizontally for front camera
                ctx.scale(-1, 1);
                ctx.translate(-canvas.width, 0);
            }
            ctx.drawImage(cameraFeed, 0, 0);
            ctx.restore();

            // Convert to image
            const photoData = canvas.toDataURL('image/jpeg', 0.8);

            // Update preview
            imagePreview.src = photoData;
            uploadArea.hidden = true;
            previewContainer.hidden = false;
            analyzeButton.disabled = false;

            // Stop camera and close modal
            stopCamera();
        }

        // Event Listeners
        captureBtn?.addEventListener('click', capturePhoto);
        closeCamera?.addEventListener('click', stopCamera);
        switchCamera?.addEventListener('click', async () => {
            facingMode = facingMode === 'user' ? 'environment' : 'user';
            try {
                await startCamera();
            } catch (err) {
                console.error('Camera switch error:', err);
                showNotification('Failed to switch camera', 'error');
            }
        });

        // Handle modal close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && cameraModal.classList.contains('active')) {
                stopCamera();
            }
        });
    }

    // File input change
    imageInput?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleImageUpload(file);
        }
    });

    // Drag and drop
    uploadArea?.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });

    uploadArea?.addEventListener('dragleave', () => {
        uploadArea.classList.remove('drag-over');
    });

    uploadArea?.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file) {
            handleImageUpload(file);
        }
    });

    // Remove button click
    removeButton?.addEventListener('click', () => {
        resetUpload();
    });

    // Analyze button click
    analyzeButton?.addEventListener('click', () => {
        analyzeImage();
    });

    function handleImageUpload(file) {
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                imagePreview.src = e.target.result;
                uploadArea.setAttribute('hidden', '');
                previewContainer.removeAttribute('hidden');
                analyzeButton.disabled = false;
            };
            reader.readAsDataURL(file);
        } else {
            showNotification('Please select a valid image file', 'error');
        }
    }

    function resetUpload() {
        imageInput.value = '';
        imagePreview.src = '';
        uploadArea.hidden = false;
        previewContainer.hidden = true;
        analyzeButton.disabled = true;
    }

    // Function to update history display
    async function updateHistoryDisplay() {
        const historyList = document.getElementById('historyList');
        if (!historyList) return;

        try {
            const response = await fetch('http://localhost:5000/get_predictions_history');
            if (!response.ok) throw new Error('Failed to fetch history');
            
            const data = await response.json();
            
            historyList.innerHTML = data.predictions.map(item => `
                <div class="history-item">
                    <img src="http://localhost:5000/get_prediction_image/${item.id}" alt="Scan" class="history-image">
                    <div class="history-details">
                        <h4 class="history-title">${item.label.replace(/_/g, ' ')}</h4>
                        <div class="history-info">
                            <div class="history-date">
                                <i class="bi bi-calendar3"></i>
                                ${formatDate(new Date(item.timestamp))}
                            </div>
                            ${item.latitude && item.longitude ? `
                            <div class="history-location">
                                <i class="bi bi-geo-alt"></i>
                                <a href="https://www.google.com/maps?q=${item.latitude},${item.longitude}" target="_blank">
                                    ${item.latitude.toFixed(6)}, ${item.longitude.toFixed(6)}
                                </a>
                            </div>
                            ` : ''}
                            <div class="history-result">
                                <i class="bi bi-check-circle-fill"></i>
                                ${Math.round(item.confidence * 100)}% confidence
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error fetching history:', error);
            showNotification('Failed to load history', 'error');
        }
    }

    // Update the analyzeImage function to remove localStorage
    async function analyzeImage() {
        try {
            showNotification('Getting location...', 'info');
            
            // Get location with high accuracy
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 5000,
                    maximumAge: 0
                });
            });

            showNotification('Processing image...', 'info');
            analyzeButton.disabled = true;

            // Get the image data
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = imagePreview.naturalWidth;
            canvas.height = imagePreview.naturalHeight;
            ctx.drawImage(imagePreview, 0, 0);

            // Convert to blob
            const blob = await new Promise(resolve => {
                canvas.toBlob(resolve, 'image/jpeg', 0.8);
            });

            // Create form data
            const formData = new FormData();
            formData.append('file', blob, 'image.jpg');
            formData.append('latitude', position.coords.latitude.toString());
            formData.append('longitude', position.coords.longitude.toString());

            // Send to server
            const response = await fetch('http://localhost:5000/predict3', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Server error');
            }

            const data = await response.json();
            
            // Display results with location
            displayResults(data.predictions, {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
            });
            
            // Update history display
            await updateHistoryDisplay();
            
            showNotification('Analysis complete!', 'success');
            
        } catch (error) {
            console.error('Analysis error:', error);
            if (error.name === 'GeolocationPositionError') {
                showNotification('Location access denied. Proceeding without location data...', 'warning');
                // Retry without location
                await analyzeImageWithoutLocation();
            } else {
                showNotification('Failed to analyze image', 'error');
            }
        } finally {
            analyzeButton.disabled = false;
        }
    }

    async function analyzeImageWithoutLocation() {
        try {
            showNotification('Processing image...', 'info');
            analyzeButton.disabled = true;

            // Get the image data
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = imagePreview.naturalWidth;
            canvas.height = imagePreview.naturalHeight;
            ctx.drawImage(imagePreview, 0, 0);

            // Convert to blob
            const blob = await new Promise(resolve => {
                canvas.toBlob(resolve, 'image/jpeg', 0.8);
            });

            // Create form data
            const formData = new FormData();
            formData.append('file', blob, 'image.jpg');

            // Send to server
            const response = await fetch('http://localhost:5000/predict3', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Server error');
            }

            const data = await response.json();
            displayResults(data.predictions);
            await updateHistoryDisplay();
            showNotification('Analysis complete!', 'success');
            
        } catch (error) {
            console.error('Analysis error:', error);
            showNotification('Failed to analyze image', 'error');
        } finally {
            analyzeButton.disabled = false;
        }
    }

    // Update the displayResults function
    function displayResults(results, location) {
        const resultsList = document.getElementById('resultsList');
        const analyzedImage = document.getElementById('analyzedImage');
        const recommendationsList = document.getElementById('recommendationsList');
        
        if (!resultsList || !analyzedImage || !recommendationsList) {
            console.error('Results elements not found');
            return;
        }
        
        // Set analyzed image
        analyzedImage.src = imagePreview.src;
        
        // Clear previous results
        resultsList.innerHTML = '';
        recommendationsList.innerHTML = '';

        // Add location information if available
        if (location) {
            const locationDiv = document.createElement('div');
            locationDiv.className = 'location-info';
            locationDiv.innerHTML = `
                <i class="bi bi-geo-alt"></i>
                <span>Location: </span>
                <a href="https://www.google.com/maps?q=${location.latitude},${location.longitude}" target="_blank">
                    ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}
                </a>
            `;
            resultsList.appendChild(locationDiv);
        }

        // Add detection results
        results.forEach(result => {
            const resultItem = document.createElement('div');
            resultItem.className = 'result-item';
            const confidencePercentage = Math.round(result.confidence * 100);
            
            resultItem.innerHTML = `
                <div class="result-content">
                    <div class="result-info">
                        <div class="result-main">
                            <div class="result-label">${result.label}</div>
                            <div class="confidence-badge">${confidencePercentage}%</div>
                        </div>
                        <div class="confidence-bar">
                            <div class="confidence-fill" style="width: ${confidencePercentage}%"></div>
                        </div>
                    </div>
                </div>
            `;
            resultsList.appendChild(resultItem);
        });

        // Add recommendations based on top result
        const recommendations = getRecommendations(results[0].label);
        recommendations.forEach(rec => {
            const recItem = document.createElement('div');
            recItem.className = 'recommendation-item';
            recItem.innerHTML = `
                <i class="bi bi-check-circle-fill"></i>
                <span>${rec}</span>
            `;
            recommendationsList.appendChild(recItem);
        });

        // Show action buttons
        document.getElementById('newScanButton').addEventListener('click', () => {
            resetUpload();
            navigateToPage('scanPage');
        });

        document.getElementById('saveResultsButton').addEventListener('click', () => {
            showNotification('Results saved successfully!', 'success');
        });

        // Navigate to results page
        navigateToPage('resultsPage');
    }

    function getConfidenceClass(confidence) {
        if (confidence >= 0.8) return 'high-confidence';
        if (confidence >= 0.6) return 'medium-confidence';
        return 'low-confidence';
    }

    // Helper function to get recommendations based on disease
    function getRecommendations(disease) {
        const recommendationsMap = {
            'Wheat Leaf Rust': [
                'Apply fungicide treatment immediately',
                'Monitor surrounding plants for spread',
                'Ensure proper air circulation between plants',
                'Consider resistant varieties for next season'
            ],
            'Septoria Leaf Blotch': [
                'Apply protective fungicide',
                'Reduce irrigation frequency',
                'Remove infected leaves',
                'Improve field drainage'
            ],
            'Yellow Rust': [
                'Apply systemic fungicide',
                'Monitor weather conditions',
                'Maintain plant spacing',
                'Consider early warning systems'
            ]
        };
        
        return recommendationsMap[disease] || [
            'Consult with local agricultural expert',
            'Monitor plant health regularly',
            'Document symptoms progression',
            'Consider soil testing'
        ];
    }

    // Notification System
    const notification = document.getElementById('notification');
    const notificationMessage = notification?.querySelector('.notification-message');
    const notificationClose = notification?.querySelector('.notification-close');

    function showNotification(message, type = 'info') {
        if (notification && notificationMessage) {
            notificationMessage.textContent = message;
            notification.className = `notification ${type}`;
            notification.hidden = false;
            setTimeout(() => {
                notification.hidden = true;
            }, 3000);
        }
    }

    notificationClose?.addEventListener('click', () => {
        notification.hidden = true;
    });

    // Initialize the app
    navigateToPage('homePage');

    initBackgroundSlideshow();

    // Prevent default touch behaviors
    document.addEventListener('touchmove', (e) => {
        if (e.target.closest('.app-main') === null) {
            e.preventDefault();
        }
    }, { passive: false });

    // Handle Android back button
    window.addEventListener('popstate', (e) => {
        e.preventDefault();
        // Handle navigation here
        const currentPage = document.querySelector('.page.active');
        if (currentPage.id !== 'homePage') {
            navigateToPage('homePage');
        } else {
            // Ask to confirm exit
            if (window.confirm('Do you want to exit the app?')) {
                window.close();
            }
        }
    });

    // Add active feedback on touch
    document.querySelectorAll('.nav-button').forEach(button => {
        button.addEventListener('touchstart', () => {
            button.style.opacity = '0.7';
        });
        
        button.addEventListener('touchend', () => {
            button.style.opacity = '1';
        });
    });

    // Enhanced toast notifications
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type} show`;
        toast.innerHTML = `
            <div class="toast-body d-flex align-items-center">
                <i class="bi bi-${type === 'success' ? 'check-circle' : 'info-circle'} me-2"></i>
                ${message}
            </div>
        `;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('fade');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // Add touch swipe navigation
    let touchStartX = 0;
    let touchEndX = 0;

    document.addEventListener('touchstart', e => {
        touchStartX = e.changedTouches[0].screenX;
    });

    document.addEventListener('touchend', e => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    });

    function handleSwipe() {
        const SWIPE_THRESHOLD = 50;
        const diff = touchStartX - touchEndX;

        if (Math.abs(diff) > SWIPE_THRESHOLD) {
            const currentPage = document.querySelector('.page.active');
            if (currentPage) {
                const pages = Array.from(currentPage.parentNode.children);
                const currentIndex = pages.indexOf(currentPage);
                
                if (diff > 0 && currentIndex < pages.length - 1) {
                    // Swipe left - go forward
                    navigateToPage(pages[currentIndex + 1].id);
                } else if (diff < 0 && currentIndex > 0) {
                    // Swipe right - go back
                    navigateToPage(pages[currentIndex - 1].id);
                }
            }
        }
    }

    // Add smooth ripple effect to nav buttons
    document.querySelectorAll('.nav-button').forEach(button => {
        button.addEventListener('click', function(e) {
            const ripple = document.createElement('div');
            ripple.classList.add('ripple');
            this.appendChild(ripple);

            const rect = button.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            
            ripple.style.width = ripple.style.height = `${size}px`;
            ripple.style.left = `${e.clientX - rect.left - size/2}px`;
            ripple.style.top = `${e.clientY - rect.top - size/2}px`;

            ripple.addEventListener('animationend', () => {
                ripple.remove();
            });
        });
    });

    // Initialize camera functionality
    initializeCamera();

    // Add this near the top with other button handlers
    const startScanBtn = document.querySelector('.start-scan-btn');
    
    // Add click handler for start scan button
    startScanBtn?.addEventListener('click', () => {
        navigateToPage('scanPage');
    });

    // Also handle any button with data-page attribute
    document.querySelectorAll('[data-page]').forEach(button => {
        button.addEventListener('click', (e) => {
            const pageId = `${e.target.closest('[data-page]').dataset.page}Page`;
            navigateToPage(pageId);
        });
    });

    // Add event listener for history page navigation
    document.querySelector('[data-page="history"]').addEventListener('click', () => {
        updateHistoryDisplay();
    });

    // Helper function to format date
    function formatDate(date) {
        // Parse the date string and adjust for local timezone
        const timestamp = new Date(date);
        
        // Format the date in local timezone
        return timestamp.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        });
    }

    // Add these variables at the top with your other declarations
    const cropButton = document.getElementById('cropButton');
    const rotateButton = document.getElementById('rotateButton');
    const filterButton = document.getElementById('filterButton');
    const cropModal = document.getElementById('cropModal');
    const cropCanvas = document.getElementById('cropCanvas');
    const cancelCrop = document.getElementById('cancelCrop');
    const applyCrop = document.getElementById('applyCrop');

    let cropper = null;

    // Add event listeners for editing features
    cropButton?.addEventListener('click', () => {
        initCrop();
    });

    rotateButton?.addEventListener('click', () => {
        rotateImage();
    });

    filterButton?.addEventListener('click', () => {
        showFilterOptions();
    });

    // Initialize crop functionality
    function initCrop() {
        const cropModal = document.getElementById('cropModal');
        cropModal.removeAttribute('hidden');
        const ctx = cropCanvas.getContext('2d');
        
        // Set canvas size to match image
        const img = document.getElementById('imagePreview');
        cropCanvas.width = img.naturalWidth;
        cropCanvas.height = img.naturalHeight;
        
        // Draw image on canvas
        ctx.drawImage(img, 0, 0);
        
        // Initialize cropper
        cropper = new Cropper(cropCanvas, {
            aspectRatio: NaN,
            viewMode: 1,
            guides: true,
            center: true,
            highlight: false,
            background: false,
            autoCrop: true,
            responsive: true,
            checkOrientation: true,
        });
    }

    // Handle crop cancellation
    cancelCrop?.addEventListener('click', () => {
        if (cropper) {
            cropper.destroy();
            cropper = null;
        }
        cropModal.setAttribute('hidden', '');
    });

    // Handle crop application
    applyCrop?.addEventListener('click', () => {
        if (cropper) {
            const croppedCanvas = cropper.getCroppedCanvas();
            const croppedImage = croppedCanvas.toDataURL('image/jpeg');
            
            // Update preview image with cropped version
            imagePreview.src = croppedImage;
            
            // Cleanup
            cropper.destroy();
            cropper = null;
            cropModal.setAttribute('hidden', '');
        }
    });

    // Rotate image function
    function rotateImage() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = document.getElementById('imagePreview');
        
        // Set canvas size for rotation
        canvas.width = img.naturalHeight;
        canvas.height = img.naturalWidth;
        
        // Rotate context
        ctx.translate(canvas.width/2, canvas.height/2);
        ctx.rotate(Math.PI/2);
        ctx.drawImage(img, -img.naturalWidth/2, -img.naturalHeight/2);
        
        // Update preview
        imagePreview.src = canvas.toDataURL('image/jpeg');
    }

    // Show filter options function
    function showFilterOptions() {
        // Implement filter functionality here
        showNotification('Filters coming soon!', 'info');
    }
});

function initBackgroundSlideshow() {
    const backgrounds = document.querySelectorAll('.bg-image');
    let currentBg = 0;

    function nextBackground() {
        backgrounds[currentBg].style.opacity = '0';
        currentBg = (currentBg + 1) % backgrounds.length;
        backgrounds[currentBg].style.opacity = '1';
    }

    // Change background every 10 seconds
    setInterval(nextBackground, 10000);
}

// Add these variables at the top with other constants
const cameraModal = document.createElement('div');
cameraModal.className = 'camera-modal';
cameraModal.innerHTML = `
    <div class="camera-container">
        <video id="cameraFeed" autoplay playsinline></video>
        <canvas id="photoCanvas" style="display: none;"></canvas>
        <div class="camera-controls">
            <button class="btn btn-light btn-circle" id="cancelPhoto">
                <i class="bi bi-x-lg"></i>
            </button>
            <button class="btn btn-primary btn-circle" id="takePhoto">
                <i class="bi bi-camera"></i>
            </button>
        </div>
    </div>
`;
document.body.appendChild(cameraModal); 