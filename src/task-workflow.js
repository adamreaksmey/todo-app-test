const json = async (response) => {
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    throw new Error(payload.error || 'Could not save your changes. Please try again.')
  }
  return response.status === 204 ? null : response.json()
}

export function createTaskWorkflow(request = fetch) {
  return {
    tasks: [], projects: [], selectedProject: 'all', filter: 'all', loading: true,
    saving: false, error: '', draft: '', projectDraft: '',
    get remaining() { return this.tasks.filter((task) => !task.completed).length },
    get visibleTasks() {
      return this.tasks.filter((task) =>
        (this.selectedProject === 'all' || task.projectId === this.selectedProject) &&
        (this.filter === 'all' || (this.filter === 'active' ? !task.completed : task.completed)))
    },
    async load() {
      this.loading = true; this.error = ''
      try {
        const [projects, tasks] = await Promise.all([
          request('/api/projects').then(json), request('/api/tasks').then(json),
        ])
        this.projects = projects; this.tasks = tasks
      } catch (error) { this.error = error.message }
      finally { this.loading = false }
    },
    async addTask(projectId = null) {
      const title = this.draft.trim()
      if (!title) return false
      this.saving = true; this.error = ''
      try {
        const task = await request('/api/tasks', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title, projectId }) }).then(json)
        this.tasks.unshift(task); this.draft = ''; return true
      } catch (error) { this.error = error.message; return false }
      finally { this.saving = false }
    },
    async toggleTask(task) {
      this.error = ''
      try {
        const updated = await request(`/api/tasks/${encodeURIComponent(task.id)}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ completed: !task.completed }) }).then(json)
        Object.assign(task, updated); return true
      } catch (error) { this.error = error.message; return false }
    },
    async deleteTask(task) {
      this.error = ''
      try { await request(`/api/tasks/${encodeURIComponent(task.id)}`, { method: 'DELETE' }).then(json); this.tasks = this.tasks.filter((item) => item.id !== task.id); return true }
      catch (error) { this.error = error.message; return false }
    },
    async addProject() {
      const name = this.projectDraft.trim()
      if (!name) return false
      this.error = ''
      try {
        const project = await request('/api/projects', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name }) }).then(json)
        this.projects.unshift(project); this.projectDraft = ''; this.selectedProject = project.id; return true
      } catch (error) { this.error = error.message; return false }
    },
  }
}

export function focusTaskInputOnShortcut(event, input) {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    input?.focus()
    return true
  }
  return false
}
