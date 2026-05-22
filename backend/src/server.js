import { PORT } from './config.js'
import { createApp } from './app.js'
import { initializeDatabase } from './db.js'

initializeDatabase()
  .then(() => {
    const app = createApp()
    app.listen(PORT, () => {
      console.log(`Backend running at http://localhost:${PORT}`)
    })
  })
  .catch((error) => {
    console.error('Failed to initialize database', error)
    process.exit(1)
  })
