<script setup>
import { computed, ref } from 'vue'

const todos = ref([])
const draft = ref('')
const filter = ref('all')
const input = ref(null)

const filters = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'completed', label: 'Completed' },
]

const remaining = computed(() => todos.value.filter((todo) => !todo.completed).length)
const visibleTodos = computed(() => todos.value.filter((todo) => {
  if (filter.value === 'active') return !todo.completed
  if (filter.value === 'completed') return todo.completed
  return true
}))
const emptyTitle = computed(() => {
  if (filter.value === 'active' && todos.value.length) return 'You’re all caught up'
  if (filter.value === 'completed' && todos.value.length) return 'Nothing completed yet'
  return 'Your list is a blank page'
})
const emptyCopy = computed(() => {
  if (filter.value === 'active' && todos.value.length) return 'Enjoy the breathing room, or add another task.'
  if (filter.value === 'completed' && todos.value.length) return 'Finished tasks will find their way here.'
  return 'Add one small thing you’d like to make happen today.'
})

function addTodo() {
  const title = draft.value.trim()
  if (!title) {
    input.value?.focus()
    return
  }
  todos.value.unshift({ id: crypto.randomUUID(), title, completed: false })
  draft.value = ''
  input.value?.focus()
}

function removeTodo(id) {
  todos.value = todos.value.filter((todo) => todo.id !== id)
}
</script>

<template>
  <main class="page-shell">
    <header class="topbar">
      <a class="wordmark" href="#top" aria-label="Little List home">
        <span class="brand-mark" aria-hidden="true"><span></span><span></span><span></span></span>
        little list
      </a>
      <span class="top-note"><span class="sun" aria-hidden="true">✳</span> A little progress is still progress.</span>
    </header>

    <section id="top" class="todo-card" aria-labelledby="page-title">
      <div class="intro">
        <p class="eyebrow">YOUR SPACE, YOUR PACE</p>
        <h1 id="page-title">Make room for<br /><span>what matters.</span></h1>
        <p class="intro-copy">A clear mind starts with a little list.</p>
      </div>

      <form class="add-form" @submit.prevent="addTodo">
        <label class="sr-only" for="new-task">Add a task</label>
        <span class="add-symbol" aria-hidden="true">＋</span>
        <input
          id="new-task"
          ref="input"
          v-model="draft"
          type="text"
          maxlength="180"
          placeholder="What would you like to do?"
          autocomplete="off"
        />
        <button class="add-button" type="submit">Add task <span aria-hidden="true">↗</span></button>
      </form>

      <div class="list-heading">
        <div>
          <h2>Your tasks</h2>
          <p class="count" aria-live="polite">{{ remaining }} {{ remaining === 1 ? 'thing' : 'things' }} left to do</p>
        </div>
        <div class="filters" role="group" aria-label="Filter tasks">
          <button
            v-for="item in filters"
            :key="item.id"
            type="button"
            :class="{ selected: filter === item.id }"
            :aria-pressed="filter === item.id"
            @click="filter = item.id"
          >{{ item.label }}</button>
        </div>
      </div>

      <ul v-if="visibleTodos.length" class="todo-list" aria-label="Tasks">
        <li v-for="todo in visibleTodos" :key="todo.id" class="todo-row" :class="{ done: todo.completed }">
          <label class="todo-label">
            <input v-model="todo.completed" type="checkbox" :aria-label="`${todo.completed ? 'Mark active' : 'Complete'}: ${todo.title}`" />
            <span class="custom-check" aria-hidden="true"><svg viewBox="0 0 16 16"><path d="m3.5 8 3 3 6-6" /></svg></span>
            <span class="todo-title">{{ todo.title }}</span>
          </label>
          <button class="delete-button" type="button" :aria-label="`Delete ${todo.title}`" @click="removeTodo(todo.id)">
            <svg aria-hidden="true" viewBox="0 0 20 20"><path d="M4.5 6h11M8 6V4.5h4V6m2 0-.6 9H6.6L6 6m2.5 2v4.5m3-4.5v4.5" /></svg>
          </button>
        </li>
      </ul>

      <div v-else class="empty-state" role="status">
        <div class="empty-art" aria-hidden="true"><span>✳</span><span>·</span><span>✦</span></div>
        <h3>{{ emptyTitle }}</h3>
        <p>{{ emptyCopy }}</p>
        <button v-if="filter !== 'all' && todos.length" type="button" class="text-button" @click="filter = 'all'">See all tasks <span aria-hidden="true">→</span></button>
        <button v-else-if="!todos.length" type="button" class="text-button" @click="input?.focus()">Add your first task <span aria-hidden="true">→</span></button>
      </div>

      <footer class="card-footer">
        <span><span class="footer-dot" aria-hidden="true"></span> Take it one thing at a time.</span>
        <span>{{ todos.length }} {{ todos.length === 1 ? 'task' : 'tasks' }} total</span>
      </footer>
    </section>

    <footer class="page-footer">MADE FOR THE MOMENTS IN BETWEEN <span aria-hidden="true">✳</span></footer>
  </main>
</template>
