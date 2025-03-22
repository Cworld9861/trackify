/**
 * Trackify - Courses Module
 * Handles course management functionality
 */

// Course management variables
let courses = [];
let filteredCourses = [];
let currentFilter = 'all';
let currentSort = 'recent';
let searchTerm = '';

// Current course for detail view
let currentCourseId = null;

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    initCoursesPage();
});

/**
 * Initialize the courses page
 */
async function initCoursesPage() {
    // Set up event listeners for course-specific UI elements
    setupCourseEventListeners();
    
    // Load courses from database
    await loadCourses();
    
    // Filter and render courses
    filterAndSortCourses();
    renderCourses();
    
    // Update overview counters
    updateCourseOverview();
}

/**
 * Set up event listeners for course-specific UI elements
 */
function setupCourseEventListeners() {
    // Add course button
    const addCourseBtn = document.getElementById('add-course-btn');
    if (addCourseBtn) {
        addCourseBtn.addEventListener('click', () => openCourseModal());
    }
    
    // Save course button in modal
    const saveCourseBtn = document.getElementById('save-course-btn');
    if (saveCourseBtn) {
        saveCourseBtn.addEventListener('click', saveCourse);
    }
    
    // Course search
    const searchInput = document.getElementById('course-search');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            searchTerm = searchInput.value.toLowerCase().trim();
            filterAndSortCourses();
            renderCourses();
        });
    }
    
    // Filter buttons
    const filterButtons = document.querySelectorAll('.btn-filter');
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            currentFilter = button.getAttribute('data-filter');
            filterAndSortCourses();
            renderCourses();
        });
    });
    
    // Sort select
    const sortSelect = document.getElementById('sort-courses');
    if (sortSelect) {
        sortSelect.addEventListener('change', () => {
            currentSort = sortSelect.value;
            filterAndSortCourses();
            renderCourses();
        });
    }
    
    // Predefined cover options
    const coverOptions = document.querySelectorAll('.cover-option');
    coverOptions.forEach(option => {
        option.addEventListener('click', () => {
            coverOptions.forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            
            document.getElementById('course-cover').value = option.getAttribute('data-cover');
        });
    });
    
    // Edit course button in detail modal
    const editCourseBtn = document.getElementById('edit-course-btn');
    if (editCourseBtn) {
        editCourseBtn.addEventListener('click', () => {
            // Close the detail modal
            const detailModal = bootstrap.Modal.getInstance(document.getElementById('courseDetailModal'));
            detailModal.hide();
            
            // Open the edit modal with the current course
            openCourseModal(currentCourseId);
        });
    }
    
    // Topic management buttons
    const addTopicBtn = document.getElementById('add-topic-btn');
    if (addTopicBtn) {
        addTopicBtn.addEventListener('click', openTopicModal);
    }
    
    // Save topic button
    const saveTopicBtn = document.getElementById('save-topic-btn');
    if (saveTopicBtn) {
        saveTopicBtn.addEventListener('click', saveTopic);
    }
    
    // Material upload button
    const addMaterialBtn = document.getElementById('add-material-btn');
    if (addMaterialBtn) {
        addMaterialBtn.addEventListener('click', openMaterialModal);
    }
    
    // Save material button
    const saveMaterialBtn = document.getElementById('save-material-btn');
    if (saveMaterialBtn) {
        saveMaterialBtn.addEventListener('click', uploadMaterial);
    }
    
    // Notes save button
    const saveNotesBtn = document.getElementById('save-notes-btn');
    if (saveNotesBtn) {
        saveNotesBtn.addEventListener('click', saveNotes);
    }
}

/**
 * Load courses from the database
 */
async function loadCourses() {
    try {
        courses = await db.getCourses();
        console.log('Courses loaded:', courses.length);
    } catch (error) {
        console.error('Error loading courses:', error);
        showNotification('Failed to load courses', 'error');
    }
}

/**
 * Filter and sort courses based on current selections
 */
function filterAndSortCourses() {
    // First apply search filter
    let filtered = courses;
    
    if (searchTerm) {
        filtered = filtered.filter(course => 
            course.title.toLowerCase().includes(searchTerm) || 
            (course.description && course.description.toLowerCase().includes(searchTerm)) ||
            (course.provider && course.provider.toLowerCase().includes(searchTerm))
        );
    }
    
    // Then apply category filter
    switch (currentFilter) {
        case 'in-progress':
            filtered = filtered.filter(course => course.status === 'in-progress');
            break;
            
        case 'completed':
            filtered = filtered.filter(course => course.status === 'completed');
            break;
            
        case 'not-started':
            filtered = filtered.filter(course => course.status === 'not-started');
            break;
            
        case 'all':
        default:
            // No additional filtering needed
            break;
    }
    
    // Sort courses based on selected sort option
    filtered.sort((a, b) => {
        switch (currentSort) {
            case 'recent':
                return new Date(b.lastUpdated) - new Date(a.lastUpdated);
                
            case 'name':
                return a.title.localeCompare(b.title);
                
            case 'progress':
                return b.progress - a.progress;
                
            case 'date-added':
                return new Date(b.createdAt) - new Date(a.createdAt);
                
            default:
                return 0;
        }
    });
    
    filteredCourses = filtered;
}

/**
 * Render courses in the UI
 */
function renderCourses() {
    const coursesGrid = document.getElementById('courses-grid');
    const emptyState = document.getElementById('empty-courses-state');
    
    if (!coursesGrid) return;
    
    // Clear current courses except for the empty state
    Array.from(coursesGrid.children).forEach(child => {
        if (child !== emptyState) {
            coursesGrid.removeChild(child);
        }
    });
    
    // Show empty state if no courses
    if (filteredCourses.length === 0) {
        if (emptyState) {
            emptyState.style.display = 'block';
        }
        return;
    }
    
    // Hide empty state if we have courses
    if (emptyState) {
        emptyState.style.display = 'none';
    }
    
    // Add each course to the grid
    filteredCourses.forEach(course => {
        const courseElement = createCourseElement(course);
        coursesGrid.appendChild(courseElement);
    });
}

/**
 * Create a course element for the UI
 * @param {Object} course - The course object
 * @returns {HTMLElement} - The course element
 */
function createCourseElement(course) {
    const courseElement = document.createElement('div');
    courseElement.className = 'course-card';
    courseElement.dataset.id = course.id;
    
    // Get status class
    const statusClass = `course-status ${course.status || 'not-started'}`;
    
    // Set status text
    let statusText = 'Not Started';
    if (course.status === 'in-progress') statusText = 'In Progress';
    if (course.status === 'completed') statusText = 'Completed';
    
    // Set default cover if none is provided
    const coverImage = course.coverImage || getDefaultCoverForCategory(course.category);
    
    // Set HTML content
    courseElement.innerHTML = `
        <div class="course-cover" style="background-image: url('${coverImage}')">
            <div class="course-category">${capitalizeFirstLetter(course.category || 'Other')}</div>
            <div class="${statusClass}">${statusText}</div>
        </div>
        <div class="course-content">
            <h3 class="course-title">${escapeHTML(course.title)}</h3>
            <p class="course-description">${escapeHTML(course.description || '')}</p>
            <div class="course-meta">
                ${course.provider ? `<span><i class="fas fa-user"></i> ${escapeHTML(course.provider)}</span>` : ''}
                <span><i class="far fa-calendar-alt"></i> ${formatDate(course.lastUpdated, 'short')}</span>
            </div>
            <div class="course-progress">
                <div class="course-progress-label">
                    <span>Progress</span>
                    <span>${course.progress || 0}%</span>
                </div>
                <div class="progress">
                    <div class="progress-bar" role="progressbar" style="width: ${course.progress || 0}%;" 
                        aria-valuenow="${course.progress || 0}" aria-valuemin="0" aria-valuemax="100"></div>
                </div>
            </div>
            <div class="course-actions">
                <button class="btn btn-sm btn-primary view-course-btn">
                    <i class="fas fa-eye"></i> View Details
                </button>
                <div>
                    <button class="btn btn-sm btn-outline-primary edit-course-btn">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger delete-course-btn">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Add event listeners
    const viewBtn = courseElement.querySelector('.view-course-btn');
    viewBtn.addEventListener('click', () => openCourseDetailModal(course.id));
    
    const editBtn = courseElement.querySelector('.edit-course-btn');
    editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openCourseModal(course.id);
    });
    
    const deleteBtn = courseElement.querySelector('.delete-course-btn');
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        confirmDeleteCourse(course.id);
    });
    
    return courseElement;
}

/**
 * Open the course modal for adding or editing a course
 * @param {string} courseId - The ID of the course to edit (null for a new course)
 */
async function openCourseModal(courseId = null) {
    const modal = new bootstrap.Modal(document.getElementById('courseModal'));
    const form = document.getElementById('course-form');
    const modalTitle = document.getElementById('courseModalLabel');
    
    // Reset the form
    form.reset();
    
    // Reset cover options
    const coverOptions = document.querySelectorAll('.cover-option');
    coverOptions.forEach(opt => opt.classList.remove('selected'));
    
    // Set modal title
    modalTitle.textContent = courseId ? 'Edit Course' : 'Add New Course';
    
    // Fill the form if editing a course
    if (courseId) {
        try {
            const course = await db.getCourseById(courseId);
            if (course) {
                document.getElementById('course-id').value = course.id;
                document.getElementById('course-title').value = course.title;
                document.getElementById('course-description').value = course.description || '';
                document.getElementById('course-provider').value = course.provider || '';
                document.getElementById('course-category').value = course.category || 'other';
                document.getElementById('course-url').value = course.url || '';
                document.getElementById('course-status').value = course.status || 'not-started';
                document.getElementById('course-cover').value = course.coverImage || '';
                
                // Select matching cover option if it exists
                if (course.coverImage) {
                    const matchingOption = Array.from(coverOptions).find(
                        opt => opt.getAttribute('data-cover') === course.coverImage
                    );
                    if (matchingOption) {
                        matchingOption.classList.add('selected');
                    }
                }
            }
        } catch (error) {
            console.error('Error loading course for editing:', error);
            showNotification('Failed to load course', 'error');
        }
    } else {
        document.getElementById('course-id').value = '';
        document.getElementById('course-category').value = 'other';
        document.getElementById('course-status').value = 'not-started';
    }
    
    // Show the modal
    modal.show();
}

/**
 * Save a course (add new or update existing)
 */
async function saveCourse() {
    // Get form data
    const courseId = document.getElementById('course-id').value;
    const title = document.getElementById('course-title').value.trim();
    const description = document.getElementById('course-description').value.trim();
    const provider = document.getElementById('course-provider').value.trim();
    const category = document.getElementById('course-category').value;
    const url = document.getElementById('course-url').value.trim();
    const status = document.getElementById('course-status').value;
    const coverImage = document.getElementById('course-cover').value.trim();
    
    // Validate
    if (!title) {
        showNotification('Course title is required', 'error');
        return;
    }
    
    try {
        // Prepare course object
        const course = {
            title,
            description,
            provider,
            category,
            url,
            status,
            coverImage: coverImage || getDefaultCoverForCategory(category),
            lastUpdated: new Date().toISOString()
        };
        
        if (courseId) {
            // Update existing course
            course.id = courseId;
            
            // Get existing course to preserve data
            const existingCourse = await db.getCourseById(courseId);
            if (existingCourse) {
                course.createdAt = existingCourse.createdAt;
                course.progress = existingCourse.progress;
                course.notes = existingCourse.notes;
            }
            
            await db.updateCourse(course);
            showNotification('Course updated successfully', 'success');
        } else {
            // Add new course
            course.id = generateId();
            course.createdAt = new Date().toISOString();
            course.progress = 0;
            
            await db.addCourse(course);
            showNotification('Course added successfully', 'success');
        }
        
        // Close the modal
        const modalElement = document.getElementById('courseModal');
        const modal = bootstrap.Modal.getInstance(modalElement);
        modal.hide();
        
        // Reload courses and update UI
        await loadCourses();
        filterAndSortCourses();
        renderCourses();
        updateCourseOverview();
    } catch (error) {
        console.error('Error saving course:', error);
        showNotification('Failed to save course', 'error');
    }
}

/**
 * Confirm deletion of a course
 * @param {string} courseId - ID of the course to delete
 */
function confirmDeleteCourse(courseId) {
    // Simple confirmation dialog
    if (confirm('Are you sure you want to delete this course? All related topics and materials will also be deleted.')) {
        deleteCourse(courseId);
    }
}

/**
 * Delete a course
 * @param {string} courseId - ID of the course to delete
 */
async function deleteCourse(courseId) {
    try {
        await db.deleteCourse(courseId);
        showNotification('Course deleted successfully', 'success');
        
        // Reload courses and update UI
        await loadCourses();
        filterAndSortCourses();
        renderCourses();
        updateCourseOverview();
    } catch (error) {
        console.error('Error deleting course:', error);
        showNotification('Failed to delete course', 'error');
    }
}

/**
 * Update course overview counters
 */
async function updateCourseOverview() {
    try {
        // Count courses by status
        const totalCourses = courses.length;
        const inProgress = courses.filter(course => course.status === 'in-progress').length;
        const completed = courses.filter(course => course.status === 'completed').length;
        
        // Get all materials
        const materials = await db.getMaterials();
        
        // Update UI
        document.getElementById('total-courses-count').textContent = totalCourses;
        document.getElementById('in-progress-count').textContent = inProgress;
        document.getElementById('completed-courses-count').textContent = completed;
        document.getElementById('study-materials-count').textContent = materials.length;
    } catch (error) {
        console.error('Error updating course overview:', error);
    }
}

/**
 * Open the course detail modal
 * @param {string} courseId - ID of the course to view
 */
async function openCourseDetailModal(courseId) {
    try {
        // Store current course ID
        currentCourseId = courseId;
        
        // Get course data
        const course = await db.getCourseById(courseId);
        if (!course) {
            showNotification('Course not found', 'error');
            return;
        }
        
        // Get topics for this course
        const topics = await db.getTopicsByCourseId(courseId);
        
        // Get materials for this course
        const materials = await db.getMaterialsByCourseId(courseId);
        
        // Update modal UI
        document.getElementById('detail-course-title').textContent = course.title;
        document.getElementById('detail-course-description').textContent = course.description || '';
        document.getElementById('detail-course-provider').textContent = course.provider || 'Not specified';
        document.getElementById('detail-course-category').textContent = capitalizeFirstLetter(course.category || 'Other');
        
        // Course URL
        const urlElement = document.getElementById('detail-course-url');
        if (course.url) {
            urlElement.href = course.url;
            urlElement.textContent = 'Course Link';
            urlElement.style.display = 'inline';
        } else {
            urlElement.style.display = 'none';
        }
        
        // Course status
        let statusText = 'Not Started';
        if (course.status === 'in-progress') statusText = 'In Progress';
        if (course.status === 'completed') statusText = 'Completed';
        document.getElementById('detail-course-status').textContent = statusText;
        
        // Course cover
        const coverElement = document.getElementById('detail-course-cover');
        coverElement.style.backgroundImage = `url('${course.coverImage || getDefaultCoverForCategory(course.category)}')`;
        
        // Course progress
        const progressBar = document.getElementById('detail-progress-bar'); // Fix: Use the correct ID
        progressBar.style.width = `${course.progress || 0}%`;
        progressBar.setAttribute('aria-valuenow', course.progress || 0);
        
        // Set progress percentage text
        document.getElementById('detail-progress-percentage').textContent = `${course.progress || 0}%`;
        
        // Topic counts
        const completedTopics = topics.filter(topic => topic.completed).length;
        document.getElementById('completed-topics').textContent = completedTopics;
        document.getElementById('total-topics').textContent = topics.length;
        
        // Load topics
        renderTopics(topics);
        
        // Load materials
        renderMaterials(materials);
        
        // Load notes
        document.getElementById('course-notes').value = course.notes || '';
        
        // Show the modal
        const modal = new bootstrap.Modal(document.getElementById('courseDetailModal'));
        modal.show();
    } catch (error) {
        console.error('Error opening course detail:', error);
        showNotification('Failed to load course details', 'error');
    }
}

/**
 * Render topics in the course detail modal
 * @param {Array} topics - Array of topic objects
 */
function renderTopics(topics) {
    const topicsList = document.getElementById('topics-list');
    const emptyState = document.getElementById('empty-topics-state');
    
    if (!topicsList) return;
    
    // Clear current topics except for the empty state
    Array.from(topicsList.children).forEach(child => {
        if (child !== emptyState) {
            topicsList.removeChild(child);
        }
    });
    
    // Show empty state if no topics
    if (topics.length === 0) {
        if (emptyState) {
            emptyState.style.display = 'block';
        }
        return;
    }
    
    // Hide empty state if we have topics
    if (emptyState) {
        emptyState.style.display = 'none';
    }
    
    // Sort topics by order
    const sortedTopics = [...topics].sort((a, b) => a.order - b.order);
    
    // Add each topic to the list
    sortedTopics.forEach(topic => {
        const topicElement = createTopicElement(topic);
        topicsList.appendChild(topicElement);
    });
}

/**
 * Create a topic element for the UI
 * @param {Object} topic - The topic object
 * @returns {HTMLElement} - The topic element
 */
function createTopicElement(topic) {
    const topicElement = document.createElement('div');
    topicElement.className = 'topic-item';
    topicElement.dataset.id = topic.id;
    
    // Create the topic checkbox
    const checkbox = document.createElement('div');
    checkbox.className = 'topic-checkbox';
    checkbox.innerHTML = `
        <div class="form-check">
            <input class="form-check-input" type="checkbox" ${topic.completed ? 'checked' : ''}>
        </div>
    `;
    
    // Add click event to checkbox
    const checkboxInput = checkbox.querySelector('input');
    checkboxInput.addEventListener('change', () => toggleTopicCompleted(topic.id, checkboxInput.checked));
    
    // Create the topic content
    const content = document.createElement('div');
    content.className = 'topic-content';
    
    // Set content HTML
    content.innerHTML = `
        <h3 class="topic-title">
            ${escapeHTML(topic.title)}
            ${topic.url ? `<a href="${topic.url}" target="_blank" title="Open resource"><i class="fas fa-external-link-alt"></i></a>` : ''}
        </h3>
        ${topic.description ? `<p class="topic-description">${escapeHTML(topic.description)}</p>` : ''}
    `;
    
    // Create topic actions
    const actions = document.createElement('div');
    actions.className = 'topic-actions';
    actions.innerHTML = `
        <button class="btn btn-sm btn-outline-primary edit-topic-btn" title="Edit Topic">
            <i class="fas fa-edit"></i>
        </button>
        <button class="btn btn-sm btn-outline-danger delete-topic-btn" title="Delete Topic">
            <i class="fas fa-trash"></i>
        </button>
    `;
    
    // Add event listeners for actions
    const editBtn = actions.querySelector('.edit-topic-btn');
    editBtn.addEventListener('click', () => openTopicModal(topic));
    
    const deleteBtn = actions.querySelector('.delete-topic-btn');
    deleteBtn.addEventListener('click', () => confirmDeleteTopic(topic.id));
    
    // Assemble the topic element
    topicElement.appendChild(checkbox);
    topicElement.appendChild(content);
    topicElement.appendChild(actions);
    
    return topicElement;
}

/**
 * Open the topic modal for adding or editing a topic
 * @param {Object} topic - The topic to edit (null for a new topic)
 */
async function openTopicModal(topic = null) {
    const modal = new bootstrap.Modal(document.getElementById('topicModal'));
    const form = document.getElementById('topic-form');
    const modalTitle = document.getElementById('topicModalLabel');
    
    // Reset the form
    form.reset();
    
    // Set modal title
    modalTitle.textContent = topic ? 'Edit Topic' : 'Add Topic';
    
    // Set course ID
    document.getElementById('topic-course-id').value = currentCourseId;
    
    // Fill the form if editing a topic
    if (topic) {
        document.getElementById('topic-id').value = topic.id;
        document.getElementById('topic-title').value = topic.title;
        document.getElementById('topic-description').value = topic.description || '';
        document.getElementById('topic-url').value = topic.url || '';
        document.getElementById('topic-order').value = topic.order || 1;
        document.getElementById('topic-completed').checked = topic.completed || false;
    } else {
        document.getElementById('topic-id').value = '';
        
        // Set default order to last position
        try {
            const topics = await db.getTopicsByCourseId(currentCourseId);
            const maxOrder = topics.reduce((max, t) => Math.max(max, t.order || 0), 0);
            document.getElementById('topic-order').value = maxOrder + 1;
        } catch (error) {
            console.error('Error setting default topic order:', error);
            document.getElementById('topic-order').value = 1;
        }
    }
    
    // Show the modal
    modal.show();
}

/**
 * Save a topic (add new or update existing)
 */
async function saveTopic() {
    // Get form data
    const topicId = document.getElementById('topic-id').value;
    const courseId = document.getElementById('topic-course-id').value;
    const title = document.getElementById('topic-title').value.trim();
    const description = document.getElementById('topic-description').value.trim();
    const url = document.getElementById('topic-url').value.trim();
    const order = parseInt(document.getElementById('topic-order').value, 10);
    const completed = document.getElementById('topic-completed').checked;
    
    // Validate
    if (!title) {
        showNotification('Topic title is required', 'error');
        return;
    }
    
    if (!courseId) {
        showNotification('Course ID is missing', 'error');
        return;
    }
    
    if (isNaN(order) || order < 1) {
        showNotification('Order must be a positive number', 'error');
        return;
    }
    
    try {
        // Prepare topic object
        const topic = {
            courseId,
            title,
            description,
            url,
            order,
            completed
        };
        
        if (topicId) {
            // Update existing topic
            topic.id = topicId;
            await db.updateTopic(topic);
            showNotification('Topic updated successfully', 'success');
        } else {
            // Add new topic
            topic.id = generateId();
            topic.createdAt = new Date().toISOString();
            await db.addTopic(topic);
            showNotification('Topic added successfully', 'success');
        }
        
        // Close the modal
        const modalElement = document.getElementById('topicModal');
        const modal = bootstrap.Modal.getInstance(modalElement);
        modal.hide();
        
        // Update course progress
        await updateCourseProgress(courseId);
        
        // Reload topics
        const topics = await db.getTopicsByCourseId(courseId);
        renderTopics(topics);
        
        // Update course list in the background
        await loadCourses();
        filterAndSortCourses();
        renderCourses();
    } catch (error) {
        console.error('Error saving topic:', error);
        showNotification('Failed to save topic', 'error');
    }
}

/**
 * Toggle a topic's completed status
 * @param {string} topicId - ID of the topic to toggle
 * @param {boolean} completed - New completed status
 */
async function toggleTopicCompleted(topicId, completed) {
    try {
        // Get the topic from database
        const topic = await db.getTopicById(topicId);
        if (!topic) {
            console.error('Topic not found:', topicId);
            return;
        }
        
        // Update completed status
        topic.completed = completed;
        
        // Save to database
        await db.updateTopic(topic);
        
        // Update course progress
        await updateCourseProgress(topic.courseId);
        
        // Show notification
        showNotification(
            `Topic marked as ${completed ? 'completed' : 'incomplete'}`,
            'success'
        );
        
        // Update course list in the background
        await loadCourses();
        filterAndSortCourses();
        renderCourses();
    } catch (error) {
        console.error('Error toggling topic completion:', error);
        showNotification('Failed to update topic', 'error');
    }
}

/**
 * Confirm deletion of a topic
 * @param {string} topicId - ID of the topic to delete
 */
function confirmDeleteTopic(topicId) {
    // Simple confirmation dialog
    if (confirm('Are you sure you want to delete this topic?')) {
        deleteTopic(topicId);
    }
}

/**
 * Delete a topic
 * @param {string} topicId - ID of the topic to delete
 */
async function deleteTopic(topicId) {
    try {
        // Get the topic first to get the courseId
        const topic = await db.getTopicById(topicId);
        if (!topic) {
            console.error('Topic not found:', topicId);
            return;
        }
        
        const courseId = topic.courseId;
        
        // Delete the topic
        await db.deleteTopic(topicId);
        showNotification('Topic deleted successfully', 'success');
        
        // Update course progress
        await updateCourseProgress(courseId);
        
        // Reload topics
        const topics = await db.getTopicsByCourseId(courseId);
        renderTopics(topics);
        
        // Update course list in the background
        await loadCourses();
        filterAndSortCourses();
        renderCourses();
    } catch (error) {
        console.error('Error deleting topic:', error);
        showNotification('Failed to delete topic', 'error');
    }
}

/**
 * Update the progress of a course based on completed topics
 * @param {string} courseId - ID of the course to update
 */
async function updateCourseProgress(courseId) {
    try {
        // Get all topics for the course
        const topics = await db.getTopicsByCourseId(courseId);
        
        // Calculate progress percentage
        let progress = 0;
        if (topics.length > 0) {
            const completedTopics = topics.filter(topic => topic.completed).length;
            progress = Math.round((completedTopics / topics.length) * 100);
        }
        
        // Update the course
        const course = await db.getCourseById(courseId);
        if (course) {
            course.progress = progress;
            course.lastUpdated = new Date().toISOString();
            
            // If all topics are completed, mark course as completed
            if (progress === 100 && topics.length > 0) {
                course.status = 'completed';
            } else if (progress > 0) {
                course.status = 'in-progress';
            }
            
            await db.updateCourse(course);
            
            // Update UI elements in the detail view
            const progressBar = document.getElementById('detail-progress-bar');
            if (progressBar) {
                progressBar.style.width = `${progress}%`;
                progressBar.setAttribute('aria-valuenow', progress);
            }
            
            const progressPercentage = document.getElementById('detail-progress-percentage');
            if (progressPercentage) {
                progressPercentage.textContent = `${progress}%`;
            }
            
            const completedTopics = topics.filter(topic => topic.completed).length;
            document.getElementById('completed-topics').textContent = completedTopics;
            document.getElementById('total-topics').textContent = topics.length;
            
            // Update status text
            let statusText = 'Not Started';
            if (course.status === 'in-progress') statusText = 'In Progress';
            if (course.status === 'completed') statusText = 'Completed';
            document.getElementById('detail-course-status').textContent = statusText;
        }
    } catch (error) {
        console.error('Error updating course progress:', error);
    }
}

/**
 * Render materials in the course detail modal
 * @param {Array} materials - Array of material objects
 */
function renderMaterials(materials) {
    const materialsList = document.getElementById('materials-list');
    const emptyState = document.getElementById('empty-materials-state');
    
    if (!materialsList) return;
    
    // Clear current materials except for the empty state
    Array.from(materialsList.children).forEach(child => {
        if (child !== emptyState) {
            materialsList.removeChild(child);
        }
    });
    
    // Show empty state if no materials
    if (materials.length === 0) {
        if (emptyState) {
            emptyState.style.display = 'block';
        }
        return;
    }
    
    // Hide empty state if we have materials
    if (emptyState) {
        emptyState.style.display = 'none';
    }
    
    // Sort materials by upload date (newest first)
    const sortedMaterials = [...materials].sort((a, b) => 
        new Date(b.uploadedAt) - new Date(a.uploadedAt)
    );
    
    // Add each material to the list
    sortedMaterials.forEach(material => {
        const materialElement = createMaterialElement(material);
        materialsList.appendChild(materialElement);
    });
}

/**
 * Create a material element for the UI
 * @param {Object} material - The material object
 * @returns {HTMLElement} - The material element
 */
function createMaterialElement(material) {
    const materialElement = document.createElement('div');
    materialElement.className = 'material-item';
    materialElement.dataset.id = material.id;
    
    // Get file icon based on file type
    let fileIcon = 'fas fa-file';
    if (material.fileUrl) {
        const fileExtension = material.fileUrl.split('.').pop().toLowerCase();
        
        if (['pdf'].includes(fileExtension)) {
            fileIcon = 'fas fa-file-pdf';
        } else if (['doc', 'docx'].includes(fileExtension)) {
            fileIcon = 'fas fa-file-word';
        } else if (['ppt', 'pptx'].includes(fileExtension)) {
            fileIcon = 'fas fa-file-powerpoint';
        } else if (['txt'].includes(fileExtension)) {
            fileIcon = 'fas fa-file-alt';
        }
    }
    
    // Create the material icon
    const icon = document.createElement('div');
    icon.className = 'material-icon';
    icon.innerHTML = `<i class="${fileIcon}"></i>`;
    
    // Create the material content
    const content = document.createElement('div');
    content.className = 'material-content';
    
    // Set content HTML
    content.innerHTML = `
        <h3 class="material-title">${escapeHTML(material.title)}</h3>
        ${material.description ? `<p class="material-description">${escapeHTML(material.description)}</p>` : ''}
        <div class="material-meta">
            <span><i class="far fa-calendar-alt"></i> ${formatDate(material.uploadedAt, 'medium')}</span>
        </div>
    `;
    
    // Create material actions
    const actions = document.createElement('div');
    actions.className = 'material-actions';
    actions.innerHTML = `
        <a href="${material.fileUrl}" class="btn btn-sm btn-outline-primary" target="_blank" title="Open Material">
            <i class="fas fa-external-link-alt"></i>
        </a>
        <button class="btn btn-sm btn-outline-danger delete-material-btn" title="Delete Material">
            <i class="fas fa-trash"></i>
        </button>
    `;
    
    // Add event listener for delete button
    const deleteBtn = actions.querySelector('.delete-material-btn');
    deleteBtn.addEventListener('click', () => confirmDeleteMaterial(material.id));
    
    // Assemble the material element
    materialElement.appendChild(icon);
    materialElement.appendChild(content);
    materialElement.appendChild(actions);
    
    return materialElement;
}

/**
 * Open the material upload modal
 */
function openMaterialModal() {
    const modal = new bootstrap.Modal(document.getElementById('materialModal'));
    const form = document.getElementById('material-form');
    
    // Reset the form
    form.reset();
    
    // Set course ID
    document.getElementById('material-course-id').value = currentCourseId;
    
    // Reset progress bar
    const progressContainer = document.getElementById('upload-progress-container');
    progressContainer.classList.add('d-none');
    
    const progressBar = document.getElementById('upload-progress');
    progressBar.style.width = '0%';
    progressBar.setAttribute('aria-valuenow', 0);
    progressBar.textContent = '0%';
    
    // Show the modal
    modal.show();
}

/**
 * Upload a material (study material file)
 */
async function uploadMaterial() {
    // Get form data
    const courseId = document.getElementById('material-course-id').value;
    const title = document.getElementById('material-title').value.trim();
    const description = document.getElementById('material-description').value.trim();
    const fileInput = document.getElementById('material-file');
    
    // Validate
    if (!title) {
        showNotification('Material title is required', 'error');
        return;
    }
    
    if (!courseId) {
        showNotification('Course ID is missing', 'error');
        return;
    }
    
    if (!fileInput.files || fileInput.files.length === 0) {
        showNotification('Please select a file to upload', 'error');
        return;
    }
    
    const file = fileInput.files[0];
    
    // Check file type
    const allowedExtensions = ['pdf', 'docx', 'doc', 'ppt', 'pptx', 'txt'];
    const fileExtension = file.name.split('.').pop().toLowerCase();
    
    if (!allowedExtensions.includes(fileExtension)) {
        showNotification('File type not allowed. Please upload PDF, DOCX, PPT, or TXT files.', 'error');
        return;
    }
    
    // Show progress container
    const progressContainer = document.getElementById('upload-progress-container');
    progressContainer.classList.remove('d-none');
    
    // Create FormData
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        // Upload the file
        const response = await fetch('/upload-file', {
            method: 'POST',
            body: formData,
            onUploadProgress: (progressEvent) => {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                updateUploadProgress(percentCompleted);
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Upload failed');
        }
        
        const data = await response.json();
        
        // Prepare material object
        const material = {
            id: generateId(),
            courseId,
            title,
            description,
            fileUrl: data.fileUrl,
            fileName: data.filename,
            uploadedAt: new Date().toISOString()
        };
        
        // Save to database
        await db.addMaterial(material);
        
        // Update course lastUpdated
        const course = await db.getCourseById(courseId);
        if (course) {
            course.lastUpdated = new Date().toISOString();
            await db.updateCourse(course);
        }
        
        // Close the modal
        const modalElement = document.getElementById('materialModal');
        const modal = bootstrap.Modal.getInstance(modalElement);
        modal.hide();
        
        showNotification('Material uploaded successfully', 'success');
        
        // Reload materials
        const materials = await db.getMaterialsByCourseId(courseId);
        renderMaterials(materials);
        
        // Update course list in the background
        await loadCourses();
        filterAndSortCourses();
        renderCourses();
        updateCourseOverview();
    } catch (error) {
        console.error('Error uploading material:', error);
        showNotification('Failed to upload material: ' + error.message, 'error');
    }
}

/**
 * Update the upload progress bar
 * @param {number} percent - The upload progress percentage
 */
function updateUploadProgress(percent) {
    const progressBar = document.getElementById('upload-progress');
    progressBar.style.width = `${percent}%`;
    progressBar.setAttribute('aria-valuenow', percent);
    progressBar.textContent = `${percent}%`;
}

/**
 * Confirm deletion of a material
 * @param {string} materialId - ID of the material to delete
 */
function confirmDeleteMaterial(materialId) {
    // Simple confirmation dialog
    if (confirm('Are you sure you want to delete this material?')) {
        deleteMaterial(materialId);
    }
}

/**
 * Delete a material
 * @param {string} materialId - ID of the material to delete
 */
async function deleteMaterial(materialId) {
    try {
        await db.deleteMaterial(materialId);
        showNotification('Material deleted successfully', 'success');
        
        // Reload materials
        const materials = await db.getMaterialsByCourseId(currentCourseId);
        renderMaterials(materials);
        
        // Update course list in the background
        await loadCourses();
        filterAndSortCourses();
        renderCourses();
        updateCourseOverview();
    } catch (error) {
        console.error('Error deleting material:', error);
        showNotification('Failed to delete material', 'error');
    }
}

/**
 * Save course notes
 */
async function saveNotes() {
    try {
        const notes = document.getElementById('course-notes').value;
        
        // Get course
        const course = await db.getCourseById(currentCourseId);
        if (!course) {
            showNotification('Course not found', 'error');
            return;
        }
        
        // Update notes
        course.notes = notes;
        course.lastUpdated = new Date().toISOString();
        
        await db.updateCourse(course);
        
        showNotification('Notes saved successfully', 'success');
        
        // Update course list in the background
        await loadCourses();
        filterAndSortCourses();
        renderCourses();
    } catch (error) {
        console.error('Error saving notes:', error);
        showNotification('Failed to save notes', 'error');
    }
}

/**
 * Get default cover image for a category
 * @param {string} category - The course category
 * @returns {string} - The default cover image URL
 */
function getDefaultCoverForCategory(category) {
    switch (category) {
        case 'programming':
            return 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'100\' height=\'100\' viewBox=\'0 0 100 100\'%3E%3Crect width=\'100\' height=\'100\' fill=\'%236200ea\' /%3E%3Cpath d=\'M20 20 L80 20 L80 80 L20 80 Z\' fill=\'%233700b3\' /%3E%3Ctext x=\'50\' y=\'50\' font-family=\'Arial\' font-size=\'12\' text-anchor=\'middle\' fill=\'white\'%3EProgramming%3C/text%3E%3C/svg%3E';
        case 'design':
            return 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'100\' height=\'100\' viewBox=\'0 0 100 100\'%3E%3Crect width=\'100\' height=\'100\' fill=\'%23ff6d00\' /%3E%3Cpath d=\'M20 20 L80 20 L80 80 L20 80 Z\' fill=\'%23dd5100\' /%3E%3Ctext x=\'50\' y=\'50\' font-family=\'Arial\' font-size=\'12\' text-anchor=\'middle\' fill=\'white\'%3EDesign%3C/text%3E%3C/svg%3E';
        case 'business':
            return 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'100\' height=\'100\' viewBox=\'0 0 100 100\'%3E%3Crect width=\'100\' height=\'100\' fill=\'%230091ea\' /%3E%3Cpath d=\'M20 20 L80 20 L80 80 L20 80 Z\' fill=\'%230064a8\' /%3E%3Ctext x=\'50\' y=\'50\' font-family=\'Arial\' font-size=\'12\' text-anchor=\'middle\' fill=\'white\'%3EBusiness%3C/text%3E%3C/svg%3E';
        case 'science':
            return 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'100\' height=\'100\' viewBox=\'0 0 100 100\'%3E%3Crect width=\'100\' height=\'100\' fill=\'%2300c853\' /%3E%3Cpath d=\'M20 20 L80 20 L80 80 L20 80 Z\' fill=\'%23008c3a\' /%3E%3Ctext x=\'50\' y=\'50\' font-family=\'Arial\' font-size=\'12\' text-anchor=\'middle\' fill=\'white\'%3EScience%3C/text%3E%3C/svg%3E';
        case 'language':
            return 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'100\' height=\'100\' viewBox=\'0 0 100 100\'%3E%3Crect width=\'100\' height=\'100\' fill=\'%23d50000\' /%3E%3Cpath d=\'M20 20 L80 20 L80 80 L20 80 Z\' fill=\'%239b0000\' /%3E%3Ctext x=\'50\' y=\'50\' font-family=\'Arial\' font-size=\'12\' text-anchor=\'middle\' fill=\'white\'%3ELanguage%3C/text%3E%3C/svg%3E';
        default:
            return 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'100\' height=\'100\' viewBox=\'0 0 100 100\'%3E%3Crect width=\'100\' height=\'100\' fill=\'%239c27b0\' /%3E%3Cpath d=\'M20 20 L80 20 L80 80 L20 80 Z\' fill=\'%237b1fa2\' /%3E%3Ctext x=\'50\' y=\'50\' font-family=\'Arial\' font-size=\'12\' text-anchor=\'middle\' fill=\'white\'%3EOther%3C/text%3E%3C/svg%3E';
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
