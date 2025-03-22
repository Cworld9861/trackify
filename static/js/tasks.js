/**
 * Trackify - Tasks Module
 * Handles task management functionality
 */

// Task management variables
let tasks = [];
let filteredTasks = [];
let currentFilter = 'all';
let currentSort = 'dueDate';
let searchTerm = '';
let currentDayFilter = new Date().getDay(); // Default to current day of week

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    initTasksPage();
});

/**
 * Initialize the tasks page
 */
async function initTasksPage() {
    // Set up event listeners for task-specific UI elements
    setupTaskEventListeners();
    
    // Load tasks from database
    await loadTasks();
    
    // Render tasks in the UI
    renderTasks();
}

/**
 * Set up event listeners for task-specific UI elements
 */
function setupTaskEventListeners() {
    // Add task button
    const addTaskBtn = document.getElementById('add-task-btn');
    if (addTaskBtn) {
        addTaskBtn.addEventListener('click', () => openTaskModal());
    }
    
    // Save task button in modal
    const saveTaskBtn = document.getElementById('save-task-btn');
    if (saveTaskBtn) {
        saveTaskBtn.addEventListener('click', saveTask);
    }
    
    // Filter buttons
    const filterButtons = document.querySelectorAll('.btn-filter');
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            currentFilter = button.getAttribute('data-filter');
            filterAndSortTasks();
            renderTasks();
        });
    });
    
    // Sort dropdown
    const sortSelect = document.getElementById('sort-tasks');
    if (sortSelect) {
        sortSelect.addEventListener('change', () => {
            currentSort = sortSelect.value;
            filterAndSortTasks();
            renderTasks();
        });
    }
    
    // Search input
    const searchInput = document.getElementById('task-search');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            searchTerm = searchInput.value.toLowerCase().trim();
            filterAndSortTasks();
            renderTasks();
        });
    }
    
    // Weekday filter buttons
    const weekdayButtons = document.querySelectorAll('.weekday-filter');
    weekdayButtons.forEach(button => {
        button.addEventListener('click', () => {
            weekdayButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            currentDayFilter = parseInt(button.getAttribute('data-day'));
            filterAndSortTasks();
            renderTasks();
        });
    });
    
    // Repeating task checkbox in modal
    const repeatingCheckbox = document.getElementById('task-repeating');
    if (repeatingCheckbox) {
        repeatingCheckbox.addEventListener('change', () => {
            const repeatDaysContainer = document.getElementById('repeat-days-container');
            if (repeatDaysContainer) {
                repeatDaysContainer.style.display = repeatingCheckbox.checked ? 'block' : 'none';
            }
        });
    }
}

/**
 * Load tasks from the database
 */
async function loadTasks() {
    try {
        tasks = await db.getTasks();
        console.log('Tasks loaded:', tasks.length);
        filterAndSortTasks();
    } catch (error) {
        console.error('Error loading tasks:', error);
        showNotification('Failed to load tasks', 'error');
    }
}

/**
 * Filter and sort tasks based on current selections
 */
function filterAndSortTasks() {
    // First apply search filter
    let filtered = tasks;
    
    if (searchTerm) {
        filtered = filtered.filter(task => 
            task.title.toLowerCase().includes(searchTerm) || 
            (task.description && task.description.toLowerCase().includes(searchTerm))
        );
    }
    
    // Then apply category filter
    switch (currentFilter) {
        case 'today':
            // Get today's date without time
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            // Filter tasks due today
            filtered = filtered.filter(task => {
                if (!task.dueDate) return false;
                
                const dueDate = new Date(task.dueDate);
                dueDate.setHours(0, 0, 0, 0);
                
                return dueDate.getTime() === today.getTime();
            });
            break;
            
        case 'upcoming':
            // Get tomorrow's date without time
            const tomorrow = new Date();
            tomorrow.setHours(0, 0, 0, 0);
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            // Filter tasks due in the future
            filtered = filtered.filter(task => {
                if (!task.dueDate) return false;
                
                const dueDate = new Date(task.dueDate);
                dueDate.setHours(0, 0, 0, 0);
                
                return dueDate.getTime() >= tomorrow.getTime();
            });
            break;
            
        case 'completed':
            // Filter completed tasks
            filtered = filtered.filter(task => task.completed);
            break;
            
        case 'all':
        default:
            // No additional filtering needed
            break;
    }
    
    // Sort tasks based on selected sort option
    filtered.sort((a, b) => {
        switch (currentSort) {
            case 'dueDate':
                // Handle null due dates (put them at the end)
                if (!a.dueDate && !b.dueDate) return 0;
                if (!a.dueDate) return 1;
                if (!b.dueDate) return -1;
                
                return new Date(a.dueDate) - new Date(b.dueDate);
                
            case 'priority':
                // Convert priority to numeric value for sorting
                const priorityValues = { high: 1, medium: 2, low: 3 };
                const aPriority = priorityValues[a.priority] || 999;
                const bPriority = priorityValues[b.priority] || 999;
                
                return aPriority - bPriority;
                
            case 'name':
                return a.title.localeCompare(b.title);
                
            case 'createdAt':
                return new Date(b.createdAt) - new Date(a.createdAt);
                
            default:
                return 0;
        }
    });
    
    filteredTasks = filtered;
}

/**
 * Render tasks in the UI
 */
function renderTasks() {
    const tasksList = document.getElementById('tasks-list');
    const emptyState = document.getElementById('empty-tasks-state');
    
    if (!tasksList) return;
    
    // Clear current tasks except for the empty state
    Array.from(tasksList.children).forEach(child => {
        if (child !== emptyState) {
            tasksList.removeChild(child);
        }
    });
    
    // Show empty state if no tasks
    if (filteredTasks.length === 0) {
        if (emptyState) {
            emptyState.style.display = 'block';
        }
        return;
    }
    
    // Hide empty state if we have tasks
    if (emptyState) {
        emptyState.style.display = 'none';
    }
    
    // Add each task to the list
    filteredTasks.forEach(task => {
        const taskElement = createTaskElement(task);
        tasksList.appendChild(taskElement);
    });
}

/**
 * Create a task element for the UI
 * @param {Object} task - The task object
 * @returns {HTMLElement} - The task element
 */
function createTaskElement(task) {
    const taskElement = document.createElement('div');
    taskElement.className = 'task-card';
    taskElement.dataset.id = task.id;
    
    // Add "completed" class if task is completed
    if (task.completed) {
        taskElement.classList.add('completed');
    }
    
    // Create the task checkbox
    const checkbox = document.createElement('div');
    checkbox.className = 'task-checkbox';
    checkbox.innerHTML = `
        <div class="form-check">
            <input class="form-check-input" type="checkbox" ${task.completed ? 'checked' : ''}>
        </div>
    `;
    
    // Add click event to checkbox
    const checkboxInput = checkbox.querySelector('input');
    checkboxInput.addEventListener('change', () => toggleTaskCompleted(task.id, checkboxInput.checked));
    
    // Create the task content
    const content = document.createElement('div');
    content.className = 'task-content';
    
    // Format due date
    let dueDateDisplay = '';
    if (task.dueDate) {
        const dueDate = new Date(task.dueDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        dueDate.setHours(0, 0, 0, 0);
        
        if (dueDate.getTime() === today.getTime()) {
            dueDateDisplay = 'Today';
        } else if (dueDate.getTime() === tomorrow.getTime()) {
            dueDateDisplay = 'Tomorrow';
        } else {
            dueDateDisplay = formatDate(dueDate, 'medium');
        }
    }
    
    // Get priority class
    const priorityClass = task.priority ? `task-priority ${task.priority}` : '';
    
    // Set content HTML
    content.innerHTML = `
        <h3 class="task-title">${escapeHTML(task.title)}</h3>
        ${task.description ? `<p class="task-description">${escapeHTML(task.description)}</p>` : ''}
        <div class="task-meta">
            ${task.dueDate ? `<span><i class="far fa-calendar-alt"></i> ${dueDateDisplay}</span>` : ''}
            ${task.priority ? `<span class="${priorityClass}">${capitalizeFirstLetter(task.priority)}</span>` : ''}
            ${task.category ? `<span><i class="fas fa-tag"></i> ${capitalizeFirstLetter(task.category)}</span>` : ''}
        </div>
    `;
    
    // Create task actions
    const actions = document.createElement('div');
    actions.className = 'task-actions-menu';
    actions.innerHTML = `
        <button class="edit-task-btn" title="Edit Task"><i class="fas fa-edit"></i></button>
        <button class="delete-task-btn" title="Delete Task"><i class="fas fa-trash"></i></button>
    `;
    
    // Add event listeners for actions
    const editBtn = actions.querySelector('.edit-task-btn');
    editBtn.addEventListener('click', () => openTaskModal(task));
    
    const deleteBtn = actions.querySelector('.delete-task-btn');
    deleteBtn.addEventListener('click', () => confirmDeleteTask(task.id));
    
    // Assemble the task element
    taskElement.appendChild(checkbox);
    taskElement.appendChild(content);
    taskElement.appendChild(actions);
    
    return taskElement;
}

/**
 * Open the task modal for adding or editing a task
 * @param {Object} task - The task to edit (null for a new task)
 */
function openTaskModal(task = null) {
    const modal = new bootstrap.Modal(document.getElementById('taskModal'));
    const form = document.getElementById('task-form');
    const modalTitle = document.getElementById('taskModalLabel');
    
    // Reset the form
    form.reset();
    
    // Set modal title
    modalTitle.textContent = task ? 'Edit Task' : 'Add New Task';
    
    // Reset repeat days container visibility
    const repeatDaysContainer = document.getElementById('repeat-days-container');
    if (repeatDaysContainer) {
        repeatDaysContainer.style.display = 'none';
    }
    
    // Fill the form if editing a task
    if (task) {
        document.getElementById('task-id').value = task.id;
        document.getElementById('task-title').value = task.title;
        document.getElementById('task-description').value = task.description || '';
        document.getElementById('task-due-date').value = task.dueDate || '';
        document.getElementById('task-priority').value = task.priority || 'medium';
        document.getElementById('task-category').value = task.category || 'other';
        document.getElementById('task-completed').checked = task.completed || false;
        
        // Handle repeating task settings
        const isRepeating = task.isRepeating || false;
        document.getElementById('task-repeating').checked = isRepeating;
        
        if (isRepeating && repeatDaysContainer) {
            repeatDaysContainer.style.display = 'block';
            
            // Set repeat days checkboxes
            const repeatDays = task.repeatDays || [false, false, false, false, false, false, false];
            repeatDays.forEach((checked, index) => {
                const checkbox = document.getElementById(`repeat-${getDayAbbr(index).toLowerCase()}`);
                if (checkbox) {
                    checkbox.checked = checked;
                }
            });
        }
    } else {
        document.getElementById('task-id').value = '';
        document.getElementById('task-priority').value = 'medium';
        document.getElementById('task-category').value = 'other';
        
        // For new tasks, check the current day in the repeat options
        if (document.getElementById('task-repeating').checked && repeatDaysContainer) {
            repeatDaysContainer.style.display = 'block';
            const currentDay = new Date().getDay(); // 0-6, starting with Sunday
            const checkbox = document.getElementById(`repeat-${getDayAbbr(currentDay).toLowerCase()}`);
            if (checkbox) {
                checkbox.checked = true;
            }
        }
    }
    
    // Show the modal
    modal.show();
}

/**
 * Save a task (add new or update existing)
 */
async function saveTask() {
    // Get form data
    const taskId = document.getElementById('task-id').value;
    const title = document.getElementById('task-title').value.trim();
    const description = document.getElementById('task-description').value.trim();
    const dueDate = document.getElementById('task-due-date').value;
    const priority = document.getElementById('task-priority').value;
    const category = document.getElementById('task-category').value;
    const completed = document.getElementById('task-completed').checked;
    
    // Validate
    if (!title) {
        showNotification('Task title is required', 'error');
        return;
    }
    
    try {
        // Prepare task object
        const task = {
            title,
            description,
            dueDate,
            priority,
            category,
            completed
        };
        
        if (taskId) {
            // Update existing task
            task.id = taskId;
            await db.updateTask(task);
            showNotification('Task updated successfully', 'success');
        } else {
            // Add new task
            task.createdAt = new Date().toISOString();
            await db.addTask(task);
            showNotification('Task added successfully', 'success');
        }
        
        // Close the modal
        const modalElement = document.getElementById('taskModal');
        const modal = bootstrap.Modal.getInstance(modalElement);
        modal.hide();
        
        // Reload tasks and update UI
        await loadTasks();
        renderTasks();
    } catch (error) {
        console.error('Error saving task:', error);
        showNotification('Failed to save task', 'error');
    }
}

/**
 * Toggle a task's completed status
 * @param {string} taskId - ID of the task to toggle
 * @param {boolean} completed - New completed status
 */
async function toggleTaskCompleted(taskId, completed) {
    try {
        // Get the task from database
        const task = await db.getTaskById(taskId);
        if (!task) {
            console.error('Task not found:', taskId);
            return;
        }
        
        // Update completed status
        task.completed = completed;
        
        // Save to database
        await db.updateTask(task);
        
        // Show notification
        showNotification(
            `Task marked as ${completed ? 'completed' : 'incomplete'}`,
            'success'
        );
        
        // Reload tasks and update UI if the task might disappear due to filtering
        if (currentFilter === 'completed' || currentFilter === 'upcoming' || currentFilter === 'today') {
            await loadTasks();
            renderTasks();
        }
    } catch (error) {
        console.error('Error toggling task completion:', error);
        showNotification('Failed to update task', 'error');
    }
}

/**
 * Confirm deletion of a task
 * @param {string} taskId - ID of the task to delete
 */
function confirmDeleteTask(taskId) {
    // Simple confirmation dialog
    if (confirm('Are you sure you want to delete this task?')) {
        deleteTask(taskId);
    }
}

/**
 * Delete a task
 * @param {string} taskId - ID of the task to delete
 */
async function deleteTask(taskId) {
    try {
        await db.deleteTask(taskId);
        showNotification('Task deleted successfully', 'success');
        
        // Reload tasks and update UI
        await loadTasks();
        renderTasks();
    } catch (error) {
        console.error('Error deleting task:', error);
        showNotification('Failed to delete task', 'error');
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

/**
 * Capitalize the first letter of a string
 * @param {string} text - Text to capitalize
 * @returns {string} - Text with first letter capitalized
 */
function capitalizeFirstLetter(text) {
    if (!text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1);
}
