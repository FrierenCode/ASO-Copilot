// Hono app type combining Worker bindings with typed context variables
export type AppVariables = {
  uid: string
  requestId: string
  sessionUid: string | undefined
  isAuthenticated: boolean
}

export type AppEnv = {
  Bindings: Env
  Variables: AppVariables
}
