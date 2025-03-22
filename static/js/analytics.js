/**
 * Trackify - Analytics Module
 * Handles data visualization and analytics functionality
 */

// Charts instances
let taskCompletionChart = null;
let habitConsistencyChart = null;
let focusTimeChart = null;
let courseProgressChart = null;
let productiveDaysChart = null;
let taskCategoriesChart = null;

// Time period for analytics
let currentTimePeriod = 'week';

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    initAnalyticsPage();
});

/**
 * Initialize the analytics page
 */
async function initAnalyticsPage() {
    // Set up event listeners for analytics-specific UI elements
    setupAnalyticsEventListeners();
    
    // Load data and generate charts
    await loadAnalyticsData();
    
    // Generate insights based on data
    generateInsights();
}

/**
 * Set up event listeners for analytics-specific UI elements
 */
function setupAnalyticsEventListeners() {
    // Time period selection
    const timePeriodSelect = document.getElementById('time-period');
    if (timePeriodSelect) {
        timePeriodSelect.addEventListener('change', function() {
            currentTimePeriod = this.value;
            loadAnalyticsData();
            generateInsights();
        });
    }
}

/**
 * Load analytics data and render charts
 */
async function loadAnalyticsData() {
    try {
        // Load data from database
        const [tasks, habits, timerSessions, courses] = await Promise.all([
            db.getTasks(),
            db.getHabits(),
            db.getTimerSessions(),
            db.getCourses()
        ]);
        
        // Filter data by selected time period
        const filteredData = filterDataByTimePeriod({
            tasks,
            habits,
            timerSessions,
            courses
        });
        
        // Update summary stats
        updateSummaryStats(filteredData);
        
        // Create/update charts
        createTaskCompletionChart(filteredData.tasks);
        createHabitConsistencyChart(filteredData.habits);
        createFocusTimeChart(filteredData.timerSessions);
        createCourseProgressChart(filteredData.courses);
        createProductiveDaysChart(filteredData);
        createTaskCategoriesChart(filteredData.tasks);
        
        // Update goal progress
        updateGoalProgress(filteredData);
    } catch (error) {
        console.error('Error loading analytics data:', error);
        showNotification('Failed to load analytics data', 'error');
    }
}

/**
 * Filter data based on selected time period
 * @param {Object} data - The complete data set
 * @returns {Object} - Filtered data based on time period
 */
function filterDataByTimePeriod(data) {
    const now = new Date();
    let startDate;
    
    // Determine start date based on selected time period
    switch (currentTimePeriod) {
        case 'week':
            startDate = new Date(now);
            startDate.setDate(now.getDate() - 7);
            break;
            
        case 'month':
            startDate = new Date(now);
            startDate.setMonth(now.getMonth() - 1);
            break;
            
        case 'year':
            startDate = new Date(now);
            startDate.setFullYear(now.getFullYear() - 1);
            break;
            
        case 'all':
            // Use earliest possible date
            startDate = new Date(0);
            break;
            
        default:
            startDate = new Date(now);
            startDate.setDate(now.getDate() - 7);
    }
    
    // Filter tasks
    const filteredTasks = data.tasks.filter(task => {
        // Use completion date for completed tasks or creation date if not completed
        const taskDate = task.completed && task.completedAt ? new Date(task.completedAt) : new Date(task.createdAt);
        return taskDate >= startDate;
    });
    
    // Filter habits (completion dates)
    const filteredHabits = data.habits.map(habit => {
        // Create a copy of the habit
        const filteredHabit = { ...habit };
        
        // Filter completion dates within the time period
        if (filteredHabit.completionDates) {
            filteredHabit.completionDates = filteredHabit.completionDates.filter(dateStr => {
                const completionDate = new Date(dateStr);
                return completionDate >= startDate;
            });
        }
        
        return filteredHabit;
    });
    
    // Filter timer sessions
    const filteredTimerSessions = data.timerSessions.filter(session => {
        const sessionDate = new Date(session.endTime);
        return sessionDate >= startDate;
    });
    
    // Filter courses based on last updated date
    const filteredCourses = data.courses.filter(course => {
        const courseDate = new Date(course.lastUpdated);
        return courseDate >= startDate;
    });
    
    return {
        tasks: filteredTasks,
        habits: filteredHabits,
        timerSessions: filteredTimerSessions,
        courses: filteredCourses,
        startDate
    };
}

/**
 * Update summary statistics
 * @param {Object} data - The filtered data set
 */
function updateSummaryStats(data) {
    // Tasks completed
    const tasksCompletedCount = data.tasks.filter(task => task.completed).length;
    document.getElementById('tasks-completed-count').textContent = tasksCompletedCount;
    
    // Habit completion rate
    let habitCompletionRate = 0;
    
    // Get all possible days in the time period
    const startDate = data.startDate;
    const endDate = new Date();
    const daysBetween = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    
    // Count total habit completions
    let totalPossibleCompletions = 0;
    let totalActualCompletions = 0;
    
    data.habits.forEach(habit => {
        if (!habit.frequency || habit.frequency.length === 0) return;
        
        // Calculate scheduled days in the period
        let scheduledDaysCount = 0;
        
        for (let i = 0; i < daysBetween; i++) {
            const day = new Date(startDate);
            day.setDate(startDate.getDate() + i);
            
            // Get day of week for this date (0-6, where 0 is Sunday)
            const dayOfWeek = day.getDay();
            
            // Convert to our format (mon, tue, etc.)
            const dayKey = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][dayOfWeek];
            
            // Check if this day is in the habit frequency
            if (habit.frequency.includes(dayKey)) {
                scheduledDaysCount++;
            }
        }
        
        totalPossibleCompletions += scheduledDaysCount;
        totalActualCompletions += habit.completionDates ? habit.completionDates.length : 0;
    });
    
    if (totalPossibleCompletions > 0) {
        habitCompletionRate = Math.round((totalActualCompletions / totalPossibleCompletions) * 100);
    }
    
    document.getElementById('habits-completion-rate').textContent = habitCompletionRate + '%';
    
    // Focus hours
    const focusMinutes = data.timerSessions.reduce((total, session) => {
        if (session.type === 'pomodoro' && session.mode === 'focus') {
            return total + session.duration;
        } else if (session.type === 'flowmodoro' && session.mode === 'flow') {
            return total + session.duration;
        }
        return total;
    }, 0);
    
    const focusHours = Math.round(focusMinutes / 60);
    document.getElementById('focus-hours-count').textContent = focusHours;
    
    // Course progress average
    let courseProgressAvg = 0;
    if (data.courses.length > 0) {
        const totalProgress = data.courses.reduce((total, course) => total + (course.progress || 0), 0);
        courseProgressAvg = Math.round(totalProgress / data.courses.length);
    }
    
    document.getElementById('course-progress-avg').textContent = courseProgressAvg + '%';
}

/**
 * Create task completion chart
 * @param {Array} tasks - The filtered tasks data
 */
function createTaskCompletionChart(tasks) {
    const ctx = document.getElementById('task-completion-chart');
    if (!ctx) return;
    
    // Group tasks by day
    const tasksByDay = {};
    const now = new Date();
    
    // Generate labels based on time period
    let labels = [];
    let dateFormat = {};
    
    switch (currentTimePeriod) {
        case 'week':
            // Last 7 days
            for (let i = 6; i >= 0; i--) {
                const day = new Date(now);
                day.setDate(now.getDate() - i);
                const dateStr = day.toISOString().split('T')[0];
                labels.push(formatDate(day, 'short'));
                dateFormat[dateStr] = formatDate(day, 'short');
                tasksByDay[dateStr] = { completed: 0, created: 0 };
            }
            break;
            
        case 'month':
            // Last 30 days grouped by week
            for (let i = 0; i < 4; i++) {
                const day = new Date(now);
                day.setDate(now.getDate() - (i * 7) - 6);
                const dateStr = `Week ${4 - i}`;
                labels.push(dateStr);
                
                // Create week range for grouping
                const startOfWeek = new Date(now);
                startOfWeek.setDate(now.getDate() - (i * 7) - 6);
                const endOfWeek = new Date(now);
                endOfWeek.setDate(now.getDate() - (i * 7));
                
                tasksByDay[dateStr] = { 
                    completed: 0, 
                    created: 0,
                    startDate: startOfWeek,
                    endDate: endOfWeek
                };
            }
            break;
            
        case 'year':
            // Last 12 months
            for (let i = 11; i >= 0; i--) {
                const month = new Date(now);
                month.setMonth(now.getMonth() - i);
                const monthStr = month.toLocaleDateString('en-US', { month: 'short' });
                labels.push(monthStr);
                
                // Create month range for grouping
                const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
                const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0);
                
                tasksByDay[monthStr] = { 
                    completed: 0, 
                    created: 0,
                    startDate: startOfMonth,
                    endDate: endOfMonth
                };
            }
            break;
            
        case 'all':
            // Group by month if less than a year, else by year
            const oldestTask = tasks.reduce((oldest, task) => {
                const taskDate = new Date(task.createdAt);
                return taskDate < oldest ? taskDate : oldest;
            }, new Date());
            
            const monthsDiff = (now.getFullYear() - oldestTask.getFullYear()) * 12 + (now.getMonth() - oldestTask.getMonth());
            
            if (monthsDiff <= 12) {
                // Group by month
                for (let i = 0; i <= monthsDiff; i++) {
                    const month = new Date(oldestTask);
                    month.setMonth(oldestTask.getMonth() + i);
                    const monthStr = month.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                    labels.push(monthStr);
                    
                    // Create month range for grouping
                    const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
                    const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0);
                    
                    tasksByDay[monthStr] = { 
                        completed: 0, 
                        created: 0,
                        startDate: startOfMonth,
                        endDate: endOfMonth
                    };
                }
            } else {
                // Group by year
                const startYear = oldestTask.getFullYear();
                const endYear = now.getFullYear();
                
                for (let year = startYear; year <= endYear; year++) {
                    const yearStr = year.toString();
                    labels.push(yearStr);
                    
                    // Create year range for grouping
                    const startOfYear = new Date(year, 0, 1);
                    const endOfYear = new Date(year, 11, 31);
                    
                    tasksByDay[yearStr] = { 
                        completed: 0, 
                        created: 0,
                        startDate: startOfYear,
                        endDate: endOfYear
                    };
                }
            }
            break;
    }
    
    // Count tasks
    tasks.forEach(task => {
        const createdDate = new Date(task.createdAt);
        const completedDate = task.completed && task.completedAt ? new Date(task.completedAt) : null;
        
        // Format for simple day comparison
        let createdFormatted, completedFormatted;
        
        if (currentTimePeriod === 'week') {
            // Daily format
            createdFormatted = createdDate.toISOString().split('T')[0];
            completedFormatted = completedDate ? completedDate.toISOString().split('T')[0] : null;
            
            // Count task creation
            if (tasksByDay[createdFormatted]) {
                tasksByDay[createdFormatted].created++;
            }
            
            // Count task completion
            if (completedFormatted && tasksByDay[completedFormatted]) {
                tasksByDay[completedFormatted].completed++;
            }
        } else {
            // Grouped format (week, month, year)
            let found = false;
            
            for (const period in tasksByDay) {
                if (tasksByDay[period].startDate && tasksByDay[period].endDate) {
                    // Check task creation
                    if (createdDate >= tasksByDay[period].startDate && createdDate <= tasksByDay[period].endDate) {
                        tasksByDay[period].created++;
                        found = true;
                    }
                    
                    // Check task completion
                    if (completedDate && completedDate >= tasksByDay[period].startDate && completedDate <= tasksByDay[period].endDate) {
                        tasksByDay[period].completed++;
                    }
                }
            }
        }
    });
    
    // Prepare chart data
    const completedData = labels.map(label => tasksByDay[label]?.completed || 0);
    const createdData = labels.map(label => tasksByDay[label]?.created || 0);
    
    // Create or update chart
    if (taskCompletionChart) {
        taskCompletionChart.data.labels = labels;
        taskCompletionChart.data.datasets[0].data = completedData;
        taskCompletionChart.data.datasets[1].data = createdData;
        taskCompletionChart.update();
    } else {
        taskCompletionChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Completed',
                        data: completedData,
                        backgroundColor: '#6200ea',
                        borderColor: '#6200ea',
                        borderWidth: 1
                    },
                    {
                        label: 'Created',
                        data: createdData,
                        backgroundColor: '#03dac6',
                        borderColor: '#03dac6',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    },
                    legend: {
                        position: 'top',
                    }
                }
            }
        });
    }
}

/**
 * Create habit consistency chart
 * @param {Array} habits - The filtered habits data
 */
function createHabitConsistencyChart(habits) {
    const ctx = document.getElementById('habit-consistency-chart');
    if (!ctx) return;
    
    // Generate dates for the selected time period
    const dates = [];
    const now = new Date();
    let startDate;
    
    switch (currentTimePeriod) {
        case 'week':
            startDate = new Date(now);
            startDate.setDate(now.getDate() - 6);
            for (let i = 0; i < 7; i++) {
                const day = new Date(startDate);
                day.setDate(startDate.getDate() + i);
                dates.push(day.toISOString().split('T')[0]);
            }
            break;
            
        case 'month':
            startDate = new Date(now);
            startDate.setDate(now.getDate() - 29);
            for (let i = 0; i < 30; i++) {
                const day = new Date(startDate);
                day.setDate(startDate.getDate() + i);
                dates.push(day.toISOString().split('T')[0]);
            }
            break;
            
        case 'year':
            // Calculate completion rate per month for the last year
            dates.length = 0; // Clear dates array
            
            for (let i = 11; i >= 0; i--) {
                const month = new Date(now);
                month.setMonth(now.getMonth() - i);
                dates.push(month.toLocaleDateString('en-US', { month: 'short' }));
            }
            break;
            
        case 'all':
            // For all-time, we'll use a different approach - show streak distribution
            break;
    }
    
    // Calculate completion rates
    const completionRates = [];
    
    if (currentTimePeriod === 'all') {
        // For all-time, calculate average streak lengths
        const habitNames = habits.map(habit => habit.name);
        const streakData = habits.map(habit => habit.longestStreak || 0);
        
        // Create or update chart
        if (habitConsistencyChart) {
            habitConsistencyChart.destroy(); // Need to destroy and recreate for different chart type
        }
        
        habitConsistencyChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: habitNames,
                datasets: [{
                    label: 'Longest Streak (days)',
                    data: streakData,
                    backgroundColor: '#6200ea',
                    borderColor: '#6200ea',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Longest streak: ${context.raw} days`;
                            }
                        }
                    },
                    legend: {
                        position: 'top'
                    }
                }
            }
        });
        
        return;
    } else if (currentTimePeriod === 'year') {
        // For yearly view, calculate monthly completion rates
        const monthlyCompletionRates = new Array(12).fill(0);
        const monthlyPossibleCompletions = new Array(12).fill(0);
        
        habits.forEach(habit => {
            if (!habit.completionDates || !habit.frequency || habit.frequency.length === 0) return;
            
            // Group completion dates by month
            habit.completionDates.forEach(dateStr => {
                const date = new Date(dateStr);
                const monthsAgo = (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth());
                
                if (monthsAgo >= 0 && monthsAgo < 12) {
                    const monthIndex = 11 - monthsAgo;
                    monthlyCompletionRates[monthIndex]++;
                }
            });
            
            // Calculate potential completions per month
            for (let i = 0; i < 12; i++) {
                const month = new Date(now);
                month.setMonth(now.getMonth() - (11 - i));
                
                const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
                let scheduledDaysInMonth = 0;
                
                for (let day = 1; day <= daysInMonth; day++) {
                    const date = new Date(month.getFullYear(), month.getMonth(), day);
                    const dayOfWeek = date.getDay();
                    const dayKey = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][dayOfWeek];
                    
                    if (habit.frequency.includes(dayKey)) {
                        scheduledDaysInMonth++;
                    }
                }
                
                monthlyPossibleCompletions[i] += scheduledDaysInMonth;
            }
        });
        
        // Calculate completion rates for each month
        for (let i = 0; i < 12; i++) {
            if (monthlyPossibleCompletions[i] > 0) {
                completionRates.push((monthlyCompletionRates[i] / monthlyPossibleCompletions[i]) * 100);
            } else {
                completionRates.push(0);
            }
        }
    } else {
        // For daily view (week or month)
        dates.forEach(dateStr => {
            let scheduled = 0;
            let completed = 0;
            
            habits.forEach(habit => {
                if (!habit.frequency) return;
                
                // Check if this habit is scheduled for this date
                const date = new Date(dateStr);
                const dayOfWeek = date.getDay();
                const dayKey = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][dayOfWeek];
                
                if (habit.frequency.includes(dayKey)) {
                    scheduled++;
                    
                    // Check if this habit was completed on this date
                    if (habit.completionDates && habit.completionDates.includes(dateStr)) {
                        completed++;
                    }
                }
            });
            
            // Calculate completion rate for this date
            if (scheduled > 0) {
                completionRates.push((completed / scheduled) * 100);
            } else {
                completionRates.push(0);
            }
        });
    }
    
    // Format labels based on time period
    let labels;
    if (currentTimePeriod === 'week') {
        labels = dates.map(dateStr => {
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-US', { weekday: 'short' });
        });
    } else if (currentTimePeriod === 'month') {
        labels = dates.map(dateStr => {
            const date = new Date(dateStr);
            return date.getDate();
        });
    } else {
        labels = dates; // For year view, already formatted as month names
    }
    
    // Create or update chart
    if (habitConsistencyChart) {
        habitConsistencyChart.data.labels = labels;
        habitConsistencyChart.data.datasets[0].data = completionRates;
        habitConsistencyChart.update();
    } else {
        habitConsistencyChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Completion Rate (%)',
                    data: completionRates,
                    fill: false,
                    backgroundColor: '#6200ea',
                    borderColor: '#6200ea',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Completion rate: ${Math.round(context.raw)}%`;
                            }
                        }
                    },
                    legend: {
                        position: 'top'
                    }
                }
            }
        });
    }
}

/**
 * Create focus time chart
 * @param {Array} timerSessions - The filtered timer sessions data
 */
function createFocusTimeChart(timerSessions) {
    const ctx = document.getElementById('focus-time-chart');
    if (!ctx) return;
    
    // Separate pomodoro and flowmodoro sessions
    const pomodoroSessions = timerSessions.filter(session => session.type === 'pomodoro' && session.mode === 'focus');
    const flowmodoroSessions = timerSessions.filter(session => session.type === 'flowmodoro' && session.mode === 'flow');
    
    // Calculate total minutes per day/week/month based on time period
    const pomodoroData = {};
    const flowmodoroData = {};
    let labels = [];
    
    switch (currentTimePeriod) {
        case 'week':
            // Last 7 days
            for (let i = 6; i >= 0; i--) {
                const day = new Date();
                day.setDate(day.getDate() - i);
                const dateStr = day.toISOString().split('T')[0];
                const label = day.toLocaleDateString('en-US', { weekday: 'short' });
                
                labels.push(label);
                pomodoroData[label] = 0;
                flowmodoroData[label] = 0;
            }
            
            // Process sessions
            pomodoroSessions.forEach(session => {
                const date = new Date(session.endTime);
                const label = date.toLocaleDateString('en-US', { weekday: 'short' });
                if (pomodoroData[label] !== undefined) {
                    pomodoroData[label] += session.duration / 60; // Convert seconds to minutes
                }
            });
            
            flowmodoroSessions.forEach(session => {
                const date = new Date(session.endTime);
                const label = date.toLocaleDateString('en-US', { weekday: 'short' });
                if (flowmodoroData[label] !== undefined) {
                    flowmodoroData[label] += session.duration / 60; // Convert seconds to minutes
                }
            });
            break;
            
        case 'month':
            // Group by week
            for (let i = 0; i < 4; i++) {
                const label = `Week ${4 - i}`;
                labels.push(label);
                pomodoroData[label] = 0;
                flowmodoroData[label] = 0;
                
                // Define week boundaries
                const endDate = new Date();
                endDate.setDate(endDate.getDate() - (i * 7));
                const startDate = new Date(endDate);
                startDate.setDate(endDate.getDate() - 6);
                
                // Process sessions for this week
                pomodoroSessions.forEach(session => {
                    const sessionDate = new Date(session.endTime);
                    if (sessionDate >= startDate && sessionDate <= endDate) {
                        pomodoroData[label] += session.duration / 60;
                    }
                });
                
                flowmodoroSessions.forEach(session => {
                    const sessionDate = new Date(session.endTime);
                    if (sessionDate >= startDate && sessionDate <= endDate) {
                        flowmodoroData[label] += session.duration / 60;
                    }
                });
            }
            break;
            
        case 'year':
            // Group by month
            for (let i = 11; i >= 0; i--) {
                const month = new Date();
                month.setMonth(month.getMonth() - i);
                const label = month.toLocaleDateString('en-US', { month: 'short' });
                
                labels.push(label);
                pomodoroData[label] = 0;
                flowmodoroData[label] = 0;
                
                // Define month boundaries
                const year = month.getFullYear();
                const monthIndex = month.getMonth();
                const startDate = new Date(year, monthIndex, 1);
                const endDate = new Date(year, monthIndex + 1, 0);
                
                // Process sessions for this month
                pomodoroSessions.forEach(session => {
                    const sessionDate = new Date(session.endTime);
                    if (sessionDate >= startDate && sessionDate <= endDate) {
                        pomodoroData[label] += session.duration / 60;
                    }
                });
                
                flowmodoroSessions.forEach(session => {
                    const sessionDate = new Date(session.endTime);
                    if (sessionDate >= startDate && sessionDate <= endDate) {
                        flowmodoroData[label] += session.duration / 60;
                    }
                });
            }
            break;
            
        case 'all':
            // Get the earliest session date
            let earliestDate = new Date();
            timerSessions.forEach(session => {
                const sessionDate = new Date(session.startTime);
                if (sessionDate < earliestDate) {
                    earliestDate = sessionDate;
                }
            });
            
            // Determine if we should group by month or year
            const monthsDiff = (new Date().getFullYear() - earliestDate.getFullYear()) * 12 + (new Date().getMonth() - earliestDate.getMonth());
            
            if (monthsDiff <= 12) {
                // Group by month
                for (let i = 0; i <= monthsDiff; i++) {
                    const month = new Date(earliestDate);
                    month.setMonth(earliestDate.getMonth() + i);
                    const label = month.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                    
                    labels.push(label);
                    pomodoroData[label] = 0;
                    flowmodoroData[label] = 0;
                    
                    // Define month boundaries
                    const year = month.getFullYear();
                    const monthIndex = month.getMonth();
                    const startDate = new Date(year, monthIndex, 1);
                    const endDate = new Date(year, monthIndex + 1, 0);
                    
                    // Process sessions for this month
                    pomodoroSessions.forEach(session => {
                        const sessionDate = new Date(session.endTime);
                        if (sessionDate >= startDate && sessionDate <= endDate) {
                            pomodoroData[label] += session.duration / 60;
                        }
                    });
                    
                    flowmodoroSessions.forEach(session => {
                        const sessionDate = new Date(session.endTime);
                        if (sessionDate >= startDate && sessionDate <= endDate) {
                            flowmodoroData[label] += session.duration / 60;
                        }
                    });
                }
            } else {
                // Group by year
                const startYear = earliestDate.getFullYear();
                const endYear = new Date().getFullYear();
                
                for (let year = startYear; year <= endYear; year++) {
                    const label = year.toString();
                    
                    labels.push(label);
                    pomodoroData[label] = 0;
                    flowmodoroData[label] = 0;
                    
                    // Define year boundaries
                    const startDate = new Date(year, 0, 1);
                    const endDate = new Date(year, 11, 31);
                    
                    // Process sessions for this year
                    pomodoroSessions.forEach(session => {
                        const sessionDate = new Date(session.endTime);
                        if (sessionDate >= startDate && sessionDate <= endDate) {
                            pomodoroData[label] += session.duration / 60;
                        }
                    });
                    
                    flowmodoroSessions.forEach(session => {
                        const sessionDate = new Date(session.endTime);
                        if (sessionDate >= startDate && sessionDate <= endDate) {
                            flowmodoroData[label] += session.duration / 60;
                        }
                    });
                }
            }
            break;
    }
    
    // Convert data objects to arrays
    const pomodoroMinutes = labels.map(label => Math.round(pomodoroData[label]));
    const flowmodoroMinutes = labels.map(label => Math.round(flowmodoroData[label]));
    
    // Create or update chart
    if (focusTimeChart) {
        focusTimeChart.data.labels = labels;
        focusTimeChart.data.datasets[0].data = pomodoroMinutes;
        focusTimeChart.data.datasets[1].data = flowmodoroMinutes;
        focusTimeChart.update();
    } else {
        focusTimeChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Pomodoro',
                        data: pomodoroMinutes,
                        backgroundColor: '#6200ea',
                        borderColor: '#6200ea',
                        borderWidth: 1,
                        stack: 'Stack 0'
                    },
                    {
                        label: 'Flowmodoro',
                        data: flowmodoroMinutes,
                        backgroundColor: '#03dac6',
                        borderColor: '#03dac6',
                        borderWidth: 1,
                        stack: 'Stack 0'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        stacked: true
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return value + ' min';
                            }
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: ${context.raw} min`;
                            }
                        }
                    },
                    legend: {
                        position: 'top'
                    }
                }
            }
        });
    }
}

/**
 * Create course progress chart
 * @param {Array} courses - The filtered courses data
 */
function createCourseProgressChart(courses) {
    const ctx = document.getElementById('course-progress-chart');
    if (!ctx) return;
    
    // Only show courses with progress
    const activeCourses = courses.filter(course => course.status === 'in-progress' || course.status === 'completed')
                              .sort((a, b) => b.progress - a.progress)
                              .slice(0, 5); // Limit to top 5 courses by progress
    
    const labels = activeCourses.map(course => course.title);
    const progressData = activeCourses.map(course => course.progress || 0);
    const backgroundColors = activeCourses.map(course => {
        if (course.status === 'completed') {
            return '#00c853'; // Green for completed
        } else {
            return '#6200ea'; // Purple for in-progress
        }
    });
    
    // Create or update chart
    if (courseProgressChart) {
        courseProgressChart.data.labels = labels;
        courseProgressChart.data.datasets[0].data = progressData;
        courseProgressChart.data.datasets[0].backgroundColor = backgroundColors;
        courseProgressChart.update();
    } else {
        courseProgressChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Progress (%)',
                    data: progressData,
                    backgroundColor: backgroundColors,
                    borderColor: 'rgba(0, 0, 0, 0.1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                scales: {
                    x: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const course = activeCourses[context.dataIndex];
                                const status = course.status === 'completed' ? 'Completed' : 'In Progress';
                                return [`Progress: ${context.raw}%`, `Status: ${status}`];
                            }
                        }
                    },
                    legend: {
                        display: false
                    }
                }
            }
        });
    }
}

/**
 * Create productive days chart
 * @param {Object} data - The filtered data set
 */
function createProductiveDaysChart(data) {
    const ctx = document.getElementById('productive-days-chart');
    if (!ctx) return;
    
    // Analyze productivity by day of week
    const productivityByDay = [0, 0, 0, 0, 0, 0, 0]; // Sun, Mon, Tue, Wed, Thu, Fri, Sat
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    // Count completed tasks by day
    data.tasks.forEach(task => {
        if (task.completed && task.completedAt) {
            const completedDate = new Date(task.completedAt);
            const dayOfWeek = completedDate.getDay();
            productivityByDay[dayOfWeek]++;
        }
    });
    
    // Count habit completions by day
    data.habits.forEach(habit => {
        if (habit.completionDates) {
            habit.completionDates.forEach(dateStr => {
                const completionDate = new Date(dateStr);
                const dayOfWeek = completionDate.getDay();
                productivityByDay[dayOfWeek]++;
            });
        }
    });
    
    // Count focus time by day
    const focusTimeByDay = [0, 0, 0, 0, 0, 0, 0]; // Sun, Mon, Tue, Wed, Thu, Fri, Sat
    
    data.timerSessions.forEach(session => {
        if ((session.type === 'pomodoro' && session.mode === 'focus') || 
            (session.type === 'flowmodoro' && session.mode === 'flow')) {
            const sessionDate = new Date(session.endTime);
            const dayOfWeek = sessionDate.getDay();
            focusTimeByDay[dayOfWeek] += session.duration / 60; // Convert seconds to minutes
        }
    });
    
    // Normalize data for comparison
    const maxProductivity = Math.max(...productivityByDay);
    const normalizedProductivity = productivityByDay.map(val => maxProductivity > 0 ? (val / maxProductivity) * 100 : 0);
    
    // Create or update chart
    if (productiveDaysChart) {
        productiveDaysChart.data.datasets[0].data = normalizedProductivity;
        productiveDaysChart.update();
    } else {
        productiveDaysChart = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: dayNames,
                datasets: [{
                    label: 'Productivity Score',
                    data: normalizedProductivity,
                    fill: true,
                    backgroundColor: 'rgba(98, 0, 234, 0.2)',
                    borderColor: '#6200ea',
                    pointBackgroundColor: '#6200ea',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: '#6200ea'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            display: false
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const dayIndex = context.dataIndex;
                                const taskCount = productivityByDay[dayIndex];
                                const focusTime = Math.round(focusTimeByDay[dayIndex]);
                                return [
                                    `${context.dataset.label}: ${Math.round(context.raw)}%`,
                                    `Completed items: ${taskCount}`,
                                    `Focus time: ${focusTime} min`
                                ];
                            }
                        }
                    },
                    legend: {
                        position: 'top'
                    }
                }
            }
        });
    }
}

/**
 * Create task categories chart
 * @param {Array} tasks - The filtered tasks data
 */
function createTaskCategoriesChart(tasks) {
    const ctx = document.getElementById('task-categories-chart');
    if (!ctx) return;
    
    // Get completed tasks
    const completedTasks = tasks.filter(task => task.completed);
    
    // Group by category
    const categories = {};
    
    completedTasks.forEach(task => {
        const category = task.category || 'other';
        if (!categories[category]) {
            categories[category] = 0;
        }
        categories[category]++;
    });
    
    // Prepare chart data
    const labels = Object.keys(categories).map(cat => capitalizeFirstLetter(cat));
    const data = Object.values(categories);
    
    // Define colors for each category
    const categoryColors = {
        work: '#f44336',
        personal: '#2196f3',
        study: '#ff9800',
        health: '#4caf50',
        other: '#9c27b0'
    };
    
    const backgroundColors = Object.keys(categories).map(cat => categoryColors[cat] || '#6200ea');
    
    // Create or update chart
    if (taskCategoriesChart) {
        taskCategoriesChart.data.labels = labels;
        taskCategoriesChart.data.datasets[0].data = data;
        taskCategoriesChart.data.datasets[0].backgroundColor = backgroundColors;
        taskCategoriesChart.update();
    } else {
        taskCategoriesChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Completed Tasks',
                    data: data,
                    backgroundColor: backgroundColors,
                    borderColor: '#ffffff',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw;
                                const total = context.dataset.data.reduce((acc, val) => acc + val, 0);
                                const percentage = Math.round((value / total) * 100);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }
}

/**
 * Update goal progress bars
 * @param {Object} data - The filtered data set
 */
function updateGoalProgress(data) {
    // Daily task goal - 5 tasks per day
    const dailyTaskGoal = 5;
    const today = new Date().toISOString().split('T')[0];
    
    const completedTodayCount = data.tasks.filter(task => 
        task.completed && 
        task.completedAt && 
        task.completedAt.startsWith(today)
    ).length;
    
    const dailyTaskProgress = Math.min((completedTodayCount / dailyTaskGoal) * 100, 100);
    
    document.getElementById('daily-task-progress').style.width = `${dailyTaskProgress}%`;
    document.getElementById('daily-task-progress').setAttribute('aria-valuenow', dailyTaskProgress);
    document.getElementById('daily-task-progress-text').textContent = `${completedTodayCount}/${dailyTaskGoal} completed`;
    
    // Weekly habit goal - 80% completion rate
    const habitGoal = 80; // 80%
    
    // Calculate this week's habit completion rate
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Sunday
    startOfWeek.setHours(0, 0, 0, 0);
    
    let totalScheduled = 0;
    let totalCompleted = 0;
    
    data.habits.forEach(habit => {
        if (!habit.frequency || habit.frequency.length === 0) return;
        
        // Count scheduled days in this week
        for (let i = 0; i < 7; i++) {
            const day = new Date(startOfWeek);
            day.setDate(startOfWeek.getDate() + i);
            
            // Skip future days
            if (day > new Date()) continue;
            
            // Get day of week for this date
            const dayOfWeek = day.getDay();
            const dayKey = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][dayOfWeek];
            
            // Check if this day is in the habit frequency
            if (habit.frequency.includes(dayKey)) {
                totalScheduled++;
                
                // Check if completed
                const dateStr = day.toISOString().split('T')[0];
                if (habit.completionDates && habit.completionDates.includes(dateStr)) {
                    totalCompleted++;
                }
            }
        }
    });
    
    const weeklyHabitRate = totalScheduled > 0 ? Math.round((totalCompleted / totalScheduled) * 100) : 0;
    const weeklyHabitProgress = Math.min((weeklyHabitRate / habitGoal) * 100, 100);
    
    document.getElementById('weekly-habit-progress').style.width = `${weeklyHabitProgress}%`;
    document.getElementById('weekly-habit-progress').setAttribute('aria-valuenow', weeklyHabitProgress);
    document.getElementById('weekly-habit-progress-text').textContent = `${weeklyHabitRate}% completion rate`;
    
    // Monthly focus goal - 20 hours
    const focusGoal = 20 * 60; // 20 hours in minutes
    
    // Calculate this month's focus time
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    let totalFocusMinutes = 0;
    
    data.timerSessions.forEach(session => {
        const sessionDate = new Date(session.endTime);
        
        // Only count sessions from this month
        if (sessionDate >= startOfMonth) {
            if ((session.type === 'pomodoro' && session.mode === 'focus') || 
                (session.type === 'flowmodoro' && session.mode === 'flow')) {
                totalFocusMinutes += session.duration / 60; // Convert seconds to minutes
            }
        }
    });
    
    const focusHours = Math.round(totalFocusMinutes / 60);
    const monthlyFocusProgress = Math.min((focusHours / 20) * 100, 100);
    
    document.getElementById('monthly-focus-progress').style.width = `${monthlyFocusProgress}%`;
    document.getElementById('monthly-focus-progress').setAttribute('aria-valuenow', monthlyFocusProgress);
    document.getElementById('monthly-focus-progress-text').textContent = `${focusHours}/20 hours`;
}

/**
 * Generate insights based on data analysis
 */
function generateInsights() {
    const insightsContainer = document.getElementById('insights-container');
    const emptyState = document.getElementById('empty-insights-state');
    
    if (!insightsContainer) return;
    
    // Clear existing insights
    Array.from(insightsContainer.children).forEach(child => {
        if (child !== emptyState) {
            insightsContainer.removeChild(child);
        }
    });
    
    // Generate insights asynchronously
    generateInsightsAsync().then(insights => {
        if (insights.length === 0) {
            if (emptyState) {
                emptyState.style.display = 'block';
            }
            return;
        }
        
        // Hide empty state if we have insights
        if (emptyState) {
            emptyState.style.display = 'none';
        }
        
        // Add insights to container
        insights.forEach(insight => {
            const insightElement = createInsightElement(insight);
            insightsContainer.appendChild(insightElement);
        });
    });
}

/**
 * Generate insights asynchronously
 * @returns {Promise<Array>} - Promise resolving to array of insights
 */
async function generateInsightsAsync() {
    try {
        // Load necessary data
        const [tasks, habits, timerSessions, courses] = await Promise.all([
            db.getTasks(),
            db.getHabits(),
            db.getTimerSessions(),
            db.getCourses()
        ]);
        
        const insights = [];
        
        // Most productive day
        if (timerSessions.length > 0) {
            const focusByDay = [0, 0, 0, 0, 0, 0, 0]; // Sun to Sat
            
            timerSessions.forEach(session => {
                if ((session.type === 'pomodoro' && session.mode === 'focus') || 
                    (session.type === 'flowmodoro' && session.mode === 'flow')) {
                    const sessionDate = new Date(session.endTime);
                    const dayOfWeek = sessionDate.getDay();
                    focusByDay[dayOfWeek] += session.duration;
                }
            });
            
            const maxFocusDay = focusByDay.indexOf(Math.max(...focusByDay));
            const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][maxFocusDay];
            
            if (focusByDay[maxFocusDay] > 0) {
                insights.push({
                    title: 'Most Productive Day',
                    description: `${dayName} is your most productive day with an average of ${Math.round(focusByDay[maxFocusDay] / 60 / 60)} hours of focus time.`,
                    icon: 'fa-calendar-check'
                });
            }
        }
        
        // Task completion trends
        if (tasks.length >= 10) {
            const completedTasks = tasks.filter(task => task.completed);
            const totalTasks = tasks.length;
            const completionRate = Math.round((completedTasks.length / totalTasks) * 100);
            
            insights.push({
                title: 'Task Completion Rate',
                description: `Your overall task completion rate is ${completionRate}%. ${
                    completionRate >= 80 ? 'Great job staying on top of your tasks!' : 
                    completionRate >= 50 ? 'You\'re making good progress.' : 
                    'Consider breaking down tasks into smaller steps for better progress.'
                }`,
                icon: 'fa-tasks'
            });
        }
        
        // Habit consistency
        if (habits.length > 0) {
            const streaks = habits.map(habit => habit.currentStreak || 0);
            const maxStreak = Math.max(...streaks);
            const habitWithLongestStreak = habits.find(h => (h.currentStreak || 0) === maxStreak);
            
            if (maxStreak >= 3 && habitWithLongestStreak) {
                insights.push({
                    title: 'Longest Habit Streak',
                    description: `Your habit "${habitWithLongestStreak.name}" has a ${maxStreak}-day streak. Keep it up!`,
                    icon: 'fa-fire'
                });
            }
            
            // Habits that need attention
            const habitsMissingYesterday = habits.filter(habit => {
                if (!habit.frequency || habit.frequency.length === 0) return false;
                
                // Check if the habit was scheduled for yesterday
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayStr = yesterday.toISOString().split('T')[0];
                const dayOfWeek = yesterday.getDay();
                const dayKey = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][dayOfWeek];
                
                // Return habits that were scheduled but not completed yesterday
                return habit.frequency.includes(dayKey) && 
                       (!habit.completionDates || !habit.completionDates.includes(yesterdayStr));
            });
            
            if (habitsMissingYesterday.length > 0) {
                insights.push({
                    title: 'Habits Needing Attention',
                    description: `You missed ${habitsMissingYesterday.length} habit${habitsMissingYesterday.length === 1 ? '' : 's'} yesterday. Check in on ${habitsMissingYesterday.map(h => `"${h.name}"`).join(', ')}.`,
                    icon: 'fa-exclamation-circle'
                });
            }
        }
        
        // Focus time insights
        if (timerSessions.length > 0) {
            const totalFocusSeconds = timerSessions.reduce((total, session) => {
                if ((session.type === 'pomodoro' && session.mode === 'focus') || 
                    (session.type === 'flowmodoro' && session.mode === 'flow')) {
                    return total + session.duration;
                }
                return total;
            }, 0);
            
            const focusHours = Math.round(totalFocusSeconds / 3600);
            
            insights.push({
                title: 'Total Focus Time',
                description: `You've logged ${focusHours} hour${focusHours === 1 ? '' : 's'} of deep work. ${
                    focusHours >= 40 ? 'That\'s impressive focus!' : 
                    focusHours >= 10 ? 'You\'re building great focus habits.' : 
                    'Try scheduling regular focus sessions to improve productivity.'
                }`,
                icon: 'fa-clock'
            });
        }
        
        // Course progress insights
        if (courses.length > 0) {
            const inProgressCourses = courses.filter(course => course.status === 'in-progress');
            const completedCourses = courses.filter(course => course.status === 'completed');
            
            if (completedCourses.length > 0) {
                insights.push({
                    title: 'Learning Progress',
                    description: `You've completed ${completedCourses.length} course${completedCourses.length === 1 ? '' : 's'}! ${
                        inProgressCourses.length > 0 ? `You have ${inProgressCourses.length} course${inProgressCourses.length === 1 ? '' : 's'} in progress.` : 
                        'Ready to start a new learning journey?'
                    }`,
                    icon: 'fa-graduation-cap'
                });
            } else if (inProgressCourses.length > 0) {
                // Find course closest to completion
                const nearlyCompleteCourse = inProgressCourses.reduce((prev, current) => 
                    (current.progress || 0) > (prev.progress || 0) ? current : prev
                );
                
                if (nearlyCompleteCourse.progress >= 70) {
                    insights.push({
                        title: 'Almost There!',
                        description: `Your course "${nearlyCompleteCourse.title}" is ${nearlyCompleteCourse.progress}% complete. Keep going to finish it!`,
                        icon: 'fa-book'
                    });
                }
            }
        }
        
        // Return insights, limited to 3
        return insights.slice(0, 3);
    } catch (error) {
        console.error('Error generating insights:', error);
        return [];
    }
}

/**
 * Create an insight element for the UI
 * @param {Object} insight - The insight object
 * @returns {HTMLElement} - The insight element
 */
function createInsightElement(insight) {
    const insightElement = document.createElement('div');
    insightElement.className = 'insight-card';
    
    insightElement.innerHTML = `
        <h5><i class="fas ${insight.icon}"></i> ${escapeHTML(insight.title)}</h5>
        <p>${escapeHTML(insight.description)}</p>
    `;
    
    return insightElement;
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
