// Hono app type combining Worker bindings with typed context variables
export type AppVariables = {
  uid: string
  requestId: string
}

export type AppEnv = {
  Bindings: Env
  Variables: AppVariables
}
