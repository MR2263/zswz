import { createApp } from '../backend/src/app.js'
import { initializeDatabase } from '../backend/src/db.js'

const app = createApp()
const ready = initializeDatabase()

export default async function handler(request, response) {
  await ready
  return app(request, response)
}

