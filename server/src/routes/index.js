import { Router } from 'express'
import healthRouter from './health.js'
import authRouter from './auth.js'
import boardsRouter from './boards.js'
import listsRouter from './lists.js'
import cardsRouter from './cards.js'
import tagsRouter from './tags.js'
import usersRouter from './users.js'

const router = Router()

router.use('/health', healthRouter)
router.use('/auth', authRouter)
router.use('/boards', boardsRouter)
router.use('/lists', listsRouter)
router.use('/cards', cardsRouter)
router.use('/tags', tagsRouter)
router.use('/users', usersRouter)

export default router
