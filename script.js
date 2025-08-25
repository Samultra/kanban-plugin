// Глобальные переменные
let tasks = [];
let currentUser = 'maxim';
let allTasks = [];
let currentTaskId = null; // ID текущей задачи для редактирования
let isEditing = false; // Флаг редактирования

// Пользователи (теперь динамические)
let users = {
    maxim: { name: 'Максим', avatar: '👨‍🎨' },
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
    loadUsers(); // Загрузка пользователей при загрузке страницы
    loadCustomColumns(); // Загрузка кастомных столбцов
});

// Настройка обработчиков событий
function setupEventListeners() {
    document.getElementById('taskForm').addEventListener('submit', handleTaskSubmit);
    document.getElementById('addUserForm').addEventListener('submit', handleAddUserSubmit);
    document.getElementById('addColumnForm').addEventListener('submit', handleAddColumnSubmit);
    
    // Закрытие модальных окон
    window.addEventListener('click', function(event) {
        const taskModal = document.getElementById('taskModal');
        const viewTaskModal = document.getElementById('viewTaskModal');
        const addUserModal = document.getElementById('addUserModal');
        const addColumnModal = document.getElementById('addColumnModal');
        
        if (event.target === taskModal) {
            closeModal();
        }
        if (event.target === viewTaskModal) {
            closeViewModal();
        }
        if (event.target === addUserModal) {
            closeAddUserModal();
        }
        if (event.target === addColumnModal) {
            closeAddColumnModal();
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

// Проверка возможности перемещения (теперь можно во всех направлениях)
function canMoveTask(currentStatus, newStatus) {
    // Разрешаем перемещение во всех направлениях
    return true;
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
                showNotification('Невозможно переместить задачу', 'error');
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
                showNotification('Невозможно переместить задачу', 'error');
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

// Функции для работы с пользователями
function openAddUserModal() {
    const modal = document.getElementById('addUserModal');
    const form = document.getElementById('addUserForm');
    
    form.reset();
    modal.style.display = 'block';
    document.getElementById('newUserName').focus();
}

function closeAddUserModal() {
    document.getElementById('addUserModal').style.display = 'none';
}

function handleAddUserSubmit(e) {
    e.preventDefault();
    
    const userName = document.getElementById('newUserName').value.trim();
    const userAvatar = document.getElementById('newUserAvatar').value;
    
    if (!userName) {
        showNotification('Введите имя пользователя', 'error');
        return;
    }
    
    // Генерируем уникальный ID для пользователя
    const userId = generateUserId(userName);
    
    // Проверяем, что пользователь с таким именем не существует
    const existingUser = Object.values(users).find(user => 
        user.name.toLowerCase() === userName.toLowerCase()
    );
    
    if (existingUser) {
        showNotification('Пользователь с таким именем уже существует', 'error');
        return;
    }
    
    // Добавляем нового пользователя
    users[userId] = {
        name: userName,
        avatar: userAvatar
    };
    
    // Сохраняем в Firebase
    saveUsers();
    
    // Обновляем селектор
    updateUserSelect();
    
    // Переключаемся на нового пользователя
    currentUser = userId;
    document.getElementById('userSelect').value = userId;
    
    closeAddUserModal();
    showNotification(`Пользователь ${userName} добавлен`, 'success');
    
    // Перезагружаем задачи для нового пользователя
    loadTasks();
    renderTasks();
}

// Генерация ID пользователя
function generateUserId(name) {
    const baseId = name.toLowerCase()
        .replace(/[^a-zа-яё0-9]/g, '')
        .substring(0, 10);
    
    let userId = baseId;
    let counter = 1;
    
    while (users[userId]) {
        userId = `${baseId}${counter}`;
        counter++;
    }
    
    return userId;
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
window.openAddUserModal = openAddUserModal;
window.openAddColumnModal = openAddColumnModal;
window.closeModal = closeModal;
window.closeViewModal = closeViewModal;
window.closeAddUserModal = closeAddUserModal;
window.closeAddColumnModal = closeAddColumnModal;
window.editCurrentTask = editCurrentTask;
window.deleteCurrentTask = deleteCurrentTask;
window.deleteCurrentUser = deleteCurrentUser;
window.editTask = editTask;
window.deleteTask = deleteTask;
window.deleteColumn = deleteColumn;
window.viewTask = viewTask;
window.allowDrop = allowDrop;
window.drop = drop; 

// Загрузка пользователей из Firebase
function loadUsers() {
    // Временно используем только локальных пользователей
    console.log('Загружаем локальных пользователей...');
    updateUserSelect();
    
    // Попробуем загрузить из Firebase, но не будем блокировать приложение при ошибке
    database.ref('users').once('value')
        .then((snapshot) => {
            const data = snapshot.val();
            if (data) {
                // Обновляем объект users, сохраняя существующих пользователей
                Object.keys(data).forEach(userId => {
                    if (data[userId].name && data[userId].avatar) {
                        users[userId] = {
                            name: data[userId].name,
                            avatar: data[userId].avatar
                        };
                    }
                });
                updateUserSelect();
                console.log('Пользователи загружены из Firebase');
            }
        })
        .catch((error) => {
            console.warn('Не удалось загрузить пользователей из Firebase, используем локальных:', error.message);
            // Приложение продолжает работать с локальными пользователями
        });
}

// Сохранение пользователей в Firebase
function saveUsers() {
    const usersData = {};
    Object.keys(users).forEach(userId => {
        usersData[userId] = {
            name: users[userId].name,
            avatar: users[userId].avatar
        };
    });
    
    database.ref('users').set(usersData);
}

// Обновление селектора пользователей
function updateUserSelect() {
    const userSelect = document.getElementById('userSelect');
    const currentValue = userSelect.value;
    
    userSelect.innerHTML = '';
    Object.keys(users).forEach(userId => {
        const option = document.createElement('option');
        option.value = userId;
        option.textContent = `${users[userId].avatar} ${users[userId].name}`;
        userSelect.appendChild(option);
    });
    
    // Восстанавливаем выбранного пользователя
    if (currentValue && users[currentValue]) {
        userSelect.value = currentValue;
    } else if (Object.keys(users).length > 0) {
        userSelect.value = Object.keys(users)[0];
        currentUser = Object.keys(users)[0];
    }
}

// Удаление текущего пользователя
function deleteCurrentUser() {
    const userId = currentUser;
    deleteUser(userId);
}

// Удаление пользователя
function deleteUser(userId) {
    const user = users[userId];
    if (!user) return;
    
    // Проверяем, есть ли задачи у этого пользователя
    const hasTasks = tasks.some(task => task.userId === userId) || 
                    allTasks.some(task => task.userId === userId);
    
    if (hasTasks) {
        if (!confirm(`У пользователя "${user.name}" есть задачи. Удалить пользователя и все его задачи?`)) {
            return;
        }
        
        // Удаляем все задачи пользователя
        tasks = tasks.filter(task => task.userId !== userId);
        allTasks = allTasks.filter(task => task.userId !== userId);
        saveTasks();
    } else {
        if (!confirm(`Удалить пользователя "${user.name}"?`)) {
            return;
        }
    }
    
    // Удаляем пользователя из объекта
    delete users[userId];
    
    // Если удаляемый пользователь был текущим, переключаемся на первого доступного
    if (currentUser === userId) {
        const availableUsers = Object.keys(users);
        if (availableUsers.length > 0) {
            currentUser = availableUsers[0];
        } else {
            // Если нет пользователей, создаем дефолтного
            users.default = { name: 'Пользователь', avatar: '👤' };
            currentUser = 'default';
        }
    }
    
    // Сохраняем в Firebase
    saveUsers();
    
    // Обновляем селектор
    updateUserSelect();
    
    // Перезагружаем задачи
    loadTasks();
    loadAllTasks();
    renderTasks();
    renderAllTasks();
    
    showNotification(`Пользователь "${user.name}" удален`, 'success');
}

// Функции для работы с новыми столбцами
let customColumns = [];

// Стандартные столбцы
const standardColumns = [
    { status: 'todo', name: 'К выполнению', icon: 'fas fa-list' },
    { status: 'in-progress', name: 'В работе', icon: 'fas fa-spinner' },
    { status: 'review', name: 'На проверке', icon: 'fas fa-eye' },
    { status: 'done', name: 'Завершено', icon: 'fas fa-check-circle' }
];

function openAddColumnModal() {
    const modal = document.getElementById('addColumnModal');
    const form = document.getElementById('addColumnForm');
    
    form.reset();
    modal.style.display = 'block';
    document.getElementById('newColumnName').focus();
    
    // Добавляем обработчик для автоматической генерации статуса
    document.getElementById('newColumnName').addEventListener('input', generateColumnStatus);
}

function closeAddColumnModal() {
    document.getElementById('addColumnModal').style.display = 'none';
    
    // Удаляем обработчик при закрытии
    document.getElementById('newColumnName').removeEventListener('input', generateColumnStatus);
}

function generateColumnStatus() {
    const columnName = document.getElementById('newColumnName').value.trim();
    const statusField = document.getElementById('newColumnStatus');
    
    if (columnName) {
        // Генерируем статус из названия: убираем пробелы, приводим к нижнему регистру
        const status = columnName
            .toLowerCase()
            .replace(/[^а-яa-z0-9\s]/g, '') // Убираем спецсимволы
            .replace(/\s+/g, '-') // Заменяем пробелы на дефисы
            .replace(/-+/g, '-') // Убираем множественные дефисы
            .replace(/^-|-$/g, ''); // Убираем дефисы в начале и конце
        
        statusField.value = status;
    } else {
        statusField.value = '';
    }
}

function handleAddColumnSubmit(e) {
    e.preventDefault();
    
    const columnName = document.getElementById('newColumnName').value.trim();
    const columnStatus = document.getElementById('newColumnStatus').value.trim();
    const columnIcon = document.getElementById('newColumnIcon').value;
    
    if (!columnName) {
        showNotification('Введите название столбца', 'error');
        return;
    }
    
    if (!columnStatus) {
        showNotification('Статус не был сгенерирован', 'error');
        return;
    }
    
    // Проверяем, что статус уникален среди всех столбцов
    const allColumns = [...standardColumns, ...customColumns];
    const existingColumn = allColumns.find(col => col.status === columnStatus);
    if (existingColumn) {
        showNotification('Столбец с таким статусом уже существует', 'error');
        return;
    }
    
    // Добавляем новый столбец в начало массива (слева)
    const newColumn = {
        name: columnName,
        status: columnStatus,
        icon: columnIcon
    };
    
    customColumns.unshift(newColumn); // Добавляем в начало массива
    
    // Сохраняем в localStorage
    localStorage.setItem('customColumns', JSON.stringify(customColumns));
    
    // Обновляем отображение
    renderAllColumns();
    
    closeAddColumnModal();
    showNotification(`Столбец "${columnName}" добавлен`, 'success');
}

function renderAllColumns() {
    // Добавляем столбцы в обе вкладки
    const personalTab = document.querySelector('#personal-tab .kanban-board');
    const allTab = document.querySelector('#all-tab .kanban-board');
    
    // Очищаем все столбцы, кроме кнопки добавления
    const addColumnBtn = personalTab.querySelector('.add-column-btn');
    personalTab.innerHTML = '';
    personalTab.appendChild(addColumnBtn);
    
    const addColumnBtnAll = allTab.querySelector('.add-column-btn');
    allTab.innerHTML = '';
    allTab.appendChild(addColumnBtnAll);
    
    // Создаем массив всех столбцов в правильном порядке
    const allColumns = [...customColumns, ...standardColumns];
    
    // Добавляем все столбцы
    allColumns.forEach((column, index) => {
        const isCustom = customColumns.some(col => col.status === column.status);
        const columnHTML = `
            <div class="column" data-status="${column.status}" ${isCustom ? 'data-custom="true"' : ''} draggable="true" data-column-index="${index}">
                <div class="column-header">
                    <h3><i class="${column.icon}"></i> ${column.name}</h3>
                    <div class="column-actions">
                        <span class="task-count">0</span>
                        ${isCustom ? `<button class="delete-column-btn" onclick="deleteColumn('${column.status}')" title="Удалить столбец">
                            <i class="fas fa-trash"></i>
                        </button>` : ''}
                    </div>
                </div>
                <div class="task-list" ondrop="drop(event)" ondragover="allowDrop(event)">
                    <!-- Задачи будут добавляться здесь -->
                </div>
                <button class="add-task-btn" onclick="openAddTaskModal('${column.status}')">
                    <i class="fas fa-plus"></i> Добавить задачу
                </button>
            </div>
        `;
        
        // Добавляем в обе вкладки
        personalTab.insertAdjacentHTML('beforeend', columnHTML);
        allTab.insertAdjacentHTML('beforeend', columnHTML);
    });
    
    // Добавляем обработчики для перетаскивания столбцов
    setupColumnDragAndDrop();
    
    // Обновляем отображение задач
    renderTasks();
    renderAllTasks();
}

function renderCustomColumns() {
    renderAllColumns();
}

function loadCustomColumns() {
    const savedColumns = localStorage.getItem('customColumns');
    if (savedColumns) {
        customColumns = JSON.parse(savedColumns);
    }
    renderAllColumns();
}

// Функции для работы со столбцами
function deleteColumn(columnStatus) {
    const column = customColumns.find(col => col.status === columnStatus);
    if (!column) return;
    
    // Проверяем, есть ли задачи в этом столбце
    const hasTasks = tasks.some(task => task.status === columnStatus) || 
                    allTasks.some(task => task.status === columnStatus);
    
    if (hasTasks) {
        if (!confirm(`В столбце "${column.name}" есть задачи. Удалить столбец и все задачи в нем?`)) {
            return;
        }
        
        // Удаляем все задачи из этого столбца
        tasks = tasks.filter(task => task.status !== columnStatus);
        allTasks = allTasks.filter(task => task.status !== columnStatus);
        saveTasks();
    } else {
        if (!confirm(`Удалить столбец "${column.name}"?`)) {
            return;
        }
    }
    
    // Удаляем столбец из массива
    customColumns = customColumns.filter(col => col.status !== columnStatus);
    
    // Сохраняем в localStorage
    localStorage.setItem('customColumns', JSON.stringify(customColumns));
    
    // Обновляем отображение
    renderAllColumns();
    showNotification(`Столбец "${column.name}" удален`, 'success');
}

function setupColumnDragAndDrop() {
    const columns = document.querySelectorAll('.column[draggable="true"]');
    
    columns.forEach(column => {
        column.addEventListener('dragstart', handleColumnDragStart);
        column.addEventListener('dragend', handleColumnDragEnd);
        column.addEventListener('dragover', handleColumnDragOver);
        column.addEventListener('drop', handleColumnDrop);
    });
}

function handleColumnDragStart(e) {
    e.target.classList.add('column-dragging');
    e.dataTransfer.setData('text/plain', e.target.getAttribute('data-column-index'));
    e.dataTransfer.effectAllowed = 'move';
}

function handleColumnDragEnd(e) {
    e.target.classList.remove('column-dragging');
}

function handleColumnDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleColumnDrop(e) {
    e.preventDefault();
    
    const draggedIndex = parseInt(e.dataTransfer.getData('text/plain'));
    const targetColumn = e.currentTarget;
    const targetIndex = parseInt(targetColumn.getAttribute('data-column-index'));
    
    if (draggedIndex === targetIndex) return;
    
    // Определяем, какой столбец перемещается
    const allColumns = [...customColumns, ...standardColumns];
    const draggedColumn = allColumns[draggedIndex];
    
    if (!draggedColumn) return;
    
    // Если перемещается кастомный столбец
    const isCustomColumn = customColumns.some(col => col.status === draggedColumn.status);
    
    if (isCustomColumn) {
        // Находим индекс в массиве кастомных столбцов
        const customIndex = customColumns.findIndex(col => col.status === draggedColumn.status);
        const draggedCustomColumn = customColumns[customIndex];
        
        // Удаляем из текущей позиции
        customColumns.splice(customIndex, 1);
        
        // Вычисляем новую позицию в массиве кастомных столбцов
        const newCustomIndex = Math.max(0, Math.min(targetIndex, customColumns.length));
        customColumns.splice(newCustomIndex, 0, draggedCustomColumn);
        
        // Сохраняем в localStorage
        localStorage.setItem('customColumns', JSON.stringify(customColumns));
    }
    
    // Обновляем отображение
    renderAllColumns();
    showNotification('Порядок столбцов изменен', 'success');
} 