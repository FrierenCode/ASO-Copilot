import { Hono } from 'hono'
import type { AppEnv } from '../env'
import { getEntitlements } from '../services/entitlement.service'

const entitlementsRouter = new Hono<AppEnv>()

entitlementsRouter.get('/v1/entitlements', async (c) => {
  const uid = c.get('uid')
  const data = await getEntitlements(c.env.DB, uid)
  return c.json(data, 200, { 'Cache-Control': 'no-store' })
})

export default entitlementsRouter
