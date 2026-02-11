import { Router } from 'express'
import healthRouter from './health.js'

const router = Router()

router.use('/health', healthRouter)

// TODO: mount feature routers here
// router.use('/boards', boardsRouter)

export default router
