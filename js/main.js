Vue.component('date-picker', {
    props: ['value'],
    template: `
        <input type="date" :value="value" @input="$emit('input', $event.target.value)" />
    `
});

Vue.component('card', {
    props: ['card', 'columnIndex', 'cardIndex'],
    template: `
        <div class="card" :class="{ completed: card.completed, overdue: card.overdue }">
            <h3>{{ card.title }}</h3>
            <p>{{ card.description }}</p>
            <p><strong>Дэдлайн:</strong> {{ card.deadline }}</p>
            <p><strong>Создано:</strong> {{ card.createdAt }}</p>
            <p><strong>Обновлено:</strong> {{ card.updatedAt }}</p>
            <date-picker v-model="card.deadline"></date-picker>
            <button @click="$emit('edit-card', columnIndex, cardIndex)">Редактировать</button>
            <button v-if="columnIndex < 3" @click="$emit('move-card', columnIndex, columnIndex + 1, cardIndex)">Переместить в следующую колонку</button>
            <button v-if="columnIndex === 2" @click="$emit('move-card', columnIndex, columnIndex - 1, cardIndex)">Вернуть в предыдущую колонку</button>
            <button v-if="columnIndex === 0 || columnIndex === 3" @click="$emit('remove-card', columnIndex, cardIndex)">Удалить</button>
            <p v-if="card.returnReason"><strong>Причина возврата:</strong> {{ card.returnReason }}</p>
        </div>
    `
});

Vue.component('board', {
    data() {
        return {
            columns: [
                { title: 'Запланированные задачи', cards: [] },
                { title: 'Задачи в работе', cards: [] },
                { title: 'Тестирование', cards: [] },
                { title: 'Выполненные задачи', cards: [] }
            ]
        };
    },
    created() {
        this.loadData();
    },
    methods: {
        addCard(columnIndex) {
            const title = prompt("Введите заголовок задачи:");
            const description = prompt("Введите описание задачи:");
            const deadline = new Date().toISOString().split('T')[0]; // Устанавливаем текущую дату по умолчанию
            const timestamp = new Date().toLocaleString();

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
                this.columns[columnIndex].cards.push(newCard);
                this.saveData();
            }
        },
        editCard(columnIndex, cardIndex) {
            const card = this.columns[columnIndex].cards[cardIndex];
            const title = prompt("Введите заголовок задачи:", card.title);
            const description = prompt("Введите описание задачи:", card.description);
            const timestamp = new Date().toLocaleString();

            if (title && description) {
                card.title = title;
                card.description = description;
                card.updatedAt = timestamp;
                this.saveData();
            }
        },
        removeCard(columnIndex, cardIndex) {
            if (confirm("Вы уверены, что хотите удалить эту карточку?")) {
                this.columns[columnIndex].cards.splice(cardIndex, 1);
                this.saveData();
            }
        },
        moveCard(sourceColumnIndex, targetColumnIndex, cardIndex) {
            const card = this.columns[sourceColumnIndex].cards[cardIndex];

            if (targetColumnIndex === 1 && sourceColumnIndex === 2) {
                const reason = prompt("Введите причину возврата:");
                if (reason) {
                    card.returnReason = reason; // Сохраняем причину возврата
                }
            }

            this.columns[targetColumnIndex].cards.push(card);
            this.columns[sourceColumnIndex].cards.splice(cardIndex, 1);
            this.checkOverdue(card);
            this.saveData();
        },
        checkOverdue(card) {
            const today = new Date();
            const deadline = new Date(card.deadline);
            card.overdue = deadline < today;
        },
        saveData() {
            localStorage.setItem('kanbanData', JSON.stringify(this.columns));
        },
        loadData() {
            const data = localStorage.getItem('kanbanData');
            if (data) {
                this.columns = JSON.parse(data);
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
            <div class="column" v-for="(column, index) in columns" :key="index">
                <h2>{{ column.title }}</h2>
                <button v-if="index === 0" @click="addCard(index)">Добавить задачу</button>
                <div v-for="(card, cardIndex) in column.cards" :key="cardIndex">
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

new Vue({
    el: '#app'
});