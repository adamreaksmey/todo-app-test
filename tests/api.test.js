import { afterEach, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from '../server/index.js'
import { createStore } from '../server/store.js'

let directory
let server
let baseUrl

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'little-list-api-'))
  server = createServer({ store: createStore(join(directory, 'store.json')) })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

afterEach(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  await rm(directory, { recursive: true, force: true })
})

async function request(path, method = 'GET', body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: body === undefined ? {} : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  return { response, data: response.status === 204 ? null : await response.json() }
}

test('supports durable project and task operations', async () => {
  const projectResult = await request('/api/projects', 'POST', { name: 'Home' })
  assert.equal(projectResult.response.status, 201)
  const project = projectResult.data

  const taskResult = await request('/api/tasks', 'POST', { title: ' Tidy desk ', projectId: project.id })
  assert.equal(taskResult.response.status, 201)
  const task = taskResult.data
  assert.equal(task.title, 'Tidy desk')
  assert.equal(task.completed, false)
  assert.equal((await request(`/api/tasks?projectId=${project.id}`)).data.length, 1)

  const updated = await request(`/api/tasks/${task.id}`, 'PATCH', { completed: true })
  assert.equal(updated.data.completed, true)
  const renamed = await request(`/api/projects/${project.id}`, 'PATCH', { name: 'House' })
  assert.equal(renamed.data.name, 'House')

  const restarted = createServer({ store: createStore(join(directory, 'store.json')) })
  await new Promise((resolve) => restarted.listen(0, '127.0.0.1', resolve))
  const restartedUrl = `http://127.0.0.1:${restarted.address().port}`
  const restored = await fetch(`${restartedUrl}/api/tasks`).then((response) => response.json())
  assert.equal(restored[0].completed, true)
  assert.equal((await fetch(`${restartedUrl}/api/projects`).then((response) => response.json()))[0].name, 'House')
  await new Promise((resolve, reject) => restarted.close((error) => error ? reject(error) : resolve()))

  assert.equal((await request(`/api/projects/${project.id}`, 'DELETE')).response.status, 204)
  assert.equal((await request(`/api/tasks/${task.id}`)).response.status, 404)
  assert.equal((await request('/api/tasks')).data[0].projectId, null)
  assert.equal((await request(`/api/tasks/${task.id}`, 'DELETE')).response.status, 204)
  assert.deepEqual((await request('/api/tasks')).data, [])
})

test('rejects invalid writes without changing persisted data', async () => {
  const created = await request('/api/tasks', 'POST', { title: 'Keep this' })
  const filename = join(directory, 'store.json')
  const before = await readFile(filename, 'utf8')

  assert.equal((await request('/api/tasks', 'POST', { title: '   ' })).response.status, 400)
  assert.equal((await request('/api/tasks', 'POST', { title: 'Orphan', projectId: 'missing' })).response.status, 400)
  assert.equal((await request(`/api/tasks/${created.data.id}`, 'PATCH', { completed: 'yes' })).response.status, 400)
  assert.equal((await request('/api/projects', 'POST', { name: '   ' })).response.status, 400)
  assert.equal((await request('/api/projects', 'POST', { name: 'Keep this' })).response.status, 201)
  const duplicateBefore = await readFile(filename, 'utf8')
  assert.equal((await request('/api/projects', 'POST', { name: 'keep THIS' })).response.status, 400)

  assert.equal(await readFile(filename, 'utf8'), duplicateBefore)
  assert.notEqual(before, duplicateBefore)
  assert.equal((await request('/api/tasks')).data[0].title, 'Keep this')
})

test('rejects malformed request bodies', async () => {
  const response = await fetch(`${baseUrl}/api/tasks`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{',
  })
  assert.equal(response.status, 400)
  assert.deepEqual(await response.json(), { error: 'Request body must be a JSON object' })
})
