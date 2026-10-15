<script setup>
import { onMounted, onUnmounted, reactive, ref } from 'vue'
import { createTaskWorkflow, focusTaskInputOnShortcut } from './task-workflow.js'

const workflow = reactive(createTaskWorkflow())
const input = ref(null)
const filters = [{ id: 'all', label: 'All' }, { id: 'active', label: 'Active' }, { id: 'completed', label: 'Completed' }]
function addTask() { workflow.addTask(workflow.selectedProject === 'all' ? null : workflow.selectedProject).then((ok) => { if (ok) input.value?.focus() }) }
function shortcut(event) { focusTaskInputOnShortcut(event, input.value) }
onMounted(() => { workflow.load(); window.addEventListener('keydown', shortcut) })
onUnmounted(() => window.removeEventListener('keydown', shortcut))
</script>

<template>
  <main class="page-shell">
    <header class="topbar">
      <a class="wordmark" href="#top" aria-label="Little List home"><span class="brand-mark" aria-hidden="true"><span></span><span></span><span></span></span>little list</a>
      <span class="top-note"><span class="sun" aria-hidden="true">✳</span> A little progress is still progress.</span>
    </header>
    <section id="top" class="todo-card" aria-labelledby="page-title">
      <div class="intro"><p class="eyebrow">YOUR SPACE, YOUR PACE</p><h1 id="page-title">Make room for<br /><span>what matters.</span></h1><p class="intro-copy">A clear mind starts with a little list.</p></div>

      <div class="project-tools">
        <label for="project-filter">Project</label>
        <select id="project-filter" v-model="workflow.selectedProject" aria-label="Filter by project">
          <option value="all">All projects</option><option v-for="project in workflow.projects" :key="project.id" :value="project.id">{{ project.name }}</option>
        </select>
        <form class="project-form" @submit.prevent="workflow.addProject()">
          <label class="sr-only" for="new-project">New project name</label><input id="new-project" v-model="workflow.projectDraft" maxlength="80" placeholder="New project" />
          <button type="submit" :disabled="!workflow.projectDraft.trim()">＋ Project</button>
        </form>
      </div>

      <form class="add-form" @submit.prevent="addTask">
        <label class="sr-only" for="new-task">Add a task</label><span class="add-symbol" aria-hidden="true">＋</span>
        <input id="new-task" ref="input" v-model="workflow.draft" type="text" maxlength="180" placeholder="What would you like to do?" autocomplete="off" />
        <button class="add-button" type="submit" :disabled="workflow.saving || !workflow.draft.trim()">{{ workflow.saving ? 'Adding…' : 'Add task' }} <span aria-hidden="true">↗</span></button>
      </form>

      <p v-if="workflow.error" class="request-error" role="alert">{{ workflow.error }} <button type="button" @click="workflow.load()">Reload</button></p>
      <div class="list-heading"><div><h2>Your tasks</h2><p class="count" aria-live="polite">{{ workflow.remaining }} {{ workflow.remaining === 1 ? 'thing' : 'things' }} left to do</p></div>
        <div class="filters" role="group" aria-label="Filter tasks"><button v-for="item in filters" :key="item.id" type="button" :class="{ selected: workflow.filter === item.id }" :aria-pressed="workflow.filter === item.id" @click="workflow.filter = item.id">{{ item.label }}</button></div>
      </div>

      <div v-if="workflow.loading" class="empty-state" role="status">Loading your list…</div>
      <ul v-else-if="workflow.visibleTasks.length" class="todo-list" aria-label="Tasks">
        <li v-for="task in workflow.visibleTasks" :key="task.id" class="todo-row" :class="{ done: task.completed }">
          <label class="todo-label"><input type="checkbox" :checked="task.completed" :aria-label="`${task.completed ? 'Reopen' : 'Complete'}: ${task.title}`" @change="workflow.toggleTask(task)" /><span class="custom-check" aria-hidden="true"><svg viewBox="0 0 16 16"><path d="m3.5 8 3 3 6-6" /></svg></span><span class="todo-title">{{ task.title }}</span><span v-if="task.projectId" class="task-project">{{ workflow.projects.find((project) => project.id === task.projectId)?.name }}</span></label>
          <button class="delete-button" type="button" :aria-label="`Delete ${task.title}`" @click="workflow.deleteTask(task)"><svg aria-hidden="true" viewBox="0 0 20 20"><path d="M4.5 6h11M8 6V4.5h4V6m2 0-.6 9H6.6L6 6m2.5 2v4.5m3-4.5v4.5" /></svg></button>
        </li>
      </ul>
      <div v-else class="empty-state" role="status"><div class="empty-art" aria-hidden="true"><span>✳</span><span>·</span><span>✦</span></div><h3>{{ workflow.filter === 'active' ? 'You’re all caught up' : workflow.filter === 'completed' ? 'Nothing completed yet' : 'Your list is a blank page' }}</h3><p>{{ workflow.filter === 'active' ? 'Enjoy the breathing room, or add another task.' : workflow.filter === 'completed' ? 'Finished tasks will find their way here.' : 'Add one small thing you’d like to make happen today.' }}</p></div>
      <footer class="card-footer"><span><span class="footer-dot" aria-hidden="true"></span> Take it one thing at a time.</span><span>{{ workflow.tasks.length }} {{ workflow.tasks.length === 1 ? 'task' : 'tasks' }} total</span></footer>
    </section>
    <footer class="page-footer">MADE FOR THE MOMENTS IN BETWEEN <span aria-hidden="true">✳</span></footer>
  </main>
</template>
