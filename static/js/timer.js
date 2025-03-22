/**
 * Trackify - Timer Module
 * Handles Pomodoro and Flowmodoro timer functionality
 */

// Timer state variables
let timerType = 'pomodoro'; // 'pomodoro' or 'flowmodoro'
let timerState = 'stopped'; // 'running', 'paused', 'stopped'
let timerInterval = null;
let startTime = null;
let elapsedTime = 0;
let pausedTime = 0;
let currentSession = 1;
let timerMode = 'focus'; // 'focus', 'shortBreak', 'longBreak'
let isFullscreen = false; // Fullscreen state

// Pomodoro settings
let pomodoroSettings = {
    focusDuration: 25 * 60, // 25 minutes in seconds
    shortBreakDuration: 5 * 60, // 5 minutes in seconds
    longBreakDuration: 15 * 60, // 15 minutes in seconds
    sessionsBeforeLongBreak: 4,
    autoStartBreaks: false,
    notifySound: true
};

// Flowmodoro settings
let flowmodoroSettings = {
    breakRatio: 5, // 1:5 ratio (5 seconds break for each minute worked)
    minimumFlowTime: 10 * 60, // 10 minutes in seconds
    maximumFlowTime: 90 * 60, // 90 minutes in seconds
    notifySound: true
};

// Audio for notifications
let notificationSound = null;

// Task selection
let selectedTaskId = null;

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    initTimerPage();
});

/**
 * Initialize the timer page
 */
async function initTimerPage() {
    // Initialize notification sound
    notificationSound = new Audio('data:audio/wav;base64,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');
    
    // Load settings from database
    await loadSettings();
    
    // Load tasks for selection
    await loadTasks();
    
    // Set up event listeners for timer-specific UI elements
    setupTimerEventListeners();
    
    // Initialize timer display
    updateTimerDisplay();
    
    // Initialize timer sessions
    loadTimerHistory();
}

/**
 * Load timer settings from database
 */
async function loadSettings() {
    try {
        // Load Pomodoro settings
        const savedPomodoroSettings = await db.getSetting('pomodoroSettings');
        if (savedPomodoroSettings) {
            pomodoroSettings = { ...pomodoroSettings, ...savedPomodoroSettings };
        }
        
        // Load Flowmodoro settings
        const savedFlowmodoroSettings = await db.getSetting('flowmodoroSettings');
        if (savedFlowmodoroSettings) {
            flowmodoroSettings = { ...flowmodoroSettings, ...savedFlowmodoroSettings };
        }
        
        // Update settings form values
        updateSettingsForm();
    } catch (error) {
        console.error('Error loading timer settings:', error);
    }
}

/**
 * Update settings form with current values
 */
function updateSettingsForm() {
    // Pomodoro settings
    document.getElementById('focus-duration').value = pomodoroSettings.focusDuration / 60;
    document.getElementById('short-break-duration').value = pomodoroSettings.shortBreakDuration / 60;
    document.getElementById('long-break-duration').value = pomodoroSettings.longBreakDuration / 60;
    document.getElementById('sessions-before-long-break').value = pomodoroSettings.sessionsBeforeLongBreak;
    document.getElementById('auto-start-breaks').checked = pomodoroSettings.autoStartBreaks;
    document.getElementById('notify-sound').checked = pomodoroSettings.notifySound;
    
    // Flowmodoro settings
    document.getElementById('break-ratio').value = flowmodoroSettings.breakRatio;
    document.getElementById('minimum-flow-time').value = flowmodoroSettings.minimumFlowTime / 60;
    
    // Check if maximum flow time input exists
    const maxFlowElement = document.getElementById('maximum-flow-time');
    if (maxFlowElement) {
        maxFlowElement.value = flowmodoroSettings.maximumFlowTime / 60;
    }
    
    document.getElementById('notify-sound-flow').checked = flowmodoroSettings.notifySound;
}

/**
 * Load tasks for selection
 */
async function loadTasks() {
    try {
        const tasks = await db.getTasks();
        const taskSelect = document.getElementById('timer-task-select');
        
        if (taskSelect) {
            // Clear all options except the default one
            while (taskSelect.options.length > 1) {
                taskSelect.remove(1);
            }
            
            // Add incomplete tasks
            const incompleteTasks = tasks.filter(task => !task.completed);
            
            incompleteTasks.forEach(task => {
                const option = document.createElement('option');
                option.value = task.id;
                option.textContent = task.title;
                taskSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading tasks:', error);
    }
}

/**
 * Set up event listeners for timer-specific UI elements
 */
function setupTimerEventListeners() {
    // Timer type buttons
    const timerOptions = document.querySelectorAll('.btn-timer-option');
    timerOptions.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons
            timerOptions.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            button.classList.add('active');
            
            // Set timer type
            timerType = button.getAttribute('data-timer-type');
            
            // Show corresponding timer section
            document.getElementById('pomodoro-section').style.display = timerType === 'pomodoro' ? 'block' : 'none';
            document.getElementById('flowmodoro-section').style.display = timerType === 'flowmodoro' ? 'block' : 'none';
            
            // Reset timer if it's running
            if (timerState !== 'stopped') {
                resetTimer();
            }
        });
    });
    
    // Pomodoro controls
    document.getElementById('pomodoro-start').addEventListener('click', startPomodoroTimer);
    document.getElementById('pomodoro-pause').addEventListener('click', pauseTimer);
    document.getElementById('pomodoro-reset').addEventListener('click', resetTimer);
    document.getElementById('pomodoro-fullscreen').addEventListener('click', () => enterFullscreenMode('pomodoro'));
    
    // Flowmodoro controls
    document.getElementById('flowmodoro-start').addEventListener('click', startFlowmodoroTimer);
    document.getElementById('flowmodoro-pause').addEventListener('click', pauseTimer);
    document.getElementById('flowmodoro-break').addEventListener('click', takeFlowmodoroBreak);
    document.getElementById('flowmodoro-reset').addEventListener('click', resetTimer);
    document.getElementById('flowmodoro-fullscreen').addEventListener('click', () => enterFullscreenMode('flowmodoro'));
    
    // Fullscreen controls
    document.getElementById('exit-fullscreen').addEventListener('click', exitFullscreenMode);
    document.getElementById('fullscreen-pause').addEventListener('click', pauseTimer);
    document.getElementById('fullscreen-reset').addEventListener('click', resetTimer);
    
    // Settings buttons
    document.getElementById('pomodoro-settings-btn').addEventListener('click', openPomodoroSettings);
    document.getElementById('flowmodoro-settings-btn').addEventListener('click', openFlowmodoroSettings);
    
    // Settings save buttons
    document.getElementById('save-pomodoro-settings').addEventListener('click', savePomodoroSettings);
    document.getElementById('save-flowmodoro-settings').addEventListener('click', saveFlowmodoroSettings);
    
    // Task selection
    document.getElementById('timer-task-select').addEventListener('change', function() {
        selectedTaskId = this.value;
    });
}

/**
 * Start Pomodoro timer
 */
function startPomodoroTimer() {
    if (timerState === 'running') return;
    
    // Update UI
    document.getElementById('pomodoro-start').disabled = true;
    document.getElementById('pomodoro-pause').disabled = false;
    
    // Update fullscreen UI if active
    if (isFullscreen) {
        document.getElementById('fullscreen-pause').disabled = false;
    }
    
    // Set timer state
    timerState = 'running';
    
    // Calculate end time based on current mode
    let duration;
    if (timerMode === 'focus') {
        duration = pomodoroSettings.focusDuration;
        document.getElementById('pomodoro-label').textContent = 'Focus';
    } else if (timerMode === 'shortBreak') {
        duration = pomodoroSettings.shortBreakDuration;
        document.getElementById('pomodoro-label').textContent = 'Short Break';
    } else {
        duration = pomodoroSettings.longBreakDuration;
        document.getElementById('pomodoro-label').textContent = 'Long Break';
    }
    
    // If timer was paused, use remaining time
    if (pausedTime > 0) {
        duration = pausedTime;
        pausedTime = 0;
    } else {
        // Record start time for new session
        startTime = new Date();
    }
    
    // Start countdown
    const endTime = new Date().getTime() + duration * 1000;
    
    timerInterval = setInterval(() => {
        const currentTime = new Date().getTime();
        const remaining = endTime - currentTime;
        
        if (remaining <= 0) {
            // Timer completed
            clearInterval(timerInterval);
            completePomodoroCycle();
        } else {
            // Update timer display
            elapsedTime = duration - Math.ceil(remaining / 1000);
            updatePomodoroDisplay(Math.ceil(remaining / 1000));
        }
    }, 100);
}

/**
 * Start Flowmodoro timer
 */
function startFlowmodoroTimer() {
    if (timerState === 'running') return;
    
    // Update UI
    document.getElementById('flowmodoro-start').disabled = true;
    document.getElementById('flowmodoro-pause').disabled = false;
    document.getElementById('flowmodoro-break').disabled = false;
    
    // Update fullscreen UI if active
    if (isFullscreen) {
        document.getElementById('fullscreen-pause').disabled = false;
    }
    
    // Set timer state
    timerState = 'running';
    timerMode = 'flow';
    document.getElementById('flowmodoro-label').textContent = 'Flow';
    
    // Record start time
    if (elapsedTime === 0) {
        startTime = new Date();
    }
    
    // Start count-up timer
    timerInterval = setInterval(() => {
        if (timerState === 'running') {
            elapsedTime++;
            updateFlowmodoroDisplay(elapsedTime);
            
            // Check if maximum flow time is reached
            if (elapsedTime >= flowmodoroSettings.maximumFlowTime) {
                // Notify user to take a break
                if (flowmodoroSettings.notifySound) {
                    playNotificationSound();
                }
                showNotification('You\'ve been in flow for a while. Consider taking a break!', 'info');
            }
        }
    }, 1000);
}

/**
 * Pause the timer
 */
function pauseTimer() {
    if (timerState !== 'running') return;
    
    // Clear interval
    clearInterval(timerInterval);
    
    // Set timer state
    timerState = 'paused';
    
    // Store paused time for Pomodoro
    if (timerType === 'pomodoro') {
        const timeElement = document.getElementById('pomodoro-time').textContent;
        const [minutes, seconds] = timeElement.split(':').map(num => parseInt(num, 10));
        pausedTime = minutes * 60 + seconds;
        
        // Update UI
        document.getElementById('pomodoro-start').disabled = false;
        document.getElementById('pomodoro-pause').disabled = true;
    } else {
        // Update UI for Flowmodoro
        document.getElementById('flowmodoro-start').disabled = false;
        document.getElementById('flowmodoro-pause').disabled = true;
    }
    
    // Update fullscreen UI if active
    if (isFullscreen) {
        document.getElementById('fullscreen-pause').disabled = true;
    }
}

/**
 * Reset the timer
 */
function resetTimer() {
    // Clear interval
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    
    // Reset timer state
    timerState = 'stopped';
    elapsedTime = 0;
    pausedTime = 0;
    
    // Reset UI
    if (timerType === 'pomodoro') {
        timerMode = 'focus';
        updatePomodoroDisplay(pomodoroSettings.focusDuration);
        document.getElementById('pomodoro-label').textContent = 'Focus';
        document.getElementById('pomodoro-start').disabled = false;
        document.getElementById('pomodoro-pause').disabled = true;
    } else {
        updateFlowmodoroDisplay(0);
        document.getElementById('flowmodoro-label').textContent = 'Flow';
        document.getElementById('flowmodoro-start').disabled = false;
        document.getElementById('flowmodoro-pause').disabled = true;
        document.getElementById('flowmodoro-break').disabled = true;
    }
    
    // Update fullscreen UI if active
    if (isFullscreen) {
        document.getElementById('fullscreen-pause').disabled = true;
        
        // Update fullscreen display based on current timer type
        if (timerType === 'pomodoro') {
            document.getElementById('fullscreen-time').textContent = formatTime(pomodoroSettings.focusDuration);
            document.getElementById('fullscreen-label').textContent = 'Focus';
            document.getElementById('fullscreen-progress').style.background = 'conic-gradient(var(--primary-color) 0deg, rgba(255, 255, 255, 0.1) 0deg)';
        } else {
            document.getElementById('fullscreen-time').textContent = '00:00';
            document.getElementById('fullscreen-label').textContent = 'Flow';
            document.getElementById('fullscreen-progress').style.background = 'conic-gradient(var(--primary-color) 0deg, rgba(255, 255, 255, 0.1) 0deg)';
        }
    }
}

/**
 * Complete a Pomodoro cycle
 */
function completePomodoroCycle() {
    // Play notification sound if enabled
    if (pomodoroSettings.notifySound) {
        playNotificationSound();
    }
    
    // Reset timer state
    timerState = 'stopped';
    
    // Update UI
    document.getElementById('pomodoro-start').disabled = false;
    document.getElementById('pomodoro-pause').disabled = true;
    
    if (timerMode === 'focus') {
        // Record completed focus session
        saveTimerSession(pomodoroSettings.focusDuration);
        
        // Update session indicators
        updateSessionIndicators();
        
        // Check if it's time for a long break
        if (currentSession % pomodoroSettings.sessionsBeforeLongBreak === 0) {
            timerMode = 'longBreak';
            updatePomodoroDisplay(pomodoroSettings.longBreakDuration);
            document.getElementById('pomodoro-label').textContent = 'Long Break';
            showNotification('Focus session complete! Time for a long break.', 'success');
        } else {
            timerMode = 'shortBreak';
            updatePomodoroDisplay(pomodoroSettings.shortBreakDuration);
            document.getElementById('pomodoro-label').textContent = 'Short Break';
            showNotification('Focus session complete! Time for a short break.', 'success');
        }
        
        // Auto-start break if enabled
        if (pomodoroSettings.autoStartBreaks) {
            startPomodoroTimer();
        }
    } else {
        // Break is complete, prepare for next focus session
        timerMode = 'focus';
        updatePomodoroDisplay(pomodoroSettings.focusDuration);
        document.getElementById('pomodoro-label').textContent = 'Focus';
        
        // Increment session count if coming from a long break
        if (timerMode === 'longBreak') {
            currentSession++;
        }
        
        showNotification('Break complete! Ready for the next focus session?', 'success');
    }
}

/**
 * Take a Flowmodoro break
 */
function takeFlowmodoroBreak() {
    // Only allow breaks after minimum flow time
    if (elapsedTime < flowmodoroSettings.minimumFlowTime) {
        showNotification(`You need to be in flow for at least ${flowmodoroSettings.minimumFlowTime / 60} minutes before taking a break.`, 'warning');
        return;
    }
    
    // Stop the timer
    clearInterval(timerInterval);
    
    // Calculate break duration based on flow time
    const breakDuration = Math.floor(elapsedTime / 60) * flowmodoroSettings.breakRatio;
    
    // Save the flow session
    saveTimerSession(elapsedTime);
    
    // Reset for break
    timerState = 'break';
    timerMode = 'break';
    
    // Update UI
    document.getElementById('flowmodoro-time').textContent = formatTime(breakDuration);
    document.getElementById('flowmodoro-label').textContent = 'Break';
    document.getElementById('flowmodoro-start').disabled = true;
    document.getElementById('flowmodoro-pause').disabled = true;
    document.getElementById('flowmodoro-break').disabled = true;
    
    // Update fullscreen UI if active
    if (isFullscreen && timerType === 'flowmodoro') {
        document.getElementById('fullscreen-time').textContent = formatTime(breakDuration);
        document.getElementById('fullscreen-label').textContent = 'Break';
        document.getElementById('fullscreen-pause').disabled = true;
    }
    
    // Show notification
    showNotification(`Great flow session! Take a ${breakDuration} second break.`, 'success');
    
    // Play notification sound if enabled
    if (flowmodoroSettings.notifySound) {
        playNotificationSound();
    }
    
    // Start break countdown
    let breakTimeRemaining = breakDuration;
    
    const breakInterval = setInterval(() => {
        breakTimeRemaining--;
        document.getElementById('flowmodoro-time').textContent = formatTime(breakTimeRemaining);
        
        // Update progress circle
        updateFlowmodoroProgress(1 - (breakTimeRemaining / breakDuration));
        
        if (breakTimeRemaining <= 0) {
            // Break is over
            clearInterval(breakInterval);
            
            // Reset for next flow session
            timerState = 'stopped';
            timerMode = 'flow';
            elapsedTime = 0;
            
            // Update UI
            updateFlowmodoroDisplay(0);
            document.getElementById('flowmodoro-label').textContent = 'Flow';
            document.getElementById('flowmodoro-start').disabled = false;
            document.getElementById('flowmodoro-break').disabled = true;
            
            // Play notification sound if enabled
            if (flowmodoroSettings.notifySound) {
                playNotificationSound();
            }
            
            showNotification('Break is over! Ready for another flow session?', 'info');
        }
    }, 1000);
}

/**
 * Update Pomodoro timer display
 * @param {number} remainingSeconds - Seconds remaining in the timer
 */
function updatePomodoroDisplay(remainingSeconds) {
    const timeDisplay = document.getElementById('pomodoro-time');
    if (timeDisplay) {
        timeDisplay.textContent = formatTime(remainingSeconds);
    }
    
    // Update progress circle
    let duration;
    if (timerMode === 'focus') {
        duration = pomodoroSettings.focusDuration;
    } else if (timerMode === 'shortBreak') {
        duration = pomodoroSettings.shortBreakDuration;
    } else {
        duration = pomodoroSettings.longBreakDuration;
    }
    
    const progress = 1 - (remainingSeconds / duration);
    updatePomodoroProgress(progress);
    
    // Update fullscreen display if active and showing pomodoro
    if (isFullscreen && timerType === 'pomodoro') {
        document.getElementById('fullscreen-time').textContent = formatTime(remainingSeconds);
        document.getElementById('fullscreen-label').textContent = document.getElementById('pomodoro-label').textContent;
        
        // Update fullscreen progress
        const fullscreenProgress = document.getElementById('fullscreen-progress');
        if (fullscreenProgress) {
            const degrees = progress * 360;
            fullscreenProgress.style.background = `conic-gradient(var(--primary-color) ${degrees}deg, rgba(255, 255, 255, 0.1) ${degrees}deg)`;
        }
    }
}

/**
 * Update Flowmodoro timer display
 * @param {number} elapsedSeconds - Seconds elapsed in the timer
 */
function updateFlowmodoroDisplay(elapsedSeconds) {
    const timeDisplay = document.getElementById('flowmodoro-time');
    if (timeDisplay) {
        timeDisplay.textContent = formatTime(elapsedSeconds);
    }
    
    // Update progress circle (only if we're in flow mode)
    let cycleProgress = 0;
    if (timerMode === 'flow') {
        // Use a cyclical progress for visual feedback
        // Reset progress every 5 minutes
        const cycleDuration = 300; // 5 minutes in seconds
        cycleProgress = (elapsedSeconds % cycleDuration) / cycleDuration;
        updateFlowmodoroProgress(cycleProgress);
    }
    
    // Update fullscreen display if active and showing flowmodoro
    if (isFullscreen && timerType === 'flowmodoro') {
        document.getElementById('fullscreen-time').textContent = formatTime(elapsedSeconds);
        document.getElementById('fullscreen-label').textContent = document.getElementById('flowmodoro-label').textContent;
        
        // Update fullscreen progress
        const fullscreenProgress = document.getElementById('fullscreen-progress');
        if (fullscreenProgress) {
            const degrees = cycleProgress * 360;
            fullscreenProgress.style.background = `conic-gradient(var(--primary-color) ${degrees}deg, rgba(255, 255, 255, 0.1) ${degrees}deg)`;
        }
    }
}

/**
 * Update Pomodoro progress circle
 * @param {number} progress - Progress value from 0 to 1
 */
function updatePomodoroProgress(progress) {
    const progressElement = document.getElementById('pomodoro-progress');
    if (progressElement) {
        const degrees = progress * 360;
        progressElement.style.background = `conic-gradient(var(--primary-color) ${degrees}deg, rgba(255, 255, 255, 0.1) ${degrees}deg)`;
    }
}

/**
 * Update Flowmodoro progress circle
 * @param {number} progress - Progress value from 0 to 1
 */
function updateFlowmodoroProgress(progress) {
    const progressElement = document.getElementById('flowmodoro-progress');
    if (progressElement) {
        const degrees = progress * 360;
        progressElement.style.background = `conic-gradient(var(--primary-color) ${degrees}deg, rgba(255, 255, 255, 0.1) ${degrees}deg)`;
    }
}

/**
 * Update session indicators
 */
function updateSessionIndicators() {
    const sessionsContainer = document.getElementById('pomodoro-sessions');
    if (!sessionsContainer) return;
    
    // Clear existing indicators
    sessionsContainer.innerHTML = '';
    
    // Create session indicators
    for (let i = 1; i <= pomodoroSettings.sessionsBeforeLongBreak; i++) {
        const dot = document.createElement('span');
        dot.className = 'session-dot';
        
        // Highlight current session
        if (i === currentSession) {
            dot.classList.add('active');
        } else if (i < currentSession) {
            dot.classList.add('completed');
        }
        
        sessionsContainer.appendChild(dot);
    }
    
    // Update completed sessions count
    const completedElement = document.getElementById('pomodoro-completed');
    if (completedElement) {
        // Only count completed sessions, not the current one
        completedElement.textContent = currentSession - 1;
    }
}

/**
 * Save a timer session to the database
 * @param {number} duration - Duration of the session in seconds
 */
async function saveTimerSession(duration) {
    try {
        const session = {
            id: generateId(),
            type: timerType,
            mode: timerMode,
            duration, // in seconds
            startTime: startTime.toISOString(),
            endTime: new Date().toISOString(),
            taskId: selectedTaskId || null
        };
        
        await db.addTimerSession(session);
        
        // Update total time display
        updateTotalTimeDisplay();
        
        // Refresh timer history
        loadTimerHistory();
    } catch (error) {
        console.error('Error saving timer session:', error);
    }
}

/**
 * Update total time display
 */
async function updateTotalTimeDisplay() {
    try {
        const sessions = await db.getTimerSessions();
        
        // Filter sessions by type and calculate total time
        const pomodoroSessions = sessions.filter(session => session.type === 'pomodoro' && session.mode === 'focus');
        const flowSessions = sessions.filter(session => session.type === 'flowmodoro' && session.mode === 'flow');
        
        // Calculate total minutes
        const pomodoroMinutes = Math.round(pomodoroSessions.reduce((total, session) => total + session.duration, 0) / 60);
        const flowMinutes = Math.round(flowSessions.reduce((total, session) => total + session.duration, 0) / 60);
        
        // Update UI
        document.getElementById('pomodoro-total-time').textContent = `${pomodoroMinutes} min`;
        document.getElementById('flowmodoro-total-time').textContent = `${flowMinutes} min`;
        
        // Update flowmodoro sessions count
        document.getElementById('flowmodoro-sessions-count').textContent = flowSessions.length;
        
        // Find longest flow session
        let longestFlow = 0;
        flowSessions.forEach(session => {
            if (session.duration > longestFlow) {
                longestFlow = session.duration;
            }
        });
        
        document.getElementById('flowmodoro-longest').textContent = `${Math.round(longestFlow / 60)} min`;
    } catch (error) {
        console.error('Error updating total time display:', error);
    }
}

/**
 * Load and display timer history
 */
async function loadTimerHistory() {
    try {
        const sessions = await db.getTimerSessions();
        const historyList = document.getElementById('timer-history-list');
        const emptyState = document.getElementById('empty-timer-history');
        
        if (!historyList) return;
        
        // Clear current history except for the empty state
        Array.from(historyList.children).forEach(child => {
            if (child !== emptyState) {
                historyList.removeChild(child);
            }
        });
        
        // Show empty state if no sessions
        if (sessions.length === 0) {
            if (emptyState) {
                emptyState.style.display = 'block';
            }
            return;
        }
        
        // Hide empty state if we have sessions
        if (emptyState) {
            emptyState.style.display = 'none';
        }
        
        // Sort sessions by date (most recent first)
        const sortedSessions = [...sessions].sort((a, b) => new Date(b.endTime) - new Date(a.endTime));
        
        // Show the 10 most recent sessions
        const recentSessions = sortedSessions.slice(0, 10);
        
        // Add each session to the list
        recentSessions.forEach(async session => {
            const sessionElement = await createSessionElement(session);
            historyList.appendChild(sessionElement);
        });
    } catch (error) {
        console.error('Error loading timer history:', error);
    }
}

/**
 * Create a session element for the UI
 * @param {Object} session - The session object
 * @returns {Promise<HTMLElement>} - The session element
 */
async function createSessionElement(session) {
    const sessionElement = document.createElement('div');
    sessionElement.className = 'timer-history-item';
    
    // Get task info if available
    let taskTitle = '';
    if (session.taskId) {
        try {
            const task = await db.getTaskById(session.taskId);
            if (task) {
                taskTitle = task.title;
            }
        } catch (error) {
            console.error('Error getting task:', error);
        }
    }
    
    // Format session type and mode
    let typeDisplay = session.type === 'pomodoro' ? 'Pomodoro' : 'Flowmodoro';
    let modeDisplay = '';
    
    if (session.type === 'pomodoro') {
        modeDisplay = session.mode === 'focus' ? 'Focus' : 'Break';
    } else {
        modeDisplay = 'Flow';
    }
    
    // Format date
    const date = new Date(session.endTime);
    const dateDisplay = formatDate(date, 'medium');
    
    // Format duration
    const durationMinutes = Math.round(session.duration / 60);
    
    // Set HTML content
    sessionElement.innerHTML = `
        <div class="timer-history-info">
            <h5>${typeDisplay} ${modeDisplay}</h5>
            <div class="timer-history-meta">
                <span><i class="far fa-calendar"></i> ${dateDisplay}</span>
                ${taskTitle ? `<span><i class="fas fa-tasks"></i> ${escapeHTML(taskTitle)}</span>` : ''}
            </div>
        </div>
        <div class="timer-history-time">${durationMinutes} min</div>
    `;
    
    return sessionElement;
}

/**
 * Open Pomodoro settings modal
 */
function openPomodoroSettings() {
    const modal = new bootstrap.Modal(document.getElementById('pomodoroSettingsModal'));
    updateSettingsForm();
    modal.show();
}

/**
 * Open Flowmodoro settings modal
 */
function openFlowmodoroSettings() {
    const modal = new bootstrap.Modal(document.getElementById('flowmodoroSettingsModal'));
    updateSettingsForm();
    modal.show();
}

/**
 * Save Pomodoro settings
 */
async function savePomodoroSettings() {
    try {
        // Get form values
        const focusDuration = parseInt(document.getElementById('focus-duration').value, 10) * 60;
        const shortBreakDuration = parseInt(document.getElementById('short-break-duration').value, 10) * 60;
        const longBreakDuration = parseInt(document.getElementById('long-break-duration').value, 10) * 60;
        const sessionsBeforeLongBreak = parseInt(document.getElementById('sessions-before-long-break').value, 10);
        const autoStartBreaks = document.getElementById('auto-start-breaks').checked;
        const notifySound = document.getElementById('notify-sound').checked;
        
        // Validate
        if (isNaN(focusDuration) || focusDuration <= 0) {
            showNotification('Focus duration must be a positive number', 'error');
            return;
        }
        
        if (isNaN(shortBreakDuration) || shortBreakDuration <= 0) {
            showNotification('Short break duration must be a positive number', 'error');
            return;
        }
        
        if (isNaN(longBreakDuration) || longBreakDuration <= 0) {
            showNotification('Long break duration must be a positive number', 'error');
            return;
        }
        
        if (isNaN(sessionsBeforeLongBreak) || sessionsBeforeLongBreak <= 0) {
            showNotification('Sessions before long break must be a positive number', 'error');
            return;
        }
        
        // Update settings
        pomodoroSettings = {
            focusDuration,
            shortBreakDuration,
            longBreakDuration,
            sessionsBeforeLongBreak,
            autoStartBreaks,
            notifySound
        };
        
        // Save settings to database
        await db.saveSetting('pomodoroSettings', pomodoroSettings);
        
        // Close modal
        const modalElement = document.getElementById('pomodoroSettingsModal');
        const modal = bootstrap.Modal.getInstance(modalElement);
        modal.hide();
        
        // Reset timer if it's not running
        if (timerState === 'stopped') {
            resetTimer();
        }
        
        // Update session indicators
        updateSessionIndicators();
        
        showNotification('Pomodoro settings saved successfully', 'success');
    } catch (error) {
        console.error('Error saving Pomodoro settings:', error);
        showNotification('Failed to save settings', 'error');
    }
}

/**
 * Save Flowmodoro settings
 */
async function saveFlowmodoroSettings() {
    try {
        // Get form values
        const breakRatio = parseInt(document.getElementById('break-ratio').value, 10);
        const minimumFlowTime = parseInt(document.getElementById('minimum-flow-time').value, 10) * 60;
        
        // Default maximum flow time if the element doesn't exist
        let maximumFlowTime = 90 * 60; // Default 90 minutes
        const maxFlowElement = document.getElementById('maximum-flow-time');
        if (maxFlowElement) {
            maximumFlowTime = parseInt(maxFlowElement.value, 10) * 60;
        }
        
        const notifySound = document.getElementById('notify-sound-flow').checked;
        
        // Validate
        if (isNaN(breakRatio) || breakRatio <= 0) {
            showNotification('Break ratio must be a positive number', 'error');
            return;
        }
        
        if (isNaN(minimumFlowTime) || minimumFlowTime <= 0) {
            showNotification('Minimum flow time must be a positive number', 'error');
            return;
        }
        
        if (isNaN(maximumFlowTime) || maximumFlowTime <= 0) {
            showNotification('Maximum flow time must be a positive number', 'error');
            return;
        }
        
        if (minimumFlowTime >= maximumFlowTime) {
            showNotification('Maximum flow time must be greater than minimum flow time', 'error');
            return;
        }
        
        // Update settings
        flowmodoroSettings = {
            breakRatio,
            minimumFlowTime,
            maximumFlowTime,
            notifySound
        };
        
        // Save settings to database
        await db.saveSetting('flowmodoroSettings', flowmodoroSettings);
        
        // Close modal
        const modalElement = document.getElementById('flowmodoroSettingsModal');
        const modal = bootstrap.Modal.getInstance(modalElement);
        modal.hide();
        
        showNotification('Flowmodoro settings saved successfully', 'success');
    } catch (error) {
        console.error('Error saving Flowmodoro settings:', error);
        showNotification('Failed to save settings', 'error');
    }
}

/**
 * Update timer display
 */
function updateTimerDisplay() {
    if (timerType === 'pomodoro') {
        updatePomodoroDisplay(pomodoroSettings.focusDuration);
    } else {
        updateFlowmodoroDisplay(0);
    }
    updateSessionIndicators();
}

/**
 * Format time in seconds to MM:SS format
 * @param {number} seconds - Time in seconds
 * @returns {string} - Formatted time string
 */
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Enter fullscreen timer mode
 * @param {string} mode - 'pomodoro' or 'flowmodoro'
 */
function enterFullscreenMode(mode) {
    // Set current active timer type
    timerType = mode;
    isFullscreen = true;
    
    // Get timer values and labels from the active timer
    let timeValue, labelValue, progressValue;
    
    if (mode === 'pomodoro') {
        timeValue = document.getElementById('pomodoro-time').textContent;
        labelValue = document.getElementById('pomodoro-label').textContent;
        progressValue = document.getElementById('pomodoro-progress').style.background;
    } else {
        timeValue = document.getElementById('flowmodoro-time').textContent;
        labelValue = document.getElementById('flowmodoro-label').textContent;
        progressValue = document.getElementById('flowmodoro-progress').style.background;
    }
    
    // Update fullscreen timer display
    document.getElementById('fullscreen-time').textContent = timeValue;
    document.getElementById('fullscreen-label').textContent = labelValue;
    document.getElementById('fullscreen-progress').style.background = progressValue;
    
    // Show the fullscreen timer
    document.getElementById('fullscreen-timer').classList.add('active');
    
    // Update fullscreen timer in real-time
    if (timerState === 'running') {
        document.getElementById('fullscreen-pause').disabled = false;
    } else {
        document.getElementById('fullscreen-pause').disabled = true;
    }
}

/**
 * Exit fullscreen timer mode
 */
function exitFullscreenMode() {
    // Set fullscreen state
    isFullscreen = false;
    
    // Hide the fullscreen timer
    document.getElementById('fullscreen-timer').classList.remove('active');
    
    // Update the regular timer display
    if (timerType === 'pomodoro') {
        document.getElementById('pomodoro-time').textContent = document.getElementById('fullscreen-time').textContent;
        document.getElementById('pomodoro-label').textContent = document.getElementById('fullscreen-label').textContent;
        document.getElementById('pomodoro-progress').style.background = document.getElementById('fullscreen-progress').style.background;
    } else {
        document.getElementById('flowmodoro-time').textContent = document.getElementById('fullscreen-time').textContent;
        document.getElementById('flowmodoro-label').textContent = document.getElementById('fullscreen-label').textContent;
        document.getElementById('flowmodoro-progress').style.background = document.getElementById('fullscreen-progress').style.background;
    }
}

/**
 * Generate a unique ID
 * @returns {string} - A unique ID
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

/**
 * Play notification sound
 */
function playNotificationSound() {
    if (notificationSound) {
        // Reset the audio to the beginning
        notificationSound.currentTime = 0;
        notificationSound.play().catch(error => {
            console.error('Error playing notification sound:', error);
        });
    }
}

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text
 */
function escapeHTML(text) {
    if (!text) return '';
    
    const element = document.createElement('div');
    element.textContent = text;
    return element.innerHTML;
}
