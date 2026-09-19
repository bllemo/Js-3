// Компонент для выбора даты (кастомный input для дедлайна)
// Работает с v-model родителя благодаря связке props 'value' и $emit 'input'
Vue.component('date-picker', {
    props: ['value'],
    template: `
        <input type="date" :value="value" @input="$emit('input', $event.target.value)" />
    `
});

// Компонент отдельной карточки (задачи)
Vue.component('card', {
    // Получает саму карточку, индекс её колонки и её собственный индекс в массиве
    props: ['card', 'columnIndex', 'cardIndex'],
    template: `
        <!-- Динамические классы: класс 'completed' добавится, если card.completed === true, и т.д. -->
        <div class="card" :class="{ completed: card.completed, overdue: card.overdue }">
            <h3>{{ card.title }}</h3>
            <p>{{ card.description }}</p>
            <p><strong>Дэдлайн:</strong> {{ card.deadline }}</p>
            <p><strong>Создано:</strong> {{ card.createdAt }}</p>
            <p><strong>Обновлено:</strong> {{ card.updatedAt }}</p>
            
            <!-- Поле для изменения дедлайна напрямую из карточки -->
            <date-picker v-model="card.deadline"></date-picker>
            
            <!-- Кнопки управления. $emit отправляет сигнал (событие) родительскому компоненту (board) -->
            <button @click="$emit('edit-card', columnIndex, cardIndex)">Редактировать</button>
            
            <!-- Кнопка "Вперед" видна только в 1, 2 и 3 колонках (индексы 0, 1, 2) -->
            <button v-if="columnIndex < 3" @click="$emit('move-card', columnIndex, columnIndex + 1, cardIndex)">Переместить в следующую колонку</button>
            
            <!-- Кнопка "Назад" видна ТОЛЬКО в 3 колонке "Тестирование" (индекс 2) -->
            <button v-if="columnIndex === 2" @click="$emit('move-card', columnIndex, columnIndex - 1, cardIndex)">Вернуть в предыдущую колонку</button>
            
            <!-- Удалять можно только из 1-й (индекс 0) и 4-й (индекс 3) колонок -->
            <button v-if="columnIndex === 0 || columnIndex === 3" @click="$emit('remove-card', columnIndex, cardIndex)">Удалить</button>
            
            <!-- Блок с причиной возврата появляется, только если в объекте карточки есть это свойство -->
            <p v-if="card.returnReason"><strong>Причина возврата:</strong> {{ card.returnReason }}</p>
        </div>
    `
});

// Главный компонент приложения — Канбан-доска
Vue.component('board', {
    data() {
        return {
            // Массив колонок, каждая содержит свой заголовок и массив карточек
            columns: [
                { title: 'Запланированные задачи', cards: [] }, // Индекс 0
                { title: 'Задачи в работе', cards: [] },        // Индекс 1
                { title: 'Тестирование', cards: [] },           // Индекс 2
                { title: 'Выполненные задачи', cards: [] }      // Индекс 3
            ]
        };
    },
    // Хук жизненного цикла: вызывается при создании компонента
    created() {
        this.loadData(); // Загружаем данные из памяти браузера при запуске
    },
    methods: {
        // Метод создания новой карточки
        addCard(columnIndex) {
            const title = prompt("Введите заголовок задачи:");
            const description = prompt("Введите описание задачи:");
            const deadline = new Date().toISOString().split('T')[0]; // Генерируем формат YYYY-MM-DD
            const timestamp = new Date().toLocaleString(); // Текущая дата и время текстом

            // Если пользователь ввел и заголовок, и описание
            if (title && description) {
                const newCard = {
                    title,
                    description,
                    deadline,
                    createdAt: timestamp,
                    updatedAt: timestamp,
                    completed: false,
                    overdue: false
                };
                // Добавляем карточку в конец массива выбранной колонки
                this.columns[columnIndex].cards.push(newCard);
                this.saveData(); // Сохраняем изменения
            }
        },
        // Метод редактирования существующей карточки
        editCard(columnIndex, cardIndex) {
            const card = this.columns[columnIndex].cards[cardIndex]; // Находим нужную карточку
            const title = prompt("Введите заголовок задачи:", card.title);
            const description = prompt("Введите описание задачи:", card.description);
            const timestamp = new Date().toLocaleString();

            // Если поля не пустые, обновляем данные и время обновления
            if (title && description) {
                card.title = title;
                card.description = description;
                card.updatedAt = timestamp;
                this.saveData();
            }
        },
        // Метод удаления карточки
        removeCard(columnIndex, cardIndex) {
            // Запрашиваем подтверждение
            if (confirm("Вы уверены, что хотите удалить эту карточку?")) {
                this.columns[columnIndex].cards.splice(cardIndex, 1); // Удаляем элемент из массива
                this.saveData();
            }
        },
        // Метод перемещения карточки между колонками
        moveCard(sourceColumnIndex, targetColumnIndex, cardIndex) {
            const card = this.columns[sourceColumnIndex].cards[cardIndex];

            // Проверка: если двигаем ИЗ Тестирования (2) В Работу (1)
            if (targetColumnIndex === 1 && sourceColumnIndex === 2) {
                const reason = prompt("Введите причину возврата:");
                if (reason) {
                    card.returnReason = reason; // Записываем причину в объект карточки
                }
            }

            // Проверка: если переносим в столбец "Выполненные" (3)
            if (targetColumnIndex === 3) {
                card.completed = true;   // Ставим флаг завершения
            } else {
                card.completed = false;  // Снимаем флаг, если вернули обратно
            }

            // Проверяем, не просрочен ли дедлайн перед перемещением
            this.checkOverdue(card);
            
            // Основной процесс перемещения: добавляем в новую колонку, удаляем из старой
            this.columns[targetColumnIndex].cards.push(card);
            this.columns[sourceColumnIndex].cards.splice(cardIndex, 1);
            
            this.saveData();
        },
        // Метод проверки на просрочку
        checkOverdue(card) {
            const today = new Date(); // Сейчас
            const deadline = new Date(card.deadline); // Дата из дедлайна карточки
            
            // Если дата дедлайна меньше текущей даты — карточка просрочена
            card.overdue = deadline < today; 
        },
        // Метод сохранения состояния доски в localStorage (память браузера)
        saveData() {
            localStorage.setItem('kanbanData', JSON.stringify(this.columns));
        },
        // Метод загрузки состояния доски из localStorage
        loadData() {
            const data = localStorage.getItem('kanbanData');
            if (data) {
                this.columns = JSON.parse(data); // Преобразуем строку обратно в массив объектов
                
                // Проходимся по всем загруженным карточкам и актуализируем статусы просрочки
                this.columns.forEach(column => {
                    column.cards.forEach(card => {
                        this.checkOverdue(card);
                    });
                });
            }
        }
    },
    template: `
        <div class="board">
            <!-- Отрисовываем 4 колонки циклом -->
            <div class="column" v-for="(column, index) in columns" :key="index">
                <h2>{{ column.title }}</h2>
                
                <!-- Кнопка "Добавить" есть только у первой колонки (индекс 0) -->
                <button v-if="index === 0" @click="addCard(index)">Добавить задачу</button>
                
                <!-- Отрисовываем карточки внутри колонки циклом -->
                <div v-for="(card, cardIndex) in column.cards" :key="cardIndex">
                    <!-- Передаем данные в компонент 'card' и слушаем события (edit-card, move-card, remove-card) -->
                    <card 
                        :card="card" 
                        :columnIndex="index" 
                        :cardIndex="cardIndex" 
                        @edit-card="editCard" 
                        @move-card="moveCard" 
                        @remove-card="removeCard">
                    </card>
                </div>
            </div>
        </div>
    `
});

// Создание и запуск экземпляра Vue
new Vue({
    el: '#app' // Привязка к элементу <div id="app"></div> в HTML
});