/**
 * Trackify - Settings Module
 * Handles user settings, data management, and PWA installation
 */

// Initialize the DB when loaded
document.addEventListener('DOMContentLoaded', () => {
    initSettingsPage();
});

/**
 * Initialize the settings page
 */
async function initSettingsPage() {
    // Initialize database
    await db.init();
    
    // Load current theme setting
    loadThemeSetting();
    
    // Set up event listeners
    setupSettingsEventListeners();
    
    // Check PWA installation status
    checkPwaInstallation();
}

/**
 * Set up event listeners for settings-specific UI elements
 */
function setupSettingsEventListeners() {
    // Theme toggle
    const themeSwitch = document.getElementById('theme-switch-settings');
    if (themeSwitch) {
        themeSwitch.addEventListener('change', toggleTheme);
    }
    
    // Data export
    const exportBtn = document.getElementById('export-data');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportData);
    }
    
    // Data import
    const importBtn = document.getElementById('import-data');
    if (importBtn) {
        importBtn.addEventListener('click', importData);
    }
    
    // Data reset
    const resetBtn = document.getElementById('reset-data');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => confirmAction('reset-data'));
    }
    
    // Install app
    const installBtn = document.getElementById('install-app-btn');
    if (installBtn) {
        installBtn.addEventListener('click', installPwa);
    }
    
    // Confirmation modal
    const confirmActionBtn = document.getElementById('confirm-action-btn');
    if (confirmActionBtn) {
        confirmActionBtn.addEventListener('click', handleConfirmedAction);
    }
    
    // Connect sidebar toggle and other common elements
    const sidebarToggle = document.getElementById('sidebar-toggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', toggleSidebar);
    }
    
    // Handle theme switch in the sidebar
    const sidebarThemeSwitch = document.getElementById('theme-switch');
    if (sidebarThemeSwitch) {
        sidebarThemeSwitch.addEventListener('change', function() {
            // Sync the settings page theme switch with the sidebar one
            const settingsThemeSwitch = document.getElementById('theme-switch-settings');
            if (settingsThemeSwitch) {
                settingsThemeSwitch.checked = this.checked;
            }
            toggleTheme();
        });
    }
}

/**
 * Load the current theme setting
 */
async function loadThemeSetting() {
    try {
        const darkMode = await db.getSetting('darkMode');
        const themeSwitch = document.getElementById('theme-switch-settings');
        const sidebarThemeSwitch = document.getElementById('theme-switch');
        
        if (themeSwitch) {
            themeSwitch.checked = darkMode === true;
        }
        
        if (sidebarThemeSwitch) {
            sidebarThemeSwitch.checked = darkMode === true;
        }
        
        // Apply the theme to the document
        if (darkMode === true) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
    } catch (error) {
        console.error('Error loading theme setting:', error);
    }
}

/**
 * Toggle between light and dark theme
 */
function toggleTheme() {
    const darkMode = document.body.classList.toggle('dark-mode');
    
    // Sync the theme switches
    const settingsThemeSwitch = document.getElementById('theme-switch-settings');
    const sidebarThemeSwitch = document.getElementById('theme-switch');
    
    if (settingsThemeSwitch) {
        settingsThemeSwitch.checked = darkMode;
    }
    
    if (sidebarThemeSwitch) {
        sidebarThemeSwitch.checked = darkMode;
    }
    
    // Save the theme setting
    db.saveSetting('darkMode', darkMode);
}

/**
 * Toggle sidebar visibility on mobile
 */
function toggleSidebar() {
    document.querySelector('.app-container').classList.toggle('sidebar-collapsed');
}

/**
 * Export all data from the application
 */
async function exportData() {
    try {
        showNotification('Preparing data export...', 'info');
        
        // Collect all data from the database
        const tasks = await db.getTasks();
        const habits = await db.getHabits();
        const timerSessions = await db.getTimerSessions();
        const courses = await db.getCourses();
        const topics = await db.getTopics();
        const materials = await db.getMaterials();
        
        // Collect settings
        const darkMode = await db.getSetting('darkMode');
        const pomodoroSettings = await db.getSetting('pomodoroSettings');
        const flowmodoroSettings = await db.getSetting('flowmodoroSettings');
        
        // Create a data object with all collections
        const exportData = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            data: {
                tasks,
                habits,
                timerSessions,
                courses,
                topics,
                materials
            },
            settings: {
                darkMode,
                pomodoroSettings,
                flowmodoroSettings
            }
        };
        
        // Convert to JSON and create a downloadable blob
        const jsonData = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        // Create download link
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = `trackify-export-${new Date().toISOString().split('T')[0]}.json`;
        
        // Trigger download
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
        showNotification('Data exported successfully!', 'success');
    } catch (error) {
        console.error('Error exporting data:', error);
        showNotification('Failed to export data. Please try again.', 'error');
    }
}

/**
 * Import data from a file
 */
async function importData() {
    try {
        const fileInput = document.getElementById('import-file');
        
        if (!fileInput.files || fileInput.files.length === 0) {
            showNotification('Please select a file to import', 'warning');
            return;
        }
        
        const file = fileInput.files[0];
        
        if (file.type !== 'application/json') {
            showNotification('Please select a valid JSON file', 'warning');
            return;
        }
        
        showNotification('Importing data...', 'info');
        
        // Read the file
        const reader = new FileReader();
        
        reader.onload = async (e) => {
            try {
                const importData = JSON.parse(e.target.result);
                
                // Validate import data format
                if (!importData.version || !importData.data) {
                    throw new Error('Invalid import file format');
                }
                
                // Show confirmation dialog
                confirmAction('import-data', importData);
            } catch (error) {
                console.error('Error parsing import file:', error);
                showNotification('Invalid import file format', 'error');
            }
        };
        
        reader.readAsText(file);
    } catch (error) {
        console.error('Error importing data:', error);
        showNotification('Failed to import data. Please try again.', 'error');
    }
}

/**
 * Process imported data
 * @param {Object} importData - The data to import
 */
async function processImportData(importData) {
    try {
        showNotification('Processing import data...', 'info');
        
        // Import tasks
        if (importData.data.tasks && Array.isArray(importData.data.tasks)) {
            await db.clearStore('tasks');
            for (const task of importData.data.tasks) {
                await db.addTask(task);
            }
        }
        
        // Import habits
        if (importData.data.habits && Array.isArray(importData.data.habits)) {
            await db.clearStore('habits');
            for (const habit of importData.data.habits) {
                await db.addHabit(habit);
            }
        }
        
        // Import timer sessions
        if (importData.data.timerSessions && Array.isArray(importData.data.timerSessions)) {
            await db.clearStore('timerSessions');
            for (const session of importData.data.timerSessions) {
                await db.addTimerSession(session);
            }
        }
        
        // Import courses
        if (importData.data.courses && Array.isArray(importData.data.courses)) {
            await db.clearStore('courses');
            for (const course of importData.data.courses) {
                await db.addCourse(course);
            }
        }
        
        // Import topics
        if (importData.data.topics && Array.isArray(importData.data.topics)) {
            await db.clearStore('topics');
            for (const topic of importData.data.topics) {
                await db.addTopic(topic);
            }
        }
        
        // Import materials
        if (importData.data.materials && Array.isArray(importData.data.materials)) {
            await db.clearStore('materials');
            for (const material of importData.data.materials) {
                await db.addMaterial(material);
            }
        }
        
        // Import settings
        if (importData.settings) {
            if (importData.settings.darkMode !== undefined) {
                await db.saveSetting('darkMode', importData.settings.darkMode);
            }
            
            if (importData.settings.pomodoroSettings) {
                await db.saveSetting('pomodoroSettings', importData.settings.pomodoroSettings);
            }
            
            if (importData.settings.flowmodoroSettings) {
                await db.saveSetting('flowmodoroSettings', importData.settings.flowmodoroSettings);
            }
        }
        
        // Reload theme setting
        loadThemeSetting();
        
        showNotification('Data imported successfully!', 'success');
        
        // Clear the file input
        const fileInput = document.getElementById('import-file');
        if (fileInput) {
            fileInput.value = '';
        }
        
        // Refresh page after 2 seconds to reflect changes
        setTimeout(() => {
            window.location.reload();
        }, 2000);
    } catch (error) {
        console.error('Error processing import data:', error);
        showNotification('Failed to import data. Please try again.', 'error');
    }
}

/**
 * Reset all application data
 */
async function resetAllData() {
    try {
        showNotification('Resetting all data...', 'info');
        
        // Clear all stores
        await db.clearStore('tasks');
        await db.clearStore('habits');
        await db.clearStore('timerSessions');
        await db.clearStore('courses');
        await db.clearStore('topics');
        await db.clearStore('materials');
        
        // Keep settings
        showNotification('All data has been reset', 'success');
        
        // Refresh page after 2 seconds to reflect changes
        setTimeout(() => {
            window.location.reload();
        }, 2000);
    } catch (error) {
        console.error('Error resetting data:', error);
        showNotification('Failed to reset data. Please try again.', 'error');
    }
}

/**
 * Show a confirmation dialog for destructive actions
 * @param {string} action - The action to confirm
 * @param {Object} data - Additional data needed for the action
 */
function confirmAction(action, data = null) {
    const modal = new bootstrap.Modal(document.getElementById('confirmation-modal'));
    const modalBody = document.getElementById('confirmation-modal-body');
    const confirmBtn = document.getElementById('confirm-action-btn');
    
    // Set the current action and data
    confirmBtn.dataset.action = action;
    
    if (data) {
        confirmBtn.dataset.data = JSON.stringify(data);
    } else {
        delete confirmBtn.dataset.data;
    }
    
    // Set the confirmation message based on the action
    switch (action) {
        case 'reset-data':
            modalBody.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle"></i> Warning!
                </div>
                <p>You are about to reset all application data. This will delete all your tasks, habits, timer sessions, courses, and other data.</p>
                <p><strong>This action cannot be undone.</strong></p>
                <p>Do you want to proceed?</p>
            `;
            break;
        case 'import-data':
            const importData = data;
            modalBody.innerHTML = `
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle"></i> Warning!
                </div>
                <p>Importing data will replace all your current data with the imported data.</p>
                <p>Import details:</p>
                <ul>
                    <li>Tasks: ${importData.data.tasks ? importData.data.tasks.length : 0}</li>
                    <li>Habits: ${importData.data.habits ? importData.data.habits.length : 0}</li>
                    <li>Timer Sessions: ${importData.data.timerSessions ? importData.data.timerSessions.length : 0}</li>
                    <li>Courses: ${importData.data.courses ? importData.data.courses.length : 0}</li>
                    <li>Topics: ${importData.data.topics ? importData.data.topics.length : 0}</li>
                    <li>Materials: ${importData.data.materials ? importData.data.materials.length : 0}</li>
                </ul>
                <p>Export date: ${new Date(importData.exportDate).toLocaleString()}</p>
                <p>Do you want to proceed?</p>
            `;
            break;
        default:
            modalBody.textContent = 'Are you sure you want to proceed with this action?';
    }
    
    modal.show();
}

/**
 * Handle the confirmed action
 */
function handleConfirmedAction() {
    const confirmBtn = document.getElementById('confirm-action-btn');
    const action = confirmBtn.dataset.action;
    
    // Close the modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('confirmation-modal'));
    modal.hide();
    
    // Execute the action
    switch (action) {
        case 'reset-data':
            resetAllData();
            break;
        case 'import-data':
            const importData = JSON.parse(confirmBtn.dataset.data);
            processImportData(importData);
            break;
    }
}

/**
 * Check if the app can be installed as a PWA
 */
function checkPwaInstallation() {
    const installButton = document.getElementById('install-app-btn');
    const statusElement = document.getElementById('pwa-status');
    
    if (!installButton || !statusElement) return;
    
    // Initially disable the button
    installButton.disabled = true;
    
    // Check if the app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
        statusElement.textContent = 'App is already installed';
        installButton.disabled = true;
        return;
    }
    
    // Check if installation is available
    if (window.deferredPrompt) {
        statusElement.textContent = 'App can be installed on your device';
        installButton.disabled = false;
    } else {
        // Wait for the beforeinstallprompt event
        window.addEventListener('beforeinstallprompt', (e) => {
            // Prevent Chrome 67 and earlier from automatically showing the prompt
            e.preventDefault();
            // Stash the event so it can be triggered later
            window.deferredPrompt = e;
            
            statusElement.textContent = 'App can be installed on your device';
            installButton.disabled = false;
        });
        
        statusElement.textContent = 'Installation not available in this browser or already installed';
    }
    
    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
        statusElement.textContent = 'App successfully installed';
        installButton.disabled = true;
        window.deferredPrompt = null;
    });
}

/**
 * Install the PWA
 */
function installPwa() {
    const statusElement = document.getElementById('pwa-status');
    
    if (!window.deferredPrompt) {
        if (statusElement) {
            statusElement.textContent = 'Installation not available or already installed';
        }
        return;
    }
    
    // Show the installation prompt
    window.deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    window.deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
            if (statusElement) {
                statusElement.textContent = 'App installation started';
            }
        } else {
            if (statusElement) {
                statusElement.textContent = 'App installation canceled';
            }
        }
        
        // Clear the deferred prompt variable
        window.deferredPrompt = null;
    });
}

/**
 * Show a notification to the user
 * @param {string} message - The message to display
 * @param {string} type - The type of notification: 'success', 'error', 'warning', 'info'
 * @param {number} duration - Duration in milliseconds
 */
function showNotification(message, type = 'info', duration = 3000) {
    // Find existing notifications container or create it
    let notificationsContainer = document.querySelector('.notifications-container');
    
    if (!notificationsContainer) {
        notificationsContainer = document.createElement('div');
        notificationsContainer.className = 'notifications-container';
        document.body.appendChild(notificationsContainer);
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    // Add icon based on type
    const icon = getIconForType(type);
    
    // Set notification content
    notification.innerHTML = `
        <div class="notification-icon">
            <i class="${icon}"></i>
        </div>
        <div class="notification-content">
            <p>${escapeHTML(message)}</p>
        </div>
        <button class="notification-close">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Add to container
    notificationsContainer.appendChild(notification);
    
    // Setup close button
    notification.querySelector('.notification-close').addEventListener('click', () => {
        closeNotification(notification);
    });
    
    // Automatically close after duration
    setTimeout(() => {
        closeNotification(notification);
    }, duration);
    
    // Animate in
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
}

/**
 * Close a notification
 * @param {HTMLElement} notification - The notification element to close
 */
function closeNotification(notification) {
    notification.classList.remove('show');
    
    // Remove from DOM after animation completes
    setTimeout(() => {
        if (notification.parentElement) {
            notification.parentElement.removeChild(notification);
        }
    }, 300);
}

/**
 * Get the appropriate icon for notification type
 * @param {string} type - The notification type
 * @returns {string} - The icon class
 */
function getIconForType(type) {
    switch (type) {
        case 'success':
            return 'fas fa-check-circle';
        case 'error':
            return 'fas fa-exclamation-circle';
        case 'warning':
            return 'fas fa-exclamation-triangle';
        case 'info':
        default:
            return 'fas fa-info-circle';
    }
}

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text
 */
function escapeHTML(text) {
    const element = document.createElement('div');
    element.textContent = text;
    return element.innerHTML;
}