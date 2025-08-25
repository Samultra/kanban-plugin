// Глобальные переменные
let tasks = [];
let currentUser = 'maxim';
let allTasks = [];
let currentTaskId = null; // ID текущей задачи для редактирования
let isEditing = false; // Флаг редактирования

// Пользователи
const users = {
    maxim: { name: 'Максим', avatar: '👨‍💼' },
    mark: { name: 'Марк', avatar: '👨‍💻' }
};

// Проверка подключения к Firebase
function checkFirebaseConnection() {
    console.log('🔍 Проверка подключения к Firebase...');
    
    // Проверяем инициализацию Firebase
    if (firebase.app()) {
        console.log('✅ Firebase инициализирован');
        console.log('📊 Конфигурация:', firebase.app().options);
    } else {
        console.error('❌ Firebase не инициализирован');
        return false;
    }
    
    // Проверяем подключение к базе данных
    if (database) {
        console.log('✅ База данных подключена');
        
        // Пробуем записать тестовые данные
        const testRef = database.ref('test_connection');
        testRef.set({
            timestamp: new Date().toISOString(),
            message: 'Тестовое подключение'
        })
        .then(() => {
            console.log('✅ Запись в базу данных работает');
            // Удаляем тестовые данные
            return testRef.remove();
        })
        .then(() => {
            console.log('✅ Удаление из базы данных работает');
            showNotification('Firebase подключен успешно!', 'success');
        })
        .catch((error) => {
            console.error('❌ Ошибка записи в базу данных:', error);
            showNotification('Ошибка подключения к Firebase', 'error');
        });
        
        return true;
    } else {
        console.error('❌ База данных не подключена');
        showNotification('Ошибка подключения к базе данных', 'error');
        return false;
    }
}

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    // Проверяем подключение к Firebase
    checkFirebaseConnection();
    
    loadCurrentUser();
    loadTasks();
    loadAllTasks();
    renderTasks();
    renderAllTasks();
    setupEventListeners();
    setupFirebaseListeners();
});

// Настройка обработчиков событий
function setupEventListeners() {
    document.getElementById('taskForm').addEventListener('submit', handleTaskSubmit);
    
    // Закрытие модального окна
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('taskModal');
        if (event.target === modal) {
            closeModal();
        }
    });
}

// Настройка слушателей Firebase
function setupFirebaseListeners() {
    // Слушаем изменения в Firebase для каждого пользователя
    Object.keys(users).forEach(userId => {
        const userRef = database.ref(`users/${userId}/tasks`);
        userRef.on('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                // Обновляем локальные данные
                if (userId === currentUser) {
                    tasks = Object.values(data);
                    renderTasks();
                }
                loadAllTasks();
                renderAllTasks();
                showNotification('Данные обновлены с другого устройства', 'info');
            }
        });
    });
}

// Генерация ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Сохранение задач в Firebase
function saveTasks() {
    const tasksObject = {};
    tasks.forEach(task => {
        tasksObject[task.id] = task;
    });
    
    database.ref(`users/${currentUser}/tasks`).set(tasksObject);
}

// Загрузка задач из Firebase
function loadTasks() {
    database.ref(`users/${currentUser}/tasks`).once('value')
        .then((snapshot) => {
            const data = snapshot.val();
            if (data) {
                tasks = Object.values(data);
            } else {
                tasks = [];
            }
            renderTasks();
        })
        .catch((error) => {
            console.error('Ошибка загрузки задач:', error);
            tasks = [];
            renderTasks();
        });
}

// Загрузка всех задач из Firebase
function loadAllTasks() {
    allTasks = [];
    const promises = Object.keys(users).map(userId => {
        return database.ref(`users/${userId}/tasks`).once('value')
            .then((snapshot) => {
                const data = snapshot.val();
                if (data) {
                    const userTasks = Object.values(data);
                    userTasks.forEach(task => {
                        task.userId = userId;
                        task.userName = users[userId].name;
                        task.userAvatar = users[userId].avatar;
                    });
                    allTasks = allTasks.concat(userTasks);
                }
            })
            .catch((error) => {
                console.error(`Ошибка загрузки задач пользователя ${userId}:`, error);
            });
    });
    
    Promise.all(promises).then(() => {
        renderAllTasks();
    });
}

// Получение ID устройства
function getDeviceId() {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
        deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2);
        localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
}

// Сохранение текущего пользователя
function saveCurrentUser() {
    localStorage.setItem('currentUser', currentUser);
}

// Загрузка текущего пользователя
function loadCurrentUser() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser && users[savedUser]) {
        currentUser = savedUser;
        document.getElementById('userSelect').value = currentUser;
    }
}

// Переключение пользователя
function switchUser() {
    const userSelect = document.getElementById('userSelect');
    const newUser = userSelect.value;
    
    if (newUser !== currentUser) {
        currentUser = newUser;
        saveCurrentUser();
        loadTasks();
        loadAllTasks();
        renderTasks();
        renderAllTasks();
        showNotification(`Переключились на пользователя: ${users[currentUser].name}`, 'info');
    }
}

// Переключение вкладок
function switchTab(tabName) {
    // Убираем активный класс со всех кнопок и контента
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Добавляем активный класс к нужной кнопке и контенту
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    // Обновляем содержимое в зависимости от вкладки
    if (tabName === 'all') {
        loadAllTasks();
        renderAllTasks();
    } else {
        renderTasks();
    }
}

// Отображение задач
function renderTasks() {
    const columns = document.querySelectorAll('#personal-tab .column');
    
    columns.forEach(column => {
        const status = column.getAttribute('data-status');
        const taskList = column.querySelector('.task-list');
        const taskCount = column.querySelector('.task-count');
        
        taskList.innerHTML = '';
        
        const columnTasks = tasks.filter(task => task.status === status);
        taskCount.textContent = columnTasks.length;
        
        columnTasks.forEach(task => {
            const taskElement = createTaskElement(task);
            taskList.appendChild(taskElement);
        });
    });
}

// Отображение всех задач
function renderAllTasks() {
    const columns = document.querySelectorAll('#all-tab .column');
    
    columns.forEach(column => {
        const status = column.getAttribute('data-status');
        const taskList = column.querySelector('.task-list');
        const taskCount = column.querySelector('.task-count');
        
        taskList.innerHTML = '';
        
        const columnTasks = allTasks.filter(task => task.status === status);
        taskCount.textContent = columnTasks.length;
        
        columnTasks.forEach(task => {
            const taskElement = createAllTasksElement(task);
            taskList.appendChild(taskElement);
        });
    });
}

// Создание элемента задачи
function createTaskElement(task) {
    const taskElement = document.createElement('div');
    taskElement.className = 'task';
    taskElement.draggable = true;
    taskElement.setAttribute('data-task-id', task.id);
    
    taskElement.innerHTML = `
        <div class="task-title">${escapeHtml(task.title)}</div>
        ${task.description ? `<div class="task-description">${escapeHtml(task.description)}</div>` : ''}
        <span class="task-priority priority-${task.priority}">${getPriorityText(task.priority)}</span>
        <div class="task-actions">
            <button class="task-action-btn edit" onclick="editTask('${task.id}')" title="Редактировать">
                <i class="fas fa-edit"></i>
            </button>
            <button class="task-action-btn delete" onclick="deleteTask('${task.id}')" title="Удалить">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    
    taskElement.addEventListener('dragstart', handleDragStart);
    taskElement.addEventListener('dragend', handleDragEnd);
    
    return taskElement;
}

// Создание элемента задачи для всех пользователей
function createAllTasksElement(task) {
    const taskElement = document.createElement('div');
    taskElement.className = 'task';
    taskElement.draggable = true;
    taskElement.setAttribute('data-task-id', task.id);
    taskElement.setAttribute('data-user-id', task.userId);
    
    taskElement.innerHTML = `
        <div class="task-title">${escapeHtml(task.title)} ${task.userAvatar}</div>
        ${task.description ? `<div class="task-description">${escapeHtml(task.description)}</div>` : ''}
        <span class="task-priority priority-${task.priority}">${getPriorityText(task.priority)}</span>
        <div class="task-actions">
            <button class="task-action-btn edit" onclick="editTask('${task.id}', '${task.userId}')" title="Редактировать">
                <i class="fas fa-edit"></i>
            </button>
            <button class="task-action-btn delete" onclick="deleteTask('${task.id}', '${task.userId}')" title="Удалить">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    
    taskElement.addEventListener('dragstart', handleDragStart);
    taskElement.addEventListener('dragend', handleDragEnd);
    
    return taskElement;
}

// Получение текста приоритета
function getPriorityText(priority) {
    const priorities = {
        'low': 'Низкий',
        'medium': 'Средний',
        'high': 'Высокий',
        'urgent': 'Срочный'
    };
    return priorities[priority] || priority;
}

// Экранирование HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Проверка возможности перемещения (только слева направо)
function canMoveTask(currentStatus, newStatus) {
    const statusOrder = ['todo', 'in-progress', 'review', 'done'];
    const currentIndex = statusOrder.indexOf(currentStatus);
    const newIndex = statusOrder.indexOf(newStatus);
    return newIndex === currentIndex + 1;
}

// Drag and Drop
function handleDragStart(e) {
    e.target.classList.add('dragging');
    const taskId = e.target.getAttribute('data-task-id');
    e.dataTransfer.setData('text/plain', taskId);
    
    document.querySelectorAll('.task-list').forEach(list => {
        list.classList.remove('drag-over');
        list.classList.remove('drag-over-invalid');
    });
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
}

function allowDrop(e) {
    e.preventDefault();
    
    const draggedTaskId = e.dataTransfer.getData('text/plain');
    if (!draggedTaskId) return;
    
    const isAllTasks = e.currentTarget.closest('#all-tab');
    let currentTask;
    
    if (isAllTasks) {
        currentTask = allTasks.find(t => t.id === draggedTaskId);
    } else {
        currentTask = tasks.find(t => t.id === draggedTaskId);
    }
    
    if (!currentTask) return;
    
    const targetStatus = e.currentTarget.closest('.column').getAttribute('data-status');
    
    if (canMoveTask(currentTask.status, targetStatus)) {
        e.currentTarget.classList.add('drag-over');
    } else {
        e.currentTarget.classList.add('drag-over-invalid');
    }
}

function drop(e) {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    const newStatus = e.currentTarget.closest('.column').getAttribute('data-status');
    
    document.querySelectorAll('.task-list').forEach(list => {
        list.classList.remove('drag-over');
        list.classList.remove('drag-over-invalid');
    });
    
    const isAllTasks = e.currentTarget.closest('#all-tab');
    
    if (isAllTasks) {
        const task = allTasks.find(t => t.id === taskId);
        if (task && task.status !== newStatus) {
            if (!canMoveTask(task.status, newStatus)) {
                showNotification('Можно перемещать задачи только на следующий этап справа', 'error');
                return;
            }
            
            // Обновляем задачу в Firebase
            database.ref(`users/${task.userId}/tasks/${taskId}/status`).set(newStatus)
                .then(() => {
                    showNotification(`Задача ${task.userName} перемещена`, 'success');
                })
                .catch((error) => {
                    console.error('Ошибка обновления задачи:', error);
                    showNotification('Ошибка при перемещении задачи', 'error');
                });
        }
    } else {
        const task = tasks.find(t => t.id === taskId);
        if (task && task.status !== newStatus) {
            if (!canMoveTask(task.status, newStatus)) {
                showNotification('Можно перемещать задачи только на следующий этап справа', 'error');
                return;
            }
            
            task.status = newStatus;
            saveTasks();
            showNotification('Задача перемещена', 'success');
        }
    }
}

// Модальные окна
function openAddTaskModal(status = null) {
    const modal = document.getElementById('taskModal');
    const form = document.getElementById('taskForm');
    
    // Сбрасываем флаги редактирования
    isEditing = false;
    currentTaskId = null;
    
    // Сбрасываем форму
    form.reset();
    
    // Обновляем заголовок
    document.getElementById('modalTitle').textContent = 'Добавить задачу';
    
    if (status) {
        document.getElementById('taskStatus').value = status;
    }
    
    modal.style.display = 'block';
    document.getElementById('taskTitle').focus();
}

function closeModal() {
    document.getElementById('taskModal').style.display = 'none';
    isEditing = false;
    currentTaskId = null;
}

// Функции редактирования и удаления задач
function editTask(taskId, userId = null) {
    let task;
    
    if (userId) {
        // Редактирование задачи из "Все задачи"
        task = allTasks.find(t => t.id === taskId && t.userId === userId);
        if (!task) return;
        
        // Проверяем, что редактируем задачу текущего пользователя
        if (task.userId !== currentUser) {
            showNotification('Можно редактировать только свои задачи', 'error');
            return;
        }
    } else {
        // Редактирование задачи из "Мои задачи"
        task = tasks.find(t => t.id === taskId);
        if (!task) return;
    }
    
    // Заполняем форму данными задачи
    document.getElementById('taskTitle').value = task.title;
    document.getElementById('taskDescription').value = task.description || '';
    document.getElementById('taskPriority').value = task.priority;
    document.getElementById('taskStatus').value = task.status;
    
    // Устанавливаем флаги редактирования
    isEditing = true;
    currentTaskId = taskId;
    
    // Обновляем заголовок модального окна
    document.getElementById('modalTitle').textContent = 'Редактировать задачу';
    
    // Открываем модальное окно
    document.getElementById('taskModal').style.display = 'block';
    document.getElementById('taskTitle').focus();
}

function deleteTask(taskId, userId = null) {
    let task;
    
    if (userId) {
        // Удаление задачи из "Все задачи"
        task = allTasks.find(t => t.id === taskId && t.userId === userId);
        if (!task) return;
        
        // Проверяем, что удаляем задачу текущего пользователя
        if (task.userId !== currentUser) {
            showNotification('Можно удалять только свои задачи', 'error');
            return;
        }
    } else {
        // Удаление задачи из "Мои задачи"
        task = tasks.find(t => t.id === taskId);
        if (!task) return;
    }
    
    // Подтверждение удаления
    if (confirm(`Вы уверены, что хотите удалить задачу "${task.title}"?`)) {
        // Удаляем задачу из массива
        if (userId) {
            // Удаляем из allTasks
            allTasks = allTasks.filter(t => !(t.id === taskId && t.userId === userId));
        } else {
            // Удаляем из tasks
            tasks = tasks.filter(t => t.id !== taskId);
        }
        
        // Сохраняем в Firebase
        saveTasks();
        
        // Обновляем отображение
        renderTasks();
        renderAllTasks();
        
        showNotification('Задача удалена', 'success');
    }
}

// Функции для модального окна просмотра задачи
function viewTask(taskId, userId = null) {
    let task;
    
    if (userId) {
        task = allTasks.find(t => t.id === taskId && t.userId === userId);
    } else {
        task = tasks.find(t => t.id === taskId);
    }
    
    if (!task) return;
    
    currentTaskId = taskId;
    
    // Заполняем детали задачи
    const taskDetails = document.getElementById('taskDetails');
    taskDetails.innerHTML = `
        <div class="task-detail-item">
            <strong>Название:</strong> ${escapeHtml(task.title)}
        </div>
        ${task.description ? `
        <div class="task-detail-item">
            <strong>Описание:</strong> ${escapeHtml(task.description)}
        </div>
        ` : ''}
        <div class="task-detail-item">
            <strong>Приоритет:</strong> <span class="task-priority priority-${task.priority}">${getPriorityText(task.priority)}</span>
        </div>
        <div class="task-detail-item">
            <strong>Статус:</strong> ${getStatusText(task.status)}
        </div>
        <div class="task-detail-item">
            <strong>Создано:</strong> ${new Date(task.createdAt).toLocaleDateString('ru-RU')}
        </div>
        ${userId ? `
        <div class="task-detail-item">
            <strong>Пользователь:</strong> ${task.userAvatar} ${escapeHtml(task.userName)}
        </div>
        ` : ''}
    `;
    
    // Показываем модальное окно
    document.getElementById('viewTaskModal').style.display = 'block';
}

function closeViewModal() {
    document.getElementById('viewTaskModal').style.display = 'none';
    currentTaskId = null;
}

function editCurrentTask() {
    closeViewModal();
    if (currentTaskId) {
        editTask(currentTaskId);
    }
}

function deleteCurrentTask() {
    if (currentTaskId && confirm('Вы уверены, что хотите удалить эту задачу?')) {
        deleteTask(currentTaskId);
        closeViewModal();
    }
}

// Получение текста статуса
function getStatusText(status) {
    const statuses = {
        'todo': 'К выполнению',
        'in-progress': 'В работе',
        'review': 'На проверке',
        'done': 'Завершено'
    };
    return statuses[status] || status;
}

// Обработка формы
function handleTaskSubmit(e) {
    e.preventDefault();
    
    const taskData = {
        title: document.getElementById('taskTitle').value,
        description: document.getElementById('taskDescription').value,
        priority: document.getElementById('taskPriority').value,
        status: document.getElementById('taskStatus').value
    };
    
    if (isEditing && currentTaskId) {
        // Редактирование существующей задачи
        const taskIndex = tasks.findIndex(t => t.id === currentTaskId);
        if (taskIndex !== -1) {
            tasks[taskIndex] = { ...tasks[taskIndex], ...taskData };
            saveTasks();
            closeModal();
            showNotification('Задача обновлена', 'success');
        }
    } else {
        // Создание новой задачи
        const newTask = {
            id: generateId(),
            ...taskData,
            createdAt: new Date().toISOString()
        };
        
        tasks.push(newTask);
        saveTasks();
        closeModal();
        showNotification('Задача создана', 'success');
    }
}

// Уведомления
function showNotification(message, type = 'info') {
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 3000);
}

// Глобальные функции
window.switchUser = switchUser;
window.switchTab = switchTab;
window.openAddTaskModal = openAddTaskModal;
window.closeModal = closeModal;
window.closeViewModal = closeViewModal;
window.editCurrentTask = editCurrentTask;
window.deleteCurrentTask = deleteCurrentTask;
window.editTask = editTask;
window.deleteTask = deleteTask;
window.viewTask = viewTask;
window.allowDrop = allowDrop;
window.drop = drop; 