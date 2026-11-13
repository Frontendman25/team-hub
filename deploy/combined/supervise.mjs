import { spawn } from 'node:child_process'

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
  process.env.API_INTERNAL_URL ?? `http://127.0.0.1:${process.env.PORT_API}`
process.env.NEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL ?? ''
process.env.TRUST_PROXY = process.env.TRUST_PROXY ?? 'true'
process.env.COOKIE_SECURE = process.env.COOKIE_SECURE ?? 'true'
process.env.SOCKET_IO_REDIS_REQUIRED =
  process.env.SOCKET_IO_REDIS_REQUIRED ?? 'true'
process.env.RUN_BACKGROUND_JOBS = process.env.RUN_BACKGROUND_JOBS ?? 'true'

function spawnNamed(name, command, args, extraEnv = {}, required = true) {
  if (shuttingDown) {
    return null
  }
  log(`starting ${name}`)
  let child
  try {
    child = spawn(command, args, {
      stdio: 'inherit',
      env: { ...process.env, ...extraEnv }
    })
  } catch (error) {
    startupFailed(name, error)
    return null
  }
  const entry = { child, exited: false, done: null }
  entry.done = new Promise((resolve) => {
    child.once('close', (code) => {
      entry.exited = true
      resolve(code ?? 1)
    })
  })
  children.push(entry)
  child.once('error', (error) => {
    startupFailed(name, error)
  })
  child.once('exit', (code, signal) => {
    entry.exited = true
    if (shuttingDown || !required) {
      return
    }
    log(`${name} exited code=${code} signal=${signal}`)
    exitCode = code && code !== 0 ? code : 1
    void shutdown('SIGTERM')
  })
  return entry
}

function startupFailed(name, error) {
  // Do not log the error object/message: it can contain arguments or env data.
  const code = typeof error?.code === 'string' && /^[A-Z0-9_]+$/.test(error.code)
    ? error.code
    : 'UNKNOWN'
  log(`${name} failed to start: ${code}`)
  exitCode = 1
  void shutdown('SIGTERM')
}

async function shutdown(signal) {
  if (shuttingDown) {
    return
  }
  shuttingDown = true
  log(`forwarding ${signal}`)
  for (const { child, exited } of children) {
    if (!exited) {
      child.kill(signal)
    }
  }
  const forceKill = setTimeout(() => {
    log('shutdown grace period expired; sending SIGKILL to remaining children')
    for (const { child, exited } of children) {
      if (!exited) {
        child.kill('SIGKILL')
      }
    }
  }, 10000)
  await Promise.all(children.map(({ done }) => done))
  clearTimeout(forceKill)
  log(`all children stopped; exit=${exitCode}`)
  process.exit(exitCode || 0)
}

process.on('SIGTERM', () => void shutdown('SIGTERM'))
process.on('SIGINT', () => void shutdown('SIGINT'))

// Migrations are opt-in, but must also receive signals during startup.
if (process.env.RUN_MIGRATE_ON_BOOT === 'true') {
  log('running migrate')
  const migrate = spawnNamed(
    'migrate',
    process.execPath,
    ['/app/apps/api/dist/migrate.js'],
    {},
    false
  )
  if (migrate) {
    const code = await migrate.done
    if (!shuttingDown && code !== 0) {
      process.exit(code)
    }
  }
}

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
