/**
 * Trackify - Main Application JavaScript
 * Handles global functionality and UI interactions
 */

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the application
    initApp();

    // Set up event listeners for UI interactions
    setupEventListeners();

    // Update counters on dashboard
    updateDashboardCounters();
});

/**
 * Initialize the application
 */
function initApp() {
    console.log('Initializing Trackify application...');
    
    // Check for theme preference in localStorage
    const isDarkTheme = localStorage.getItem('darkTheme') === 'true';
    if (isDarkTheme) {
        document.body.classList.add('dark-theme');
        document.getElementById('theme-switch').checked = true;
    }

    // Initialize components that should be available on all pages
    initializeSidebar();
    
    // Check for PWA installation capability
    checkPwaInstallation();
}

/**
 * Set up event listeners for UI elements
 */
function setupEventListeners() {
    // Theme toggle switch
    const themeSwitch = document.getElementById('theme-switch');
    if (themeSwitch) {
        themeSwitch.addEventListener('change', toggleTheme);
    }
    
    // Sidebar toggle on mobile
    const sidebarToggle = document.getElementById('sidebar-toggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', toggleSidebar);
    }

    // PWA install button
    const installButton = document.getElementById('install-button');
    if (installButton) {
        installButton.addEventListener('click', installPwa);
    }
}

/**
 * Initialize sidebar functionality
 */
function initializeSidebar() {
    // Add active class to current page in sidebar
    const currentPath = window.location.pathname;
    const sidebarLinks = document.querySelectorAll('.sidebar-nav a');
    
    sidebarLinks.forEach(link => {
        if (link.getAttribute('href') === currentPath) {
            link.parentElement.classList.add('active');
        }
    });
}

/**
 * Toggle between light and dark theme
 */
function toggleTheme() {
    const isDarkTheme = document.body.classList.toggle('dark-theme');
    localStorage.setItem('darkTheme', isDarkTheme);
}

/**
 * Toggle sidebar visibility on mobile
 */
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    sidebar.classList.toggle('show');
}

/**
 * Update dashboard counters from stored data
 */
function updateDashboardCounters() {
    if (window.location.pathname === '/') {
        // Get counts from IndexedDB
        Promise.all([
            getTotalCompletedTasks(),
            getCurrentStreak(),
            getTotalFocusHours(),
            getActiveCourses()
        ]).then(([completedTasks, currentStreak, focusHours, activeCourses]) => {
            // Update the UI
            updateCounter('completed-tasks-count', completedTasks);
            updateCounter('current-streak', currentStreak);
            updateCounter('focus-hours', focusHours);
            updateCounter('courses-count', activeCourses);
        }).catch(error => {
            console.error('Error updating dashboard counters:', error);
        });
    }
}

/**
 * Update a counter element with new value
 * @param {string} elementId - The ID of the element to update
 * @param {number} value - The new value
 */
function updateCounter(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value;
    }
}

/**
 * Get total completed tasks
 * @returns {Promise<number>} - Promise resolving to count of completed tasks
 */
async function getTotalCompletedTasks() {
    try {
        const tasks = await db.getTasks();
        return tasks.filter(task => task.completed).length;
    } catch (error) {
        console.error('Error getting completed tasks:', error);
        return 0;
    }
}

/**
 * Get current streak from habits
 * @returns {Promise<number>} - Promise resolving to current streak
 */
async function getCurrentStreak() {
    try {
        const habits = await db.getHabits();
        if (habits.length === 0) return 0;
        
        // Get the longest current streak
        let longestStreak = 0;
        
        habits.forEach(habit => {
            if (habit.currentStreak > longestStreak) {
                longestStreak = habit.currentStreak;
            }
        });
        
        return longestStreak;
    } catch (error) {
        console.error('Error getting current streak:', error);
        return 0;
    }
}

/**
 * Get total focus hours
 * @returns {Promise<number>} - Promise resolving to total focus hours
 */
async function getTotalFocusHours() {
    try {
        const sessions = await db.getTimerSessions();
        const totalMinutes = sessions.reduce((total, session) => total + session.duration, 0);
        return Math.round(totalMinutes / 60);
    } catch (error) {
        console.error('Error getting focus hours:', error);
        return 0;
    }
}

/**
 * Get count of active courses
 * @returns {Promise<number>} - Promise resolving to count of active courses
 */
async function getActiveCourses() {
    try {
        const courses = await db.getCourses();
        return courses.filter(course => course.status === 'in-progress').length;
    } catch (error) {
        console.error('Error getting active courses:', error);
        return 0;
    }
}

/**
 * Check if the app can be installed as a PWA
 */
let deferredPrompt;
function checkPwaInstallation() {
    const installButton = document.getElementById('install-button');
    
    // Hide the install button by default
    if (installButton) {
        installButton.style.display = 'none';
    }
    
    // Listen for the beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent Chrome 67 and earlier from automatically showing the prompt
        e.preventDefault();
        
        // Stash the event so it can be triggered later
        deferredPrompt = e;
        
        // Show the install button
        if (installButton) {
            installButton.style.display = 'inline-flex';
        }
    });
    
    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
        // Log the installation to analytics
        console.log('PWA was installed');
        
        // Hide the install button
        if (installButton) {
            installButton.style.display = 'none';
        }
    });
}

/**
 * Install the PWA
 */
function installPwa() {
    if (!deferredPrompt) {
        console.log('Cannot install: The app is already installed or not installable');
        return;
    }
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
            console.log('User accepted the install prompt');
        } else {
            console.log('User dismissed the install prompt');
        }
        
        // Clear the deferredPrompt variable
        deferredPrompt = null;
    });
}

/**
 * Format date for display
 * @param {Date|string} date - Date to format
 * @param {string} format - Format type: 'short', 'medium', 'long'
 * @returns {string} - Formatted date string
 */
function formatDate(date, format = 'medium') {
    if (!date) return '';
    
    const dateObj = new Date(date);
    
    const options = {
        short: { month: 'numeric', day: 'numeric' },
        medium: { month: 'short', day: 'numeric', year: 'numeric' },
        long: { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' },
        time: { hour: '2-digit', minute: '2-digit' },
        datetime: { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    };
    
    return dateObj.toLocaleDateString('en-US', options[format] || options.medium);
}

/**
 * Generate a unique ID
 * @returns {string} - A unique ID
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

/**
 * Show a notification to the user
 * @param {string} message - The message to display
 * @param {string} type - The type of notification: 'success', 'error', 'warning', 'info'
 * @param {number} duration - Duration in milliseconds
 */
function showNotification(message, type = 'info', duration = 3000) {
    // Create notification container if it doesn't exist
    let container = document.querySelector('.notification-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'notification-container';
        document.body.appendChild(container);
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="notification-icon fas ${getIconForType(type)}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Add to container
    container.appendChild(notification);
    
    // Add animation
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Set up close functionality
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        closeNotification(notification);
    });
    
    // Auto-close after duration
    setTimeout(() => {
        closeNotification(notification);
    }, duration);
}

/**
 * Close a notification
 * @param {HTMLElement} notification - The notification element to close
 */
function closeNotification(notification) {
    notification.classList.remove('show');
    notification.classList.add('hide');
    
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
        case 'success': return 'fa-check-circle';
        case 'error': return 'fa-exclamation-circle';
        case 'warning': return 'fa-exclamation-triangle';
        case 'info': return 'fa-info-circle';
        default: return 'fa-info-circle';
    }
}

/**
 * Create stylized notification container - append once to document
 */
(() => {
    const style = document.createElement('style');
    style.textContent = `
        .notification-container {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 1000;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        
        .notification {
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            padding: 15px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            min-width: 300px;
            max-width: 450px;
            transform: translateX(120%);
            transition: transform 0.3s ease;
        }
        
        .notification.show {
            transform: translateX(0);
        }
        
        .notification.hide {
            transform: translateX(120%);
        }
        
        .notification-content {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .notification-icon {
            font-size: 20px;
        }
        
        .notification-success .notification-icon {
            color: #00c853;
        }
        
        .notification-error .notification-icon {
            color: #ff1744;
        }
        
        .notification-warning .notification-icon {
            color: #ffd600;
        }
        
        .notification-info .notification-icon {
            color: #2196f3;
        }
        
        .notification-close {
            background: none;
            border: none;
            color: #757575;
            cursor: pointer;
            padding: 5px;
            font-size: 14px;
        }
        
        .notification-close:hover {
            color: #333;
        }
        
        body.dark-theme .notification {
            background-color: #333;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
            color: #fff;
        }
        
        body.dark-theme .notification-close {
            color: #bbb;
        }
        
        body.dark-theme .notification-close:hover {
            color: #fff;
        }
    `;
    document.head.appendChild(style);
})();
