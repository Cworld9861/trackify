/**
 * Trackify - Database Manager
 * Handles data persistence using IndexedDB
 */

// Create a Database object to manage all IndexedDB operations
const db = (() => {
    // Database configuration
    const DB_NAME = 'trackify-db';
    const DB_VERSION = 1;
    const STORES = {
        tasks: 'tasks',
        habits: 'habits',
        timerSessions: 'timer-sessions',
        courses: 'courses',
        topics: 'topics',
        materials: 'materials',
        settings: 'settings'
    };

    let dbInstance = null;

    /**
     * Initialize the database
     * @returns {Promise} - Promise that resolves when DB is ready
     */
    function init() {
        return new Promise((resolve, reject) => {
            if (dbInstance) {
                resolve(dbInstance);
                return;
            }

            // Open the database
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            // Handle database upgrade (first time or version change)
            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create object stores for each data type
                if (!db.objectStoreNames.contains(STORES.tasks)) {
                    db.createObjectStore(STORES.tasks, { keyPath: 'id' });
                }

                if (!db.objectStoreNames.contains(STORES.habits)) {
                    db.createObjectStore(STORES.habits, { keyPath: 'id' });
                }

                if (!db.objectStoreNames.contains(STORES.timerSessions)) {
                    db.createObjectStore(STORES.timerSessions, { keyPath: 'id' });
                }

                if (!db.objectStoreNames.contains(STORES.courses)) {
                    db.createObjectStore(STORES.courses, { keyPath: 'id' });
                }

                if (!db.objectStoreNames.contains(STORES.topics)) {
                    const topicsStore = db.createObjectStore(STORES.topics, { keyPath: 'id' });
                    topicsStore.createIndex('courseId', 'courseId', { unique: false });
                }

                if (!db.objectStoreNames.contains(STORES.materials)) {
                    const materialsStore = db.createObjectStore(STORES.materials, { keyPath: 'id' });
                    materialsStore.createIndex('courseId', 'courseId', { unique: false });
                }

                if (!db.objectStoreNames.contains(STORES.settings)) {
                    db.createObjectStore(STORES.settings, { keyPath: 'id' });
                }
            };

            // Handle success
            request.onsuccess = (event) => {
                dbInstance = event.target.result;
                console.log('IndexedDB connection established successfully');
                resolve(dbInstance);
            };

            // Handle errors
            request.onerror = (event) => {
                console.error('IndexedDB connection error:', event.target.error);
                reject(`Error opening database: ${event.target.error}`);
            };
        });
    }

    /**
     * Get a transaction and store for a specific object store
     * @param {string} storeName - Name of the object store
     * @param {string} mode - Transaction mode ('readonly' or 'readwrite')
     * @returns {Object} - Object containing transaction and store
     */
    async function getStore(storeName, mode = 'readonly') {
        const db = await init();
        const transaction = db.transaction(storeName, mode);
        const store = transaction.objectStore(storeName);
        return { transaction, store };
    }

    /**
     * Add an item to a store
     * @param {string} storeName - Name of the object store
     * @param {Object} item - Item to add
     * @returns {Promise} - Promise resolving to the added item
     */
    async function addItem(storeName, item) {
        return new Promise(async (resolve, reject) => {
            try {
                const { transaction, store } = await getStore(storeName, 'readwrite');
                
                // Ensure the item has an id
                if (!item.id) {
                    item.id = generateId();
                }
                
                const request = store.add(item);
                
                request.onsuccess = () => resolve(item);
                request.onerror = (event) => reject(`Error adding item to ${storeName}: ${event.target.error}`);
                
                transaction.oncomplete = () => console.log(`Item added to ${storeName} successfully`);
            } catch (error) {
                reject(`Error in addItem: ${error}`);
            }
        });
    }

    /**
     * Update an item in a store
     * @param {string} storeName - Name of the object store
     * @param {Object} item - Item to update (must include id)
     * @returns {Promise} - Promise resolving to the updated item
     */
    async function updateItem(storeName, item) {
        return new Promise(async (resolve, reject) => {
            try {
                if (!item.id) {
                    reject('Cannot update item without an id');
                    return;
                }
                
                const { transaction, store } = await getStore(storeName, 'readwrite');
                const request = store.put(item);
                
                request.onsuccess = () => resolve(item);
                request.onerror = (event) => reject(`Error updating item in ${storeName}: ${event.target.error}`);
                
                transaction.oncomplete = () => console.log(`Item updated in ${storeName} successfully`);
            } catch (error) {
                reject(`Error in updateItem: ${error}`);
            }
        });
    }

    /**
     * Get all items from a store
     * @param {string} storeName - Name of the object store
     * @returns {Promise} - Promise resolving to an array of items
     */
    async function getAllItems(storeName) {
        return new Promise(async (resolve, reject) => {
            try {
                const { store } = await getStore(storeName);
                const request = store.getAll();
                
                request.onsuccess = () => resolve(request.result);
                request.onerror = (event) => reject(`Error getting items from ${storeName}: ${event.target.error}`);
            } catch (error) {
                reject(`Error in getAllItems: ${error}`);
            }
        });
    }

    /**
     * Get an item by id from a store
     * @param {string} storeName - Name of the object store
     * @param {string} id - ID of the item to get
     * @returns {Promise} - Promise resolving to the item
     */
    async function getItemById(storeName, id) {
        return new Promise(async (resolve, reject) => {
            try {
                const { store } = await getStore(storeName);
                const request = store.get(id);
                
                request.onsuccess = () => {
                    if (request.result) {
                        resolve(request.result);
                    } else {
                        resolve(null); // Item not found
                    }
                };
                
                request.onerror = (event) => reject(`Error getting item from ${storeName}: ${event.target.error}`);
            } catch (error) {
                reject(`Error in getItemById: ${error}`);
            }
        });
    }

    /**
     * Delete an item from a store
     * @param {string} storeName - Name of the object store
     * @param {string} id - ID of the item to delete
     * @returns {Promise} - Promise resolving when item is deleted
     */
    async function deleteItem(storeName, id) {
        return new Promise(async (resolve, reject) => {
            try {
                const { transaction, store } = await getStore(storeName, 'readwrite');
                const request = store.delete(id);
                
                request.onsuccess = () => resolve(true);
                request.onerror = (event) => reject(`Error deleting item from ${storeName}: ${event.target.error}`);
                
                transaction.oncomplete = () => console.log(`Item deleted from ${storeName} successfully`);
            } catch (error) {
                reject(`Error in deleteItem: ${error}`);
            }
        });
    }

    /**
     * Get items by index value
     * @param {string} storeName - Name of the object store
     * @param {string} indexName - Name of the index
     * @param {any} value - Value to search for
     * @returns {Promise} - Promise resolving to an array of matching items
     */
    async function getItemsByIndex(storeName, indexName, value) {
        return new Promise(async (resolve, reject) => {
            try {
                const { store } = await getStore(storeName);
                const index = store.index(indexName);
                const request = index.getAll(value);
                
                request.onsuccess = () => resolve(request.result);
                request.onerror = (event) => reject(`Error getting items by index from ${storeName}: ${event.target.error}`);
            } catch (error) {
                reject(`Error in getItemsByIndex: ${error}`);
            }
        });
    }

    /**
     * Clear all data from a store
     * @param {string} storeName - Name of the object store
     * @returns {Promise} - Promise resolving when store is cleared
     */
    async function clearStore(storeName) {
        return new Promise(async (resolve, reject) => {
            try {
                const { transaction, store } = await getStore(storeName, 'readwrite');
                const request = store.clear();
                
                request.onsuccess = () => resolve(true);
                request.onerror = (event) => reject(`Error clearing ${storeName}: ${event.target.error}`);
                
                transaction.oncomplete = () => console.log(`${storeName} cleared successfully`);
            } catch (error) {
                reject(`Error in clearStore: ${error}`);
            }
        });
    }

    /**
     * Generate a unique ID
     * @returns {string} - A unique ID
     */
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substring(2);
    }

    // Task-specific methods
    async function addTask(task) {
        if (!task.createdAt) {
            task.createdAt = new Date().toISOString();
        }
        // Add isRepeating and repeatDays properties if they don't exist
        if (task.isRepeating === undefined) {
            task.isRepeating = false;
        }
        if (task.repeatDays === undefined) {
            // Array of days [sun, mon, tue, wed, thu, fri, sat] - all false by default
            task.repeatDays = [false, false, false, false, false, false, false];
        }
        return addItem(STORES.tasks, task);
    }

    async function updateTask(task) {
        return updateItem(STORES.tasks, task);
    }

    async function getTasks() {
        return getAllItems(STORES.tasks);
    }

    async function getTaskById(id) {
        return getItemById(STORES.tasks, id);
    }

    async function deleteTask(id) {
        return deleteItem(STORES.tasks, id);
    }

    // Habit-specific methods
    async function addHabit(habit) {
        if (!habit.createdAt) {
            habit.createdAt = new Date().toISOString();
        }
        if (!habit.completionDates) {
            habit.completionDates = [];
        }
        if (!habit.currentStreak) {
            habit.currentStreak = 0;
        }
        if (!habit.longestStreak) {
            habit.longestStreak = 0;
        }
        return addItem(STORES.habits, habit);
    }

    async function updateHabit(habit) {
        return updateItem(STORES.habits, habit);
    }

    async function getHabits() {
        return getAllItems(STORES.habits);
    }

    async function getHabitById(id) {
        return getItemById(STORES.habits, id);
    }

    async function deleteHabit(id) {
        return deleteItem(STORES.habits, id);
    }

    // Timer session-specific methods
    async function addTimerSession(session) {
        if (!session.startTime) {
            session.startTime = new Date().toISOString();
        }
        return addItem(STORES.timerSessions, session);
    }

    async function getTimerSessions() {
        return getAllItems(STORES.timerSessions);
    }

    async function deleteTimerSession(id) {
        return deleteItem(STORES.timerSessions, id);
    }

    // Course-specific methods
    async function addCourse(course) {
        if (!course.createdAt) {
            course.createdAt = new Date().toISOString();
        }
        if (!course.lastUpdated) {
            course.lastUpdated = new Date().toISOString();
        }
        if (!course.progress) {
            course.progress = 0;
        }
        return addItem(STORES.courses, course);
    }

    async function updateCourse(course) {
        course.lastUpdated = new Date().toISOString();
        return updateItem(STORES.courses, course);
    }

    async function getCourses() {
        return getAllItems(STORES.courses);
    }

    async function getCourseById(id) {
        return getItemById(STORES.courses, id);
    }

    async function deleteCourse(id) {
        // Delete course
        await deleteItem(STORES.courses, id);
        
        // Delete associated topics
        const topics = await getTopicsByCourseId(id);
        for (const topic of topics) {
            await deleteTopic(topic.id);
        }
        
        // Delete associated materials
        const materials = await getMaterialsByCourseId(id);
        for (const material of materials) {
            await deleteMaterial(material.id);
        }
        
        return true;
    }

    // Topic-specific methods
    async function addTopic(topic) {
        if (!topic.createdAt) {
            topic.createdAt = new Date().toISOString();
        }
        return addItem(STORES.topics, topic);
    }

    async function updateTopic(topic) {
        return updateItem(STORES.topics, topic);
    }

    async function getTopics() {
        return getAllItems(STORES.topics);
    }

    async function getTopicById(id) {
        return getItemById(STORES.topics, id);
    }

    async function getTopicsByCourseId(courseId) {
        return getItemsByIndex(STORES.topics, 'courseId', courseId);
    }

    async function deleteTopic(id) {
        return deleteItem(STORES.topics, id);
    }

    // Material-specific methods
    async function addMaterial(material) {
        if (!material.uploadedAt) {
            material.uploadedAt = new Date().toISOString();
        }
        return addItem(STORES.materials, material);
    }

    async function getMaterials() {
        return getAllItems(STORES.materials);
    }

    async function getMaterialById(id) {
        return getItemById(STORES.materials, id);
    }

    async function getMaterialsByCourseId(courseId) {
        return getItemsByIndex(STORES.materials, 'courseId', courseId);
    }

    async function deleteMaterial(id) {
        return deleteItem(STORES.materials, id);
    }

    // Settings-specific methods
    async function getSetting(key) {
        const setting = await getItemById(STORES.settings, key);
        return setting ? setting.value : null;
    }

    async function saveSetting(key, value) {
        return updateItem(STORES.settings, { id: key, value });
    }

    // Public API
    return {
        // General methods
        init,
        clearStore,
        
        // Tasks
        addTask,
        updateTask,
        getTasks,
        getTaskById,
        deleteTask,
        
        // Habits
        addHabit,
        updateHabit,
        getHabits,
        getHabitById,
        deleteHabit,
        
        // Timer sessions
        addTimerSession,
        getTimerSessions,
        deleteTimerSession,
        
        // Courses
        addCourse,
        updateCourse,
        getCourses,
        getCourseById,
        deleteCourse,
        
        // Topics
        addTopic,
        updateTopic,
        getTopics,
        getTopicById,
        getTopicsByCourseId,
        deleteTopic,
        
        // Materials
        addMaterial,
        getMaterials,
        getMaterialById,
        getMaterialsByCourseId,
        deleteMaterial,
        
        // Settings
        getSetting,
        saveSetting
    };
})();

// Initialize the database when the page loads
document.addEventListener('DOMContentLoaded', () => {
    db.init()
        .then(() => console.log('Database initialized'))
        .catch(error => console.error('Failed to initialize database:', error));
});
