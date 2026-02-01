// Habit Tracker App
const STORAGE_KEY = 'habitTrackerData';
const DAYS_TO_SHOW = 30;

// DOM Elements
const addHabitBtn = document.getElementById('addHabitBtn');
const habitModal = document.getElementById('habitModal');
const confirmModal = document.getElementById('confirmModal');
const modalTitle = document.getElementById('modalTitle');
const habitInput = document.getElementById('habitInput');
const saveBtn = document.getElementById('saveBtn');
const cancelBtn = document.getElementById('cancelBtn');
const deleteBtn = document.getElementById('deleteBtn');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const confirmCancelBtn = document.getElementById('confirmCancelBtn');
const tableHead = document.getElementById('tableHead');
const tableBody = document.getElementById('tableBody');
const emptyState = document.getElementById('emptyState');

// App State
let appData = {
    habits: [],
    tracking: {}
};
let editingHabitId = null;

// Initialize App
function init() {
    loadData();
    render();
    setupEventListeners();
    registerServiceWorker();
}

// Load data from localStorage
function loadData() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        try {
            appData = JSON.parse(stored);
        } catch (e) {
            console.error('Failed to parse stored data:', e);
            appData = { habits: [], tracking: {} };
        }
    }
}

// Save data to localStorage
function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
}

// Generate UUID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Get array of dates to display
function getDates() {
    const dates = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < DAYS_TO_SHOW; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        dates.push(date);
    }
    return dates;
}

// Format date for storage key (YYYY-MM-DD)
function formatDateKey(date) {
    return date.toISOString().split('T')[0];
}

// Format date for display
function formatDateDisplay(date) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return {
        day: days[date.getDay()],
        full: `${months[date.getMonth()]} ${date.getDate()}`
    };
}

// Check if date is today
function isToday(date) {
    const today = new Date();
    return date.toDateString() === today.toDateString();
}

// Render the entire table
function render() {
    if (appData.habits.length === 0) {
        emptyState.style.display = 'block';
        document.querySelector('.table-container').style.display = 'none';
        return;
    }

    emptyState.style.display = 'none';
    document.querySelector('.table-container').style.display = 'block';

    renderHeader();
    renderBody();
}

// Render table header with habit names
function renderHeader() {
    const headerRow = document.createElement('tr');

    // Date column header
    const dateHeader = document.createElement('th');
    dateHeader.textContent = 'Date';
    headerRow.appendChild(dateHeader);

    // Habit column headers
    appData.habits.forEach(habit => {
        const th = document.createElement('th');
        th.innerHTML = `
            <div class="habit-header" data-habit-id="${habit.id}">
                <span class="habit-name">${escapeHtml(habit.name)}</span>
                <span class="edit-icon">✎</span>
            </div>
        `;
        th.querySelector('.habit-header').addEventListener('click', () => openEditModal(habit));
        headerRow.appendChild(th);
    });

    tableHead.innerHTML = '';
    tableHead.appendChild(headerRow);
}

// Render table body with dates and checkboxes
function renderBody() {
    const dates = getDates();
    tableBody.innerHTML = '';

    dates.forEach(date => {
        const row = document.createElement('tr');
        const dateKey = formatDateKey(date);

        if (isToday(date)) {
            row.classList.add('today-row');
        }

        // Date cell
        const dateCell = document.createElement('td');
        const dateDisplay = formatDateDisplay(date);
        dateCell.innerHTML = `
            <div class="date-cell">
                <span class="date-day">${dateDisplay.day}</span>
                <span class="date-full">${dateDisplay.full}</span>
            </div>
        `;
        row.appendChild(dateCell);

        // Checkbox cells for each habit
        appData.habits.forEach(habit => {
            const td = document.createElement('td');
            td.classList.add('checkbox-cell');

            const isChecked = appData.tracking[dateKey]?.[habit.id] || false;

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.classList.add('habit-checkbox');
            checkbox.checked = isChecked;
            checkbox.setAttribute('aria-label', `${habit.name} on ${dateDisplay.full}`);

            checkbox.addEventListener('change', () => {
                toggleTracking(dateKey, habit.id, checkbox.checked);
            });

            td.appendChild(checkbox);
            row.appendChild(td);
        });

        tableBody.appendChild(row);
    });
}

// Toggle tracking for a specific date and habit
function toggleTracking(dateKey, habitId, checked) {
    if (!appData.tracking[dateKey]) {
        appData.tracking[dateKey] = {};
    }

    if (checked) {
        appData.tracking[dateKey][habitId] = true;
    } else {
        delete appData.tracking[dateKey][habitId];
        // Clean up empty date entries
        if (Object.keys(appData.tracking[dateKey]).length === 0) {
            delete appData.tracking[dateKey];
        }
    }

    saveData();
}

// Add a new habit
function addHabit(name) {
    const habit = {
        id: generateId(),
        name: name.trim(),
        createdAt: Date.now()
    };
    appData.habits.push(habit);
    saveData();
    render();
}

// Update an existing habit
function updateHabit(id, newName) {
    const habit = appData.habits.find(h => h.id === id);
    if (habit) {
        habit.name = newName.trim();
        saveData();
        render();
    }
}

// Delete a habit and its tracking data
function deleteHabit(id) {
    appData.habits = appData.habits.filter(h => h.id !== id);

    // Remove tracking data for this habit
    Object.keys(appData.tracking).forEach(dateKey => {
        delete appData.tracking[dateKey][id];
        if (Object.keys(appData.tracking[dateKey]).length === 0) {
            delete appData.tracking[dateKey];
        }
    });

    saveData();
    render();
}

// Modal functions
function openAddModal() {
    editingHabitId = null;
    modalTitle.textContent = 'Add New Habit';
    habitInput.value = '';
    deleteBtn.style.display = 'none';
    habitModal.classList.add('active');
    habitInput.focus();
}

function openEditModal(habit) {
    editingHabitId = habit.id;
    modalTitle.textContent = 'Edit Habit';
    habitInput.value = habit.name;
    deleteBtn.style.display = 'block';
    habitModal.classList.add('active');
    habitInput.focus();
    habitInput.select();
}

function closeModal() {
    habitModal.classList.remove('active');
    editingHabitId = null;
}

function closeConfirmModal() {
    confirmModal.classList.remove('active');
}

function handleSave() {
    const name = habitInput.value.trim();
    if (!name) return;

    if (editingHabitId) {
        updateHabit(editingHabitId, name);
    } else {
        addHabit(name);
    }

    closeModal();
}

function handleDelete() {
    confirmModal.classList.add('active');
}

function confirmDelete() {
    if (editingHabitId) {
        deleteHabit(editingHabitId);
    }
    closeConfirmModal();
    closeModal();
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Setup event listeners
function setupEventListeners() {
    addHabitBtn.addEventListener('click', openAddModal);
    saveBtn.addEventListener('click', handleSave);
    cancelBtn.addEventListener('click', closeModal);
    deleteBtn.addEventListener('click', handleDelete);
    confirmDeleteBtn.addEventListener('click', confirmDelete);
    confirmCancelBtn.addEventListener('click', closeConfirmModal);

    // Enter key to save
    habitInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            handleSave();
        } else if (e.key === 'Escape') {
            closeModal();
        }
    });

    // Close modal on overlay click
    habitModal.addEventListener('click', (e) => {
        if (e.target === habitModal) {
            closeModal();
        }
    });

    confirmModal.addEventListener('click', (e) => {
        if (e.target === confirmModal) {
            closeConfirmModal();
        }
    });
}

// Register Service Worker
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./js/sw.js')
            .then(reg => console.log('Service Worker registered'))
            .catch(err => console.log('Service Worker registration failed:', err));
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
