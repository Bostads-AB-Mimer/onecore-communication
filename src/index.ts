import app from './app'
import config from './common/config'
import { logger } from 'onecore-utilities'

const PORT = config.port || 5040
app.listen(PORT, () => {
  logger.info(`listening on http://localhost:${PORT}`)
})
