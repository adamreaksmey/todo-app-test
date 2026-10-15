# Little List

Little List is a small Vue 3 task list backed by a Node.js HTTP API and a local JSON file. It is intended for one local user and does not include accounts or multi-user isolation.

## Prerequisites

- Node.js 20 or newer
- pnpm

Install dependencies from the repository root:

```sh
pnpm install
```

## Run the app

Start the API in one terminal:

```sh
pnpm start
```

The API listens on port `3000` by default. Set `PORT` to use a different port.

Start the Vue development server in another terminal:

```sh
pnpm dev
```

Vite proxies `/api` requests to `http://localhost:3000`. The app is available at the URL printed by Vite. Keep the API and Vite terminals running while using the development app.

## Data and storage

The API stores data in `data/store.json`, relative to the directory where `pnpm start` is run. Set `TASK_STORE_PATH` to use a different file. The store is a single local JSON file; it is not encrypted, synchronized, or intended to be shared by multiple users or concurrent server processes.

On first use, the store initializes empty `projects` and `tasks` arrays. Create a project in the app before assigning tasks to it. To reset all data, stop the API and remove the configured store file (by default, `data/store.json`). The API will initialize a fresh empty store on its next start/request.

## Features and API behavior

The interface supports creating projects and tasks, completing and reopening tasks, deleting tasks, selecting a project, and filtering tasks by all, active, or completed status. `Ctrl+K` or `Cmd+K` focuses the add-task field.

The API is available under `/api`:

- `GET /api/projects` and `POST /api/projects`
- `PATCH /api/projects/:id` and `DELETE /api/projects/:id`
- `GET /api/tasks` and `GET /api/tasks?projectId=:id`
- `POST /api/tasks`, `PATCH /api/tasks/:id`, and `DELETE /api/tasks/:id`

Task creation currently stores an ID, project ID (or `null`), title, completion state, and creation/update timestamps. Project records store an ID, name, and creation/update timestamps. The server trims and requires task titles (up to 180 characters) and project names (up to 80 characters), validates project references and completion values, and returns a client error for invalid writes. Project deletion removes the project and unassigns its tasks. API errors are returned as JSON with an `error` message.

## Verify and build

Run the focused API and workflow tests:

```sh
pnpm test
```

Create a production frontend bundle:

```sh
pnpm build
```

To preview the built frontend, run `pnpm preview` after building. The API still needs to be started separately with `pnpm start`.
