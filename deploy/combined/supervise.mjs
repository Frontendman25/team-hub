import { spawn } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'

const children = []
let shuttingDown = false
let exitCode = 0

function log(message) {
  process.stderr.write(`[supervise] ${message}\n`)
}

if (!process.env.FRONTEND_URL && process.env.RENDER_EXTERNAL_URL) {
  process.env.FRONTEND_URL = process.env.RENDER_EXTERNAL_URL
}

process.env.PORT_API = process.env.PORT_API ?? '3200'
process.env.PORT_WEB = process.env.PORT_WEB ?? '3000'
process.env.API_INTERNAL_URL =
  process.env.API_INTERNAL_URL ?? 'http://127.0.0.1:3200'
process.env.NEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL ?? ''
process.env.TRUST_PROXY = process.env.TRUST_PROXY ?? 'true'
process.env.COOKIE_SECURE = process.env.COOKIE_SECURE ?? 'true'
process.env.SOCKET_IO_REDIS_REQUIRED =
  process.env.SOCKET_IO_REDIS_REQUIRED ?? 'true'
process.env.RUN_BACKGROUND_JOBS = process.env.RUN_BACKGROUND_JOBS ?? 'true'

if (process.env.RUN_MIGRATE_ON_BOOT === 'true') {
  log('running migrate')
  const migrate = spawn(process.execPath, ['/app/apps/api/dist/migrate.js'], {
    stdio: 'inherit',
    env: process.env
  })
  const code = await waitForExit(migrate)
  if (code !== 0) {
    process.exit(code ?? 1)
  }
}

function spawnNamed(name, command, args, extraEnv = {}) {
  const child = spawn(command, args, {
    stdio: 'inherit',
    env: { ...process.env, ...extraEnv }
  })
  child.on('exit', (code, signal) => {
    if (shuttingDown) {
      return
    }
    log(`${name} exited code=${code} signal=${signal}`)
    exitCode = code && code !== 0 ? code : 1
    void shutdown('SIGTERM')
  })
  children.push(child)
  return child
}

function waitForExit(child) {
  return new Promise((resolve) => {
    child.on('exit', (code) => resolve(code ?? 1))
  })
}

async function shutdown(signal) {
  if (shuttingDown) {
    return
  }
  shuttingDown = true
  log(`forwarding ${signal}`)
  for (const child of children) {
    if (!child.killed) {
      child.kill('SIGTERM')
    }
  }
  await delay(4000)
  for (const child of children) {
    if (!child.killed) {
      child.kill('SIGKILL')
    }
  }
  process.exit(exitCode || 0)
}

process.on('SIGTERM', () => void shutdown('SIGTERM'))
process.on('SIGINT', () => void shutdown('SIGINT'))

spawnNamed('api', process.execPath, ['/app/apps/api/dist/main.js'], {
  PORT: process.env.PORT_API
})
spawnNamed('web', process.execPath, ['/app/web/apps/web/server.js'], {
  PORT: process.env.PORT_WEB,
  HOSTNAME: '127.0.0.1'
})
spawnNamed('caddy', '/usr/bin/caddy', [
  'run',
  '--config',
  '/app/Caddyfile',
  '--adapter',
  'caddyfile'
])
