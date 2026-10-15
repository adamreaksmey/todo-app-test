import { createServer as createHttpServer } from 'node:http'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createStore, ValidationError } from './store.js'

const maxBodyBytes = 16 * 1024

async function readJson(request) {
  let body = ''
  for await (const chunk of request) {
    body += chunk
    if (Buffer.byteLength(body) > maxBodyBytes) {
      const error = new Error('Request body is too large')
      error.statusCode = 413
      throw error
    }
  }
  try {
    const parsed = JSON.parse(body || '{}')
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error()
    return parsed
  } catch {
    const error = new Error('Request body must be a JSON object')
    error.statusCode = 400
    throw error
  }
}

function send(response, status, payload) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
  response.end(payload === undefined ? '' : JSON.stringify(payload))
}

export function createServer({ store = createStore() } = {}) {
  return createHttpServer(async (request, response) => {
    const url = new URL(request.url, 'http://localhost')
    const parts = url.pathname.split('/').filter(Boolean)
    if (parts[0] !== 'api' || !['tasks', 'projects'].includes(parts[1])) {
      send(response, 404, { error: 'Not found' })
      return
    }

    try {
      const collection = parts[1]
      const id = parts[2] ? decodeURIComponent(parts[2]) : null
      const method = request.method
      if (!id && method === 'GET' && collection === 'tasks') {
        const projectId = url.searchParams.has('projectId') ? url.searchParams.get('projectId') : undefined
        send(response, 200, await store.listTasks({ projectId }))
      } else if (!id && method === 'GET' && collection === 'projects') {
        send(response, 200, await store.listProjects())
      } else if (!id && method === 'POST') {
        const body = await readJson(request)
        const item = collection === 'tasks' ? await store.createTask(body) : await store.createProject(body)
        send(response, 201, item)
      } else if (id && method === 'PATCH') {
        const body = await readJson(request)
        const item = collection === 'tasks' ? await store.updateTask(id, body) : await store.updateProject(id, body)
        if (!item) send(response, 404, { error: 'Not found' })
        else send(response, 200, item)
      } else if (id && method === 'DELETE') {
        const removed = collection === 'tasks' ? await store.deleteTask(id) : await store.deleteProject(id)
        send(response, removed ? 204 : 404, removed ? undefined : { error: 'Not found' })
      } else {
        send(response, 404, { error: 'Not found' })
      }
    } catch (error) {
      send(response, error instanceof ValidationError ? 400 : (error.statusCode || 500), { error: error.message || 'Internal server error' })
    }
  })
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const port = Number(process.env.PORT || 3000)
  createServer().listen(port, () => console.log(`Task API listening on http://localhost:${port}`))
}
