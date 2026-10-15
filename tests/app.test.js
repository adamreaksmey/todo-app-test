import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createTaskWorkflow, focusTaskInputOnShortcut } from '../src/task-workflow.js'

function fakeApi() {
  const db = { projects: [{ id: 'p1', name: 'Home' }], tasks: [] }
  const request = async (path, options = {}) => {
    const method = options.method || 'GET'
    if (path === '/api/projects' && method === 'GET') return response(db.projects)
    if (path === '/api/tasks' && method === 'GET') return response(db.tasks)
    if (path === '/api/projects' && method === 'POST') {
      const project = { id: `p${db.projects.length + 1}`, ...JSON.parse(options.body) }; db.projects.unshift(project); return response(project, 201)
    }
    if (path === '/api/tasks' && method === 'POST') {
      const task = { id: `t${db.tasks.length + 1}`, completed: false, ...JSON.parse(options.body) }; db.tasks.unshift(task); return response(task, 201)
    }
    const taskId = path.match(/^\/api\/tasks\/(.+)$/)?.[1]
    const task = db.tasks.find((item) => item.id === taskId)
    if (task && method === 'PATCH') { Object.assign(task, JSON.parse(options.body)); return response(task) }
    if (task && method === 'DELETE') { db.tasks = db.tasks.filter((item) => item !== task); return response(null, 204) }
    return response({ error: 'Not found' }, 404)
  }
  return { request, db }
}

function response(payload, status = 200) {
  return { ok: status < 400, status, json: async () => payload }
}

test('loads, creates, completes, reopens, and deletes tasks', async () => {
  const api = fakeApi(); const app = createTaskWorkflow(api.request)
  assert.equal(app.loading, true)
  await app.load()
  assert.equal(app.loading, false)
  app.draft = ' Plan a walk '
  assert.equal(await app.addTask('p1'), true)
  const task = app.tasks[0]
  assert.equal(task.title, 'Plan a walk')
  assert.equal(task.projectId, 'p1')
  assert.equal(await app.toggleTask(task), true)
  assert.equal(task.completed, true)
  assert.equal(await app.toggleTask(task), true)
  assert.equal(task.completed, false)
  assert.equal(await app.deleteTask(task), true)
  assert.equal(app.tasks.length, 0)
})

test('filters by project and active or completed status', async () => {
  const api = fakeApi(); const app = createTaskWorkflow(api.request); await app.load()
  app.tasks = [
    { id: 'a', title: 'Active home', projectId: 'p1', completed: false },
    { id: 'b', title: 'Done home', projectId: 'p1', completed: true },
    { id: 'c', title: 'Active other', projectId: 'p2', completed: false },
  ]
  app.filter = 'active'; assert.deepEqual(app.visibleTasks.map((item) => item.id), ['a', 'c'])
  app.filter = 'completed'; assert.deepEqual(app.visibleTasks.map((item) => item.id), ['b'])
  app.selectedProject = 'p2'; app.filter = 'all'; assert.deepEqual(app.visibleTasks.map((item) => item.id), ['c'])
})

test('creates a project and surfaces recoverable API errors without losing draft', async () => {
  const api = fakeApi(); const app = createTaskWorkflow(api.request); await app.load()
  app.projectDraft = ' Errands '; assert.equal(await app.addProject(), true)
  assert.equal(app.selectedProject, 'p2')
  app.draft = 'Will retry'
  const broken = createTaskWorkflow(async () => response({ error: 'Store unavailable' }, 500))
  broken.draft = app.draft
  await broken.load()
  assert.equal(broken.loading, false)
  assert.equal(broken.error, 'Store unavailable')
  assert.equal(await broken.addTask(), false)
  assert.equal(broken.draft, 'Will retry')
  assert.equal(broken.error, 'Store unavailable')
})

test('Ctrl/Cmd+K focuses the task field and ignores other shortcuts', () => {
  let focused = 0; let prevented = 0
  const input = { focus: () => focused++ }
  assert.equal(focusTaskInputOnShortcut({ key: 'k', ctrlKey: true, preventDefault: () => prevented++ }, input), true)
  assert.equal(focusTaskInputOnShortcut({ key: 'x', metaKey: true, preventDefault: () => prevented++ }, input), false)
  assert.equal(focused, 1); assert.equal(prevented, 1)
})
