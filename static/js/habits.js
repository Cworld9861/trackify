/**
 * Trackify - Habits Module
 * Handles habit tracking functionality
 */

// Habit management variables
let habits = [];
let completedToday = 0;
let totalHabits = 0;
let currentYearMonth = new Date();

// Constants for habit frequency
const DAYS_OF_WEEK = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    initHabitsPage();
});

/**
 * Initialize the habits page
 */
async function initHabitsPage() {
    // Set up event listeners for habit-specific UI elements
    setupHabitEventListeners();
    
    // Display current date
    updateDateDisplay();
    
    // Load habits from database
    await loadHabits();
    
    // Render habits in the UI
    renderHabits();
    
    // Generate the calendar view
    generateCalendarView();
    
    // Update stats
    updateHabitStats();
}

/**
 * Set up event listeners for habit-specific UI elements
 */
function setupHabitEventListeners() {
    // Add habit button
    const addHabitBtn = document.getElementById('add-habit-btn');
    if (addHabitBtn) {
        addHabitBtn.addEventListener('click', () => openHabitModal());
    }
    
    // Save habit button in modal
    const saveHabitBtn = document.getElementById('save-habit-btn');
    if (saveHabitBtn) {
        saveHabitBtn.addEventListener('click', saveHabit);
    }
}

/**
 * Update the date display in the UI
 */
function updateDateDisplay() {
    const todayDateElement = document.getElementById('today-date');
    if (todayDateElement) {
        const today = new Date();
        todayDateElement.textContent = today.toLocaleDateString('en-US', { 
            weekday: 'long', 
            month: 'long', 
            day: 'numeric'
        });
    }
}

/**
 * Load habits from the database
 */
async function loadHabits() {
    try {
        habits = await db.getHabits();
        console.log('Habits loaded:', habits.length);
        
        // Update with today's completion status
        updateTodayCompletionStatus();
    } catch (error) {
        console.error('Error loading habits:', error);
        showNotification('Failed to load habits', 'error');
    }
}

/**
 * Update the completion status for habits today
 */
function updateTodayCompletionStatus() {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // Get the day of week for today (0 = Sunday, 1 = Monday, etc.)
    const dayOfWeek = today.getDay();
    // Convert to our format (0 = Monday, ... 6 = Sunday)
    const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const todayDayKey = DAYS_OF_WEEK[dayIndex];
    
    // Count habits that are scheduled for today
    totalHabits = habits.filter(habit => 
        habit.frequency && habit.frequency.includes(todayDayKey)
    ).length;
    
    // Count habits that are completed today
    completedToday = habits.filter(habit => 
        habit.frequency && 
        habit.frequency.includes(todayDayKey) && 
        habit.completionDates && 
        habit.completionDates.includes(todayStr)
    ).length;
}

/**
 * Render habits in the UI
 */
function renderHabits() {
    const habitsList = document.getElementById('habits-list');
    const emptyState = document.getElementById('empty-habits-state');
    
    if (!habitsList) return;
    
    // Clear current habits except for the empty state
    Array.from(habitsList.children).forEach(child => {
        if (child !== emptyState) {
            habitsList.removeChild(child);
        }
    });
    
    // Show empty state if no habits
    if (habits.length === 0) {
        if (emptyState) {
            emptyState.style.display = 'block';
        }
        return;
    }
    
    // Hide empty state if we have habits
    if (emptyState) {
        emptyState.style.display = 'none';
    }
    
    // Sort habits by name
    const sortedHabits = [...habits].sort((a, b) => a.name.localeCompare(b.name));
    
    // Add each habit to the list
    sortedHabits.forEach(habit => {
        const habitElement = createHabitElement(habit);
        habitsList.appendChild(habitElement);
    });
}

/**
 * Create a habit element for the UI
 * @param {Object} habit - The habit object
 * @returns {HTMLElement} - The habit element
 */
function createHabitElement(habit) {
    const habitElement = document.createElement('div');
    habitElement.className = 'habit-card';
    habitElement.dataset.id = habit.id;
    
    // Check if habit is active today
    const today = new Date();
    const dayOfWeek = today.getDay();
    const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const todayDayKey = DAYS_OF_WEEK[dayIndex];
    const isActiveToday = habit.frequency && habit.frequency.includes(todayDayKey);
    
    // Check if habit is completed today
    const todayStr = today.toISOString().split('T')[0];
    const isCompletedToday = habit.completionDates && habit.completionDates.includes(todayStr);
    
    // Create the habit checkbox
    const checkbox = document.createElement('div');
    checkbox.className = 'habit-checkbox';
    
    // Only show checkbox if habit is active today
    if (isActiveToday) {
        checkbox.innerHTML = `
            <div class="form-check">
                <input class="form-check-input" type="checkbox" ${isCompletedToday ? 'checked' : ''}>
            </div>
        `;
        
        // Add click event to checkbox
        const checkboxInput = checkbox.querySelector('input');
        checkboxInput.addEventListener('change', () => toggleHabitCompleted(habit.id, checkboxInput.checked));
    } else {
        checkbox.innerHTML = `
            <div class="form-check">
                <span class="inactive-checkbox"><i class="fas fa-minus"></i></span>
            </div>
        `;
    }
    
    // Create the habit content
    const content = document.createElement('div');
    content.className = 'habit-content';
    
    // Format frequency
    let frequencyDisplay = '';
    if (habit.frequency && habit.frequency.length > 0) {
        if (habit.frequency.length === 7) {
            frequencyDisplay = 'Every day';
        } else {
            const dayNames = habit.frequency.map(day => DAY_NAMES[DAYS_OF_WEEK.indexOf(day)].substring(0, 3));
            frequencyDisplay = dayNames.join(', ');
        }
    }
    
    // Set content HTML
    content.innerHTML = `
        <h3 class="habit-name">${escapeHTML(habit.name)}</h3>
        ${habit.description ? `<p class="habit-description">${escapeHTML(habit.description)}</p>` : ''}
        <div class="habit-meta">
            <span><i class="fas fa-calendar-day"></i> ${frequencyDisplay}</span>
            ${habit.category ? `<span><i class="fas fa-tag"></i> ${capitalizeFirstLetter(habit.category)}</span>` : ''}
            ${habit.reminderTime ? `<span><i class="fas fa-bell"></i> ${habit.reminderTime}</span>` : ''}
        </div>
    `;
    
    // Create habit streak
    const streak = document.createElement('div');
    streak.className = 'habit-streak';
    
    if (habit.currentStreak > 0) {
        streak.innerHTML = `
            <i class="fas fa-fire"></i>
            <span>${habit.currentStreak}</span>
        `;
    } else {
        streak.innerHTML = `
            <i class="fas fa-fire" style="opacity: 0.5;"></i>
            <span>0</span>
        `;
    }
    
    // Create habit actions
    const actions = document.createElement('div');
    actions.className = 'habit-actions';
    actions.innerHTML = `
        <button class="btn btn-sm btn-outline-primary edit-habit-btn" title="Edit Habit">
            <i class="fas fa-edit"></i>
        </button>
        <button class="btn btn-sm btn-outline-danger delete-habit-btn" title="Delete Habit">
            <i class="fas fa-trash"></i>
        </button>
    `;
    
    // Add event listeners for actions
    const editBtn = actions.querySelector('.edit-habit-btn');
    editBtn.addEventListener('click', () => openHabitModal(habit));
    
    const deleteBtn = actions.querySelector('.delete-habit-btn');
    deleteBtn.addEventListener('click', () => confirmDeleteHabit(habit.id));
    
    // Assemble the habit element
    habitElement.appendChild(checkbox);
    habitElement.appendChild(content);
    habitElement.appendChild(streak);
    habitElement.appendChild(actions);
    
    return habitElement;
}

/**
 * Open the habit modal for adding or editing a habit
 * @param {Object} habit - The habit to edit (null for a new habit)
 */
function openHabitModal(habit = null) {
    const modal = new bootstrap.Modal(document.getElementById('habitModal'));
    const form = document.getElementById('habit-form');
    const modalTitle = document.getElementById('habitModalLabel');
    
    // Reset the form
    form.reset();
    
    // Uncheck all frequency checkboxes
    DAYS_OF_WEEK.forEach(day => {
        document.getElementById(`day-${day}`).checked = false;
    });
    
    // Set modal title
    modalTitle.textContent = habit ? 'Edit Habit' : 'Add New Habit';
    
    // Fill the form if editing a habit
    if (habit) {
        document.getElementById('habit-id').value = habit.id;
        document.getElementById('habit-name').value = habit.name;
        document.getElementById('habit-description').value = habit.description || '';
        document.getElementById('habit-category').value = habit.category || 'health';
        document.getElementById('habit-reminder-time').value = habit.reminderTime || '';
        
        // Check appropriate frequency checkboxes
        if (habit.frequency && habit.frequency.length > 0) {
            habit.frequency.forEach(day => {
                document.getElementById(`day-${day}`).checked = true;
            });
        }
    } else {
        document.getElementById('habit-id').value = '';
        document.getElementById('habit-category').value = 'health';
        
        // By default, check all weekdays for new habits
        ['mon', 'tue', 'wed', 'thu', 'fri'].forEach(day => {
            document.getElementById(`day-${day}`).checked = true;
        });
    }
    
    // Show the modal
    modal.show();
}

/**
 * Save a habit (add new or update existing)
 */
async function saveHabit() {
    // Get form data
    const habitId = document.getElementById('habit-id').value;
    const name = document.getElementById('habit-name').value.trim();
    const description = document.getElementById('habit-description').value.trim();
    const category = document.getElementById('habit-category').value;
    const reminderTime = document.getElementById('habit-reminder-time').value;
    
    // Get selected frequency days
    const frequency = DAYS_OF_WEEK.filter(day => 
        document.getElementById(`day-${day}`).checked
    );
    
    // Validate
    if (!name) {
        showNotification('Habit name is required', 'error');
        return;
    }
    
    if (frequency.length === 0) {
        showNotification('Please select at least one day for the habit', 'error');
        return;
    }
    
    try {
        // Prepare habit object
        const habit = {
            name,
            description,
            frequency,
            category,
            reminderTime
        };
        
        if (habitId) {
            // Update existing habit
            habit.id = habitId;
            
            // Get existing habit to preserve completion data
            const existingHabit = await db.getHabitById(habitId);
            if (existingHabit) {
                habit.completionDates = existingHabit.completionDates || [];
                habit.currentStreak = existingHabit.currentStreak || 0;
                habit.longestStreak = existingHabit.longestStreak || 0;
            }
            
            await db.updateHabit(habit);
            showNotification('Habit updated successfully', 'success');
        } else {
            // Add new habit
            habit.createdAt = new Date().toISOString();
            habit.completionDates = [];
            habit.currentStreak = 0;
            habit.longestStreak = 0;
            
            await db.addHabit(habit);
            showNotification('Habit added successfully', 'success');
        }
        
        // Close the modal
        const modalElement = document.getElementById('habitModal');
        const modal = bootstrap.Modal.getInstance(modalElement);
        modal.hide();
        
        // Reload habits and update UI
        await loadHabits();
        renderHabits();
        updateHabitStats();
        generateCalendarView();
    } catch (error) {
        console.error('Error saving habit:', error);
        showNotification('Failed to save habit', 'error');
    }
}

/**
 * Toggle a habit's completion status for today
 * @param {string} habitId - ID of the habit to toggle
 * @param {boolean} completed - New completion status
 */
async function toggleHabitCompleted(habitId, completed) {
    try {
        // Get the habit from database
        const habit = await db.getHabitById(habitId);
        if (!habit) {
            console.error('Habit not found:', habitId);
            return;
        }
        
        // Get today's date as a string (YYYY-MM-DD)
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        
        // Initialize completion dates array if it doesn't exist
        if (!habit.completionDates) {
            habit.completionDates = [];
        }
        
        // Update completion status
        if (completed) {
            // Add today to completion dates if not already included
            if (!habit.completionDates.includes(todayStr)) {
                habit.completionDates.push(todayStr);
            }
            
            // Sort completion dates to ensure they're in chronological order
            habit.completionDates.sort();
            
            // Update streak
            updateStreak(habit);
        } else {
            // Remove today from completion dates
            habit.completionDates = habit.completionDates.filter(date => date !== todayStr);
            
            // Update streak
            updateStreak(habit);
        }
        
        // Save to database
        await db.updateHabit(habit);
        
        // Show notification
        showNotification(
            `Habit marked as ${completed ? 'completed' : 'incomplete'} for today`,
            'success'
        );
        
        // Update UI
        await loadHabits();
        renderHabits();
        updateHabitStats();
        generateCalendarView();
    } catch (error) {
        console.error('Error toggling habit completion:', error);
        showNotification('Failed to update habit', 'error');
    }
}

/**
 * Update the streak for a habit
 * @param {Object} habit - The habit to update
 */
function updateStreak(habit) {
    if (!habit.completionDates || habit.completionDates.length === 0) {
        habit.currentStreak = 0;
        return;
    }
    
    // Sort completion dates
    const sortedDates = [...habit.completionDates].sort();
    
    // Get today and yesterday as strings
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const todayStr = today.toISOString().split('T')[0];
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    // Check if today is completed
    const isTodayCompleted = sortedDates.includes(todayStr);
    
    // Check if yesterday is completed
    const isYesterdayCompleted = sortedDates.includes(yesterdayStr);
    
    // Get the day of week for today and yesterday
    const todayDay = today.getDay();
    const todayDayIndex = todayDay === 0 ? 6 : todayDay - 1;
    const todayDayKey = DAYS_OF_WEEK[todayDayIndex];
    
    const yesterdayDay = yesterday.getDay();
    const yesterdayDayIndex = yesterdayDay === 0 ? 6 : yesterdayDay - 1;
    const yesterdayDayKey = DAYS_OF_WEEK[yesterdayDayIndex];
    
    // Check if habit is scheduled for today and yesterday
    const isTodayScheduled = habit.frequency.includes(todayDayKey);
    const isYesterdayScheduled = habit.frequency.includes(yesterdayDayKey);
    
    // If habit is not completed today but was due, reset streak
    if (isTodayScheduled && !isTodayCompleted) {
        habit.currentStreak = 0;
        return;
    }
    
    // If habit was not completed yesterday but was due, reset streak
    if (isYesterdayScheduled && !isYesterdayCompleted) {
        habit.currentStreak = isTodayCompleted ? 1 : 0;
        return;
    }
    
    // Calculate the current streak by walking backwards from the most recent completion
    let currentStreak = 0;
    let date = new Date(today);
    
    // Start with today if completed
    if (isTodayCompleted) {
        currentStreak = 1;
    }
    
    // Go backwards through days
    for (let i = 1; i <= 366; i++) { // Check up to a year back
        date.setDate(date.getDate() - 1);
        const dateStr = date.toISOString().split('T')[0];
        
        // Get the day of week for this date
        const dateDay = date.getDay();
        const dateDayIndex = dateDay === 0 ? 6 : dateDay - 1;
        const dateDayKey = DAYS_OF_WEEK[dateDayIndex];
        
        // Check if habit is scheduled for this day
        const isScheduled = habit.frequency.includes(dateDayKey);
        
        // If scheduled but not completed, break the streak
        if (isScheduled && !sortedDates.includes(dateStr)) {
            break;
        }
        
        // If scheduled and completed, increment streak
        if (isScheduled && sortedDates.includes(dateStr)) {
            currentStreak++;
        }
        
        // If not scheduled, continue to previous day without affecting streak
    }
    
    // Update current streak
    habit.currentStreak = currentStreak;
    
    // Update longest streak if current streak is longer
    if (!habit.longestStreak || currentStreak > habit.longestStreak) {
        habit.longestStreak = currentStreak;
    }
}

/**
 * Confirm deletion of a habit
 * @param {string} habitId - ID of the habit to delete
 */
function confirmDeleteHabit(habitId) {
    // Simple confirmation dialog
    if (confirm('Are you sure you want to delete this habit? All tracking data will be lost.')) {
        deleteHabit(habitId);
    }
}

/**
 * Delete a habit
 * @param {string} habitId - ID of the habit to delete
 */
async function deleteHabit(habitId) {
    try {
        await db.deleteHabit(habitId);
        showNotification('Habit deleted successfully', 'success');
        
        // Reload habits and update UI
        await loadHabits();
        renderHabits();
        updateHabitStats();
        generateCalendarView();
    } catch (error) {
        console.error('Error deleting habit:', error);
        showNotification('Failed to delete habit', 'error');
    }
}

/**
 * Update habit statistics display
 */
function updateHabitStats() {
    // Update streak count
    const streakElement = document.getElementById('streak-count');
    if (streakElement) {
        // Get the highest current streak
        let highestStreak = 0;
        habits.forEach(habit => {
            if (habit.currentStreak > highestStreak) {
                highestStreak = habit.currentStreak;
            }
        });
        
        streakElement.textContent = highestStreak;
    }
    
    // Update completion progress
    const progressElement = document.getElementById('daily-progress');
    const completedElement = document.getElementById('completed-habits');
    const totalElement = document.getElementById('total-habits');
    
    if (progressElement && completedElement && totalElement) {
        completedElement.textContent = completedToday;
        totalElement.textContent = totalHabits;
        
        const progressPercentage = totalHabits > 0 ? Math.round((completedToday / totalHabits) * 100) : 0;
        
        progressElement.style.width = `${progressPercentage}%`;
        progressElement.setAttribute('aria-valuenow', progressPercentage);
        progressElement.textContent = `${progressPercentage}%`;
    }
}

/**
 * Generate a calendar view for habit tracking
 */
function generateCalendarView() {
    const calendarContainer = document.getElementById('habit-calendar');
    if (!calendarContainer) return;
    
    // Clear calendar container
    calendarContainer.innerHTML = '';
    
    // Generate calendar for current month and previous month
    const currentMonth = generateMonthCalendar(currentYearMonth);
    
    // Previous month
    const prevYearMonth = new Date(currentYearMonth);
    prevYearMonth.setMonth(prevYearMonth.getMonth() - 1);
    const prevMonth = generateMonthCalendar(prevYearMonth);
    
    // Append calendars
    calendarContainer.appendChild(prevMonth);
    calendarContainer.appendChild(currentMonth);
}

/**
 * Generate a calendar for a specific month
 * @param {Date} date - Date representing the month to generate
 * @returns {HTMLElement} - The calendar element
 */
function generateMonthCalendar(date) {
    const monthContainer = document.createElement('div');
    monthContainer.className = 'calendar-month';
    
    // Month header
    const monthHeader = document.createElement('div');
    monthHeader.className = 'calendar-month-header';
    
    const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    monthHeader.innerHTML = `
        <h5>${monthName}</h5>
        <div class="calendar-nav">
            <button class="prev-month-btn"><i class="fas fa-chevron-left"></i></button>
            <button class="next-month-btn"><i class="fas fa-chevron-right"></i></button>
        </div>
    `;
    
    // Add event listeners for navigation
    const prevBtn = monthHeader.querySelector('.prev-month-btn');
    const nextBtn = monthHeader.querySelector('.next-month-btn');
    
    prevBtn.addEventListener('click', () => {
        currentYearMonth.setMonth(currentYearMonth.getMonth() - 1);
        generateCalendarView();
    });
    
    nextBtn.addEventListener('click', () => {
        currentYearMonth.setMonth(currentYearMonth.getMonth() + 1);
        generateCalendarView();
    });
    
    monthContainer.appendChild(monthHeader);
    
    // Calendar grid
    const calendarGrid = document.createElement('div');
    calendarGrid.className = 'calendar-grid';
    
    // Add day headers (Mon, Tue, etc.)
    for (let i = 0; i < 7; i++) {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'calendar-day-header';
        dayHeader.textContent = DAY_NAMES[i].substring(0, 3);
        calendarGrid.appendChild(dayHeader);
    }
    
    // Get first day of month
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    // Get day of week (0 = Sunday, 1 = Monday, etc.)
    let dayOfWeek = firstDay.getDay();
    // Convert to our format (0 = Monday, ... 6 = Sunday)
    dayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    
    // Add empty cells for days before the first day of month
    for (let i = 0; i < dayOfWeek; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'calendar-day empty';
        calendarGrid.appendChild(emptyDay);
    }
    
    // Get number of days in month
    const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    
    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Add days of month
    for (let day = 1; day <= daysInMonth; day++) {
        const dayCell = document.createElement('div');
        dayCell.className = 'calendar-day';
        
        // Check if this is today
        const currentDate = new Date(date.getFullYear(), date.getMonth(), day);
        currentDate.setHours(0, 0, 0, 0);
        
        if (currentDate.getTime() === today.getTime()) {
            dayCell.classList.add('today');
        }
        
        // Check completion for this day
        const dateStr = currentDate.toISOString().split('T')[0];
        
        // Get scheduled habits for this day
        const dayOfWeek = currentDate.getDay();
        const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const dayKey = DAYS_OF_WEEK[dayIndex];
        
        const scheduledHabits = habits.filter(habit => 
            habit.frequency && habit.frequency.includes(dayKey)
        );
        
        // Count completed habits for this day
        const completedHabits = scheduledHabits.filter(habit => 
            habit.completionDates && habit.completionDates.includes(dateStr)
        );
        
        // Mark as completed if all scheduled habits were completed
        if (scheduledHabits.length > 0 && completedHabits.length === scheduledHabits.length) {
            dayCell.classList.add('completed');
        }
        // Mark as partially completed if some habits were completed
        else if (completedHabits.length > 0) {
            dayCell.classList.add('partial');
        }
        
        dayCell.innerHTML = `
            <div class="calendar-day-number">${day}</div>
        `;
        
        calendarGrid.appendChild(dayCell);
    }
    
    monthContainer.appendChild(calendarGrid);
    
    return monthContainer;
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

/**
 * Capitalize the first letter of a string
 * @param {string} text - Text to capitalize
 * @returns {string} - Text with first letter capitalized
 */
function capitalizeFirstLetter(text) {
    if (!text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1);
}
