// app.js - QR Attendance App
// Configuration
const MATCH_QR_STRING = "f29cZb7Q6DuaMjYkTLV3nxR9KEqV2XoBslrHcwA8d1tZ5UeqgiWTvjNpLEsQ";
const API_BASE_URL = "https://script.google.com/macros/s/AKfycbzG3HF3jz--_ACOWOFUh7fNatY8s6U0SurgqzJsOgpVaWbO_UoDNw7Q0wJzurgDwWVinA/exec";

// State variables
let qrScanner = null;
let currentUser = null;
let scanCooldown = false;
let isUserRegistered = false;
let currentLocation = null;
let isAppInitialized = false;
let isCameraActive = false;

// DOM elements
let qrReaderElement, userFormCard, userInfoDisplay, statusDisplay;

// ============ APP INITIALIZATION ============
document.addEventListener('DOMContentLoaded', initializeApp);

async function initializeApp() {
    try {
        console.log('Starting QR Attendance App...');
        
        // Initialize DOM elements
        initDOMElements();
        
        // Setup UI components
        setupCameraToggle();
        setupGalleryUpload();
        setupFormSubmission();
        
        // Request permissions
        await requestLocationPermission();
        
        // Check for existing user data
        await checkForExistingUser();
        checkTempUserData();
        
        // Initialize UI state
        disableForm();
        updateStatus('Ready - Toggle camera or upload QR image');
        updateScannerStatus('inactive');
        
        // Update user info if available
        if (currentUser && currentUser.employeeId) {
            renderUserInfo(currentUser);
            await updateStatusCard(currentUser.employeeId);
        }
        
        isAppInitialized = true;
        console.log('App initialization completed successfully');
    } catch (error) {
        console.error('Error in initializeApp:', error);
        showMessage('App initialization failed: ' + error.message, 'error');
    }
}

function initDOMElements() {
    qrReaderElement = document.getElementById('qr-reader');
    userFormCard = document.getElementById('form-card');
    userInfoDisplay = document.getElementById('user-info-display');
    statusDisplay = document.getElementById('status-text');
    
    console.log('DOM Elements initialized:', {
        qrReader: !!qrReaderElement,
        formCard: !!userFormCard,
        userInfoDisplay: !!userInfoDisplay,
        statusDisplay: !!statusDisplay
    });
}

// ============ CAMERA FUNCTIONS ============
function setupCameraToggle() {
    const scannerContainer = document.getElementById('qr-scanner-container');
    if (!scannerContainer) return;
    
    const toggleButton = document.createElement('button');
    toggleButton.id = 'camera-toggle-btn';
    toggleButton.className = 'w-full mt-4 bg-primary hover:bg-primary-dark text-white font-medium py-3 px-4 rounded-lg transition-colors focus:ring-2 focus:ring-primary focus:ring-offset-2';
    toggleButton.innerHTML = `
        <div class="flex items-center justify-center space-x-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0118.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
            <span>Start Camera</span>
        </div>
    `;
    toggleButton.addEventListener('click', toggleCamera);
    scannerContainer.appendChild(toggleButton);
}

async function toggleCamera() {
    const toggleBtn = document.getElementById('camera-toggle-btn');
    
    try {
        if (!isCameraActive) {
            await startQRScanner();
            if (qrScanner) {
                isCameraActive = true;
                toggleBtn.innerHTML = `
                    <div class="flex items-center justify-center space-x-2">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 10l6 6m0-6l-6 6"></path>
                        </svg>
                        <span>Stop Camera</span>
                    </div>
                `;
                toggleBtn.className = 'w-full mt-4 bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-lg transition-colors focus:ring-2 focus:ring-red-500 focus:ring-offset-2';
                updateScannerStatus('active');
            }
        } else {
            await stopQRScanner();
            isCameraActive = false;
            toggleBtn.innerHTML = `
                <div class="flex items-center justify-center space-x-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0118.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    </svg>
                    <span>Start Camera</span>
                </div>
            `;
            toggleBtn.className = 'w-full mt-4 bg-primary hover:bg-primary-dark text-white font-medium py-3 px-4 rounded-lg transition-colors focus:ring-2 focus:ring-primary focus:ring-offset-2';
            updateScannerStatus('inactive');
            
            qrReaderElement.innerHTML = `
                <div class="text-center text-gray-500">
                    <svg class="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"></path>
                    </svg>
                    <p class="font-medium">Click "Start Camera" to begin scanning</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error in toggleCamera:', error);
        showMessage('Camera toggle failed: ' + error.message, 'error');
    }
}

async function startQRScanner() {
    try {
        if (qrScanner) {
            await stopQRScanner();
        }
        
        if (!qrReaderElement) {
            throw new Error('QR reader element not found');
        }
        
        // Initialize Html5Qrcode scanner
        qrScanner = new Html5Qrcode("qr-reader");
        
        const config = {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
        };
        
        await qrScanner.start(
            { facingMode: "environment" }, // Use back camera
            config,
            onScanSuccess,
            onScanFailure
        );
        
        updateStatus('Camera active - Scan QR code');
        console.log('QR Scanner started successfully');
    } catch (error) {
        console.error('Error starting QR scanner:', error);
        showMessage('Failed to start camera: ' + error.message, 'error');
        updateStatus('Camera failed to start');
    }
}

async function stopQRScanner() {
    try {
        if (qrScanner) {
            await qrScanner.stop();
            qrScanner.clear();
            qrScanner = null;
        }
        updateStatus('Camera stopped');
        console.log('QR Scanner stopped');
    } catch (error) {
        console.error('Error stopping QR scanner:', error);
    }
}

function onScanSuccess(decodedText) {
    if (scanCooldown) return;
    
    console.log('QR Code scanned:', decodedText);
    handleQRCodeScan(decodedText);
}

function onScanFailure(error) {
    // Silent fail for continuous scanning
}

// ============ QR CODE PROCESSING ============
async function handleQRCodeScan(qrData) {
    try {
        if (scanCooldown) {
            console.log('Scan cooldown active, ignoring scan');
            return;
        }
        
        console.log('Processing QR code:', qrData);
        
        // Start cooldown to prevent multiple scans
        scanCooldown = true;
        setTimeout(() => { scanCooldown = false; }, 3000);
        
        updateStatus('Processing QR code...');
        updateScannerStatus('processing');
        
        // Check if QR contains the expected string
        if (qrData !== MATCH_QR_STRING) {
            showMessage('Invalid QR code. Please scan the correct attendance QR code.', 'error');
            updateStatus('Invalid QR code');
            updateScannerStatus('inactive');
            return;
        }
        
        showMessage('Valid QR code detected!', 'success');
        updateStatus('Valid QR code detected');
        
        // Check if user is already registered
        if (currentUser && currentUser.employeeId) {
            console.log('User already registered, handling attendance');
            await handleAttendanceAction();
        } else {
            console.log('New user detected, showing registration form');
            showRegistrationForm();
        }
        
    } catch (error) {
        console.error('Error handling QR code scan:', error);
        showMessage('Error processing QR code: ' + error.message, 'error');
        updateStatus('QR processing failed');
        updateScannerStatus('inactive');
    }
}

// ============ GALLERY UPLOAD ============
function setupGalleryUpload() {
    const uploadInput = document.getElementById('qr-image-upload');
    if (uploadInput) {
        uploadInput.addEventListener('change', handleGalleryUpload);
    }
}

async function handleGalleryUpload(event) {
    try {
        const file = event.target.files[0];
        if (!file) return;
        
        if (!file.type.startsWith('image/')) {
            showMessage('Please select a valid image file.', 'error');
            return;
        }
        
        updateStatus('Processing uploaded image...');
        updateScannerStatus('processing');
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imageData.data, canvas.width, canvas.height);
                
                if (code) {
                    showMessage('QR code detected from image!', 'success');
                    updateStatus('QR code found in image');
                    handleQRCodeScan(code.data);
                } else {
                    showMessage('No QR code found in the image.', 'error');
                    updateStatus('No QR code found');
                    updateScannerStatus('inactive');
                }
            };
            img.src = e.target.result;
        };
        
        reader.readAsDataURL(file);
        event.target.value = '';
    } catch (error) {
        console.error('Error in gallery upload:', error);
        showMessage('Gallery upload failed: ' + error.message, 'error');
    }
}

// ============ USER REGISTRATION ============
function setupFormSubmission() {
    const form = document.getElementById('user-form');
    if (form) {
        form.addEventListener('submit', handleFormSubmission);
    }
}

async function handleFormSubmission(event) {
    event.preventDefault();
    
    try {
        updateStatus('Registering user...');
        
        const formData = new FormData(event.target);
        
        // Get form values matching your HTML field names
        const fullName = formData.get('fullName')?.trim();
        const mobile = formData.get('mobile')?.trim();
        const employeeId = formData.get('employeeId')?.trim();
        const department = formData.get('department')?.trim();
        
        // DEBUG: Log what we're actually getting
        console.log('Form data captured:');
        console.log('fullName:', fullName);
        console.log('mobile:', mobile);
        console.log('employeeId:', employeeId);
        console.log('department:', department);
        
        // Validate each field individually with specific messages
        if (!fullName || fullName.length < 2) {
            showMessage('Please enter a valid full name (at least 2 characters).', 'error');
            return;
        }
        
        if (!mobile || mobile.length < 10) {
            showMessage('Please enter a valid mobile number (at least 10 digits).', 'error');
            return;
        }
        
        if (!employeeId || employeeId.length < 1) {
            showMessage('Please enter a valid employee ID.', 'error');
            return;
        }
        
        if (!department || department.length < 2) {
            showMessage('Please enter a valid department name.', 'error');
            return;
        }
        
        // Create userData object with backend-expected field names
        const userData = {
            action: 'register',
            full_name: fullName,      // Convert fullName to full_name
            mobile_no: mobile,        // Convert mobile to mobile_no
            employee_id: employeeId,  // Convert employeeId to employee_id
            department_name: department, // Convert department to department_name
            // Keep original names for local storage
            fullName: fullName,
            mobile: mobile,
            employeeId: employeeId,
            department: department
        };
        
        console.log('All fields validated, submitting:', userData);
        
        const response = await makeAPIRequest(userData);
        
        if (response.status === 'success') {
            currentUser = userData;
            saveUserToTempStorage(userData);
            
            showMessage('Registration successful!', 'success');
            renderUserInfo(userData);
            hideRegistrationForm();
            
            updateStatus('Registration completed - Ready for attendance');
            await updateStatusCard(userData.employee_id);
            
        } else if (response.status === 'exists') {
            currentUser = userData;
            saveUserToTempStorage(userData);
            
            showMessage('User already registered. Ready for attendance.', 'info');
            renderUserInfo(userData);
            hideRegistrationForm();
            
            await updateStatusCard(userData.employee_id);
            
        } else {
            showMessage(response.message || 'Registration failed', 'error');
        }
        
    } catch (error) {
        console.error('Error in form submission:', error);
        showMessage('Registration failed: ' + error.message, 'error');
    }
}

function showRegistrationForm() {
    if (userFormCard) {
        userFormCard.style.display = 'block';
        enableForm();
        updateStatus('Please fill in your details');
    }
}

function hideRegistrationForm() {
    if (userFormCard) {
        userFormCard.style.display = 'none';
        disableForm();
    }
}

function enableForm() {
    const formElements = document.querySelectorAll('#user-form input, #user-form button');
    formElements.forEach(element => {
        element.disabled = false;
    });
}

function disableForm() {
    const formElements = document.querySelectorAll('#user-form input, #user-form button');
    formElements.forEach(element => {
        element.disabled = true;
    });
}

// ============ ATTENDANCE ACTIONS ============
async function handleAttendanceAction() {
    try {
        if (!currentUser || !currentUser.employee_id) {
            showMessage('User not registered', 'error');
            return;
        }
        
        updateStatus('Checking attendance status...');
        
        // Get current status
        const statusResponse = await makeAPIRequest({
            action: 'status',
            employeeId: currentUser.employee_id
        });
        
        console.log('Status response:', statusResponse);
        
        if (statusResponse.status === 'not_checked_in') {
            await performCheckIn();
        } else if (statusResponse.status === 'checked_in') {
            await performCheckOut();
        } else if (statusResponse.status === 'completed') {
            showMessage('You have already completed attendance for today.', 'info');
            updateStatus('Attendance completed for today');
        } else {
            showMessage('Unable to determine attendance status', 'error');
        }
        
    } catch (error) {
        console.error('Error in attendance action:', error);
        showMessage('Attendance action failed: ' + error.message, 'error');
    }
}

async function performCheckIn() {
    try {
        updateStatus('Processing check-in...');
        
        const response = await makeAPIRequest({
            action: 'check-in',
            employeeId: currentUser.employee_id,
            location: currentLocation
        });
        
        if (response.status === 'success') {
            showMessage(`Check-in successful at ${response.time}`, 'success');
            updateStatus(`Checked in at ${response.time}`);
            await updateStatusCard(currentUser.employee_id);
        } else {
            showMessage(response.message || 'Check-in failed', 'error');
        }
        
    } catch (error) {
        console.error('Error in check-in:', error);
        showMessage('Check-in failed: ' + error.message, 'error');
    }
}

async function performCheckOut() {
    try {
        updateStatus('Processing check-out...');
        
        const response = await makeAPIRequest({
            action: 'check-out',
            employeeId: currentUser.employee_id,
            location: currentLocation
        });
        
        if (response.status === 'success') {
            showMessage(`Check-out successful at ${response.time}`, 'success');
            updateStatus(`Checked out at ${response.time}`);
            await updateStatusCard(currentUser.employee_id);
        } else {
            showMessage(response.message || 'Check-out failed', 'error');
        }
        
    } catch (error) {
        console.error('Error in check-out:', error);
        showMessage('Check-out failed: ' + error.message, 'error');
    }
}

// ============ API COMMUNICATION ============
async function makeAPIRequest(data) {
    try {
        console.log('Making API request:', data);
        
        const response = await fetch(API_BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('API response:', result);
        
        return result;
        
    } catch (error) {
        console.error('API request failed:', error);
        throw new Error('Network request failed: ' + error.message);
    }
}

// ============ LOCATION SERVICES ============
async function requestLocationPermission() {
    try {
        if (!navigator.geolocation) {
            console.warn('Geolocation not supported');
            return;
        }
        
        const position = await getCurrentPosition();
        currentLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
        };
        
        console.log('Location obtained:', currentLocation);
        
    } catch (error) {
        console.warn('Location permission denied or failed:', error);
        currentLocation = null;
    }
}

function getCurrentPosition() {
    return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000
        });
    });
}

// ============ DATA PERSISTENCE ============
function saveUserToTempStorage(userData) {
    try {
        localStorage.setItem('qr_attendance_user', JSON.stringify(userData));
        console.log('User data saved to localStorage');
    } catch (error) {
        console.error('Error saving user data:', error);
    }
}

function loadUserFromTempStorage() {
    try {
        const userData = localStorage.getItem('qr_attendance_user');
        return userData ? JSON.parse(userData) : null;
    } catch (error) {
        console.error('Error loading user data:', error);
        return null;
    }
}

function clearTempStorage() {
    try {
        localStorage.removeItem('qr_attendance_user');
        console.log('User data cleared from localStorage');
    } catch (error) {
        console.error('Error clearing user data:', error);
    }
}

async function checkForExistingUser() {
    const savedUser = loadUserFromTempStorage();
    if (savedUser) {
        currentUser = savedUser;
        console.log('Loaded existing user:', savedUser);
    }
}

function checkTempUserData() {
    if (currentUser) {
        renderUserInfo(currentUser);
        hideRegistrationForm();
    }
}

// ============ UI UPDATES ============
function renderUserInfo(userData) {
    if (!userInfoDisplay) return;
    
    userInfoDisplay.innerHTML = `
        <div class="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
            <h3 class="font-semibold text-gray-800 mb-2">Registered User</h3>
            <div class="space-y-1 text-sm text-gray-600">
                <p><span class="font-medium">Name:</span> ${userData.fullName || userData.full_name}</p>
                <p><span class="font-medium">Employee ID:</span> ${userData.employeeId || userData.employee_id}</p>
                <p><span class="font-medium">Department:</span> ${userData.department || userData.department_name}</p>
                <p><span class="font-medium">Mobile:</span> ${userData.mobile || userData.mobile_no}</p>
            </div>
            <button onclick="clearUserData()" class="mt-3 text-sm text-red-600 hover:text-red-800">
                Clear Registration
            </button>
        </div>
    `;
    userInfoDisplay.style.display = 'block';
}

async function updateStatusCard(employeeId) {
    try {
        const response = await makeAPIRequest({
            action: 'status',
            employeeId: employeeId
        });
        
        const statusCard = document.getElementById('status-card');
        if (!statusCard) return;
        
        let statusHTML = '';
        let cardClass = '';
        
        switch (response.status) {
            case 'not_checked_in':
                statusHTML = `
                    <h3 class="font-semibold text-gray-800">Status: Not Checked In</h3>
                    <p class="text-gray-600 mt-1">Ready to check in for today</p>
                `;
                cardClass = 'border-yellow-500 bg-yellow-50';
                break;
                
            case 'checked_in':
                statusHTML = `
                    <h3 class="font-semibold text-green-800">Status: Checked In</h3>
                    <p class="text-green-600 mt-1">Check-in time: ${response.check_in_time}</p>
                    <p class="text-gray-600 mt-1">Ready to check out</p>
                `;
                cardClass = 'border-green-500 bg-green-50';
                break;
                
            case 'completed':
                statusHTML = `
                    <h3 class="font-semibold text-blue-800">Status: Completed</h3>
                    <p class="text-blue-600 mt-1">Check-in: ${response.check_in_time}</p>
                    <p class="text-blue-600 mt-1">Check-out: ${response.check_out_time}</p>
                    <p class="text-gray-600 mt-1">Attendance completed for today</p>
                `;
                cardClass = 'border-blue-500 bg-blue-50';
                break;
                
            default:
                statusHTML = `
                    <h3 class="font-semibold text-gray-800">Status: Unknown</h3>
                    <p class="text-gray-600 mt-1">Unable to determine status</p>
                `;
                cardClass = 'border-gray-500 bg-gray-50';
        }
        
        statusCard.innerHTML = `
            <div class="border-l-4 p-4 ${cardClass}">
                ${statusHTML}
            </div>
        `;
        statusCard.style.display = 'block';
        
    } catch (error) {
        console.error('Error updating status card:', error);
    }
}

function updateStatus(message) {
    if (statusDisplay) {
        statusDisplay.textContent = message;
    }
    console.log('Status:', message);
}

function updateScannerStatus(status) {
    const scannerStatus = document.getElementById('scanner-status');
    if (!scannerStatus) return;
    
    const statusConfig = {
        'inactive': { text: 'Scanner Inactive', class: 'bg-gray-500' },
        'active': { text: 'Scanner Active', class: 'bg-green-500' },
        'processing': { text: 'Processing...', class: 'bg-blue-500' }
    };
    
    const config = statusConfig[status] || statusConfig['inactive'];
    scannerStatus.textContent = config.text;
    scannerStatus.className = `inline-block px-2 py-1 text-xs text-white rounded ${config.class}`;
}

function showMessage(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    // Create toast notification
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 z-50 max-w-sm p-4 rounded-lg shadow-lg transition-all duration-300 transform translate-x-full`;
    
    const typeConfig = {
        'success': 'bg-green-500 text-white',
        'error': 'bg-red-500 text-white',
        'info': 'bg-blue-500 text-white',
        'warning': 'bg-yellow-500 text-black'
    };
    
    toast.className += ` ${typeConfig[type] || typeConfig['info']}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
    }, 100);
    
    // Animate out and remove
    setTimeout(() => {
        toast.style.transform = 'translateX(full)';
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

// ============ UTILITY FUNCTIONS ============
function clearUserData() {
    currentUser = null;
    clearTempStorage();
    
    if (userInfoDisplay) {
        userInfoDisplay.style.display = 'none';
    }
    
    const statusCard = document.getElementById('status-card');
    if (statusCard) {
        statusCard.style.display = 'none';
    }
    
    showMessage('User data cleared', 'info');
    updateStatus('Ready - Toggle camera or upload QR image');
}

// ============ ERROR HANDLING ============
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    showMessage('An unexpected error occurred', 'error');
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    showMessage('An unexpected error occurred', 'error');
});

// ============ CLEANUP ============
window.addEventListener('beforeunload', () => {
    if (qrScanner) {
        stopQRScanner();
    }
});
