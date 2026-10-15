import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const titleLimit = 180
const nameLimit = 80

export class ValidationError extends Error {
  constructor(message) {
    super(message)
    this.name = 'ValidationError'
  }
}

function cleanText(value, label, limit) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > limit) {
    throw new ValidationError(`${label} must be a non-empty string of at most ${limit} characters`)
  }
  return value.trim()
}

export function createStore(filePath = process.env.TASK_STORE_PATH || 'data/store.json') {
  const path = resolve(filePath)
  let state
  let writes = Promise.resolve()

  async function load() {
    if (state) return
    try {
      const parsed = JSON.parse(await readFile(path, 'utf8'))
      if (!parsed || !Array.isArray(parsed.tasks) || !Array.isArray(parsed.projects)) throw new Error('Invalid store')
      state = parsed
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
      state = { tasks: [], projects: [] }
    }
  }

  async function persist() {
    await mkdir(dirname(path), { recursive: true })
    const temporaryPath = `${path}.${process.pid}.${randomUUID()}.tmp`
    await writeFile(temporaryPath, `${JSON.stringify(state, null, 2)}\n`, 'utf8')
    await rename(temporaryPath, path)
  }

  async function change(callback) {
    await load()
    const result = callback()
    writes = writes.then(persist)
    await writes
    return result
  }

  return {
    async listTasks({ projectId } = {}) {
      await load()
      return state.tasks.filter((task) => projectId === undefined || task.projectId === projectId)
    },
    async createTask(input) {
      return change(() => {
        const title = cleanText(input?.title, 'title', titleLimit)
        const projectId = input.projectId ?? null
        if (projectId !== null && (typeof projectId !== 'string' || !state.projects.some((project) => project.id === projectId))) {
          throw new ValidationError('projectId must reference an existing project or be null')
        }
        const now = new Date().toISOString()
        const task = { id: randomUUID(), title, completed: false, projectId, createdAt: now, updatedAt: now }
        state.tasks.unshift(task)
        return task
      })
    },
    async updateTask(id, input) {
      return change(() => {
        const task = state.tasks.find((item) => item.id === id)
        if (!task) return null
        if (!input || typeof input !== 'object' || Array.isArray(input) || !Object.keys(input).length) throw new ValidationError('A non-empty task update is required')
        const allowed = new Set(['title', 'completed', 'projectId'])
        if (Object.keys(input).some((key) => !allowed.has(key))) throw new ValidationError('Task update contains unsupported fields')
        const next = { ...task }
        if ('title' in input) next.title = cleanText(input.title, 'title', titleLimit)
        if ('completed' in input) {
          if (typeof input.completed !== 'boolean') throw new ValidationError('completed must be a boolean')
          next.completed = input.completed
        }
        if ('projectId' in input) {
          if (input.projectId !== null && (typeof input.projectId !== 'string' || !state.projects.some((project) => project.id === input.projectId))) {
            throw new ValidationError('projectId must reference an existing project or be null')
          }
          next.projectId = input.projectId
        }
        next.updatedAt = new Date().toISOString()
        Object.assign(task, next)
        return task
      })
    },
    async deleteTask(id) {
      return change(() => {
        const index = state.tasks.findIndex((task) => task.id === id)
        if (index < 0) return false
        state.tasks.splice(index, 1)
        return true
      })
    },
    async listProjects() {
      await load()
      return state.projects
    },
    async createProject(input) {
      return change(() => {
        const name = cleanText(input?.name, 'name', nameLimit)
        if (state.projects.some((project) => project.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
          throw new ValidationError('A project with this name already exists')
        }
        const now = new Date().toISOString()
        const project = { id: randomUUID(), name, createdAt: now, updatedAt: now }
        state.projects.unshift(project)
        return project
      })
    },
    async updateProject(id, input) {
      return change(() => {
        const project = state.projects.find((item) => item.id === id)
        if (!project) return null
        if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length !== 1 || !('name' in input)) {
          throw new ValidationError('Project update must contain only name')
        }
        const name = cleanText(input.name, 'name', nameLimit)
        if (state.projects.some((item) => item.id !== id && item.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
          throw new ValidationError('A project with this name already exists')
        }
        project.name = name
        project.updatedAt = new Date().toISOString()
        return project
      })
    },
    async deleteProject(id) {
      return change(() => {
        const index = state.projects.findIndex((project) => project.id === id)
        if (index < 0) return false
        state.projects.splice(index, 1)
        const now = new Date().toISOString()
        for (const task of state.tasks) {
          if (task.projectId === id) {
            task.projectId = null
            task.updatedAt = now
          }
        }
        return true
      })
    },
  }
}
