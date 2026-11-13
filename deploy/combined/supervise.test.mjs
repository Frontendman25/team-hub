// Isolated lifecycle checks; real Linux signals still need the container smoke.
// node --experimental-vm-modules --test deploy/combined/supervise.test.mjs
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { SourceTextModule, SyntheticModule, createContext } from 'node:vm'

const source = await readFile(new URL('./supervise.mjs', import.meta.url), 'utf8')
const settle = () => new Promise((resolve) => setImmediate(resolve))

async function fixture(env = {}, { throwAt } = {}) {
  const children = []
  const timers = new Set()
  const exits = []
  const logs = []
  let attempts = 0
  const proc = Object.assign(new EventEmitter(), {
    env: { ...env },
    execPath: '/usr/bin/node',
    stderr: { write(message) { logs.push(message) } },
    exit(code) { exits.push(code) }
  })
  const context = createContext({
    process: proc,
    setTimeout(callback) { timers.add(callback); return callback },
    clearTimeout(callback) { timers.delete(callback) }
  })
  const dependency = new SyntheticModule(['spawn'], function () {
    this.setExport('spawn', (command, args, options) => {
      if (attempts++ === throwAt) {
        throw Object.assign(new Error('SECRET must not appear in diagnostics'), {
          code: 'EPERM'
        })
      }
      const child = Object.assign(new EventEmitter(), {
        command, args, options, signals: [], killed: false,
        kill(signal) { this.killed = true; this.signals.push(signal) },
        finish(code = 0, signal = null) {
          this.emit('exit', code, signal)
          this.emit('close', code, signal)
        }
      })
      children.push(child)
      return child
    })
  }, { context })
  const module = new SourceTextModule(source, { context })
  await module.link(() => dependency)
  const evaluation = module.evaluate()
  if (env.RUN_MIGRATE_ON_BOOT !== 'true') await evaluation
  await settle()
  return { children, timers, exits, logs, proc }
}

test('SIGTERM reaches all three children and waits for actual exits', async () => {
  const f = await fixture({ PORT_API: '4200' })
  assert.equal(f.children.length, 3)
  assert.equal(f.children[0].options.env.PORT, '4200')
  assert.equal(f.children[1].options.env.API_INTERNAL_URL, 'http://127.0.0.1:4200')
  for (const child of f.children) {
    assert.equal(Object.hasOwn(child.options, 'uid'), false)
    assert.equal(Object.hasOwn(child.options, 'gid'), false)
  }
  f.proc.emit('SIGTERM')
  for (const child of f.children) assert.deepEqual(child.signals, ['SIGTERM'])
  assert.deepEqual(f.exits, [])
  for (const child of f.children) child.finish(0)
  await settle()
  assert.deepEqual(f.exits, [0])
  assert.equal(f.timers.size, 0)
})

test('SIGKILL reaches survivors even when child.killed is already true', async () => {
  const f = await fixture()
  f.proc.emit('SIGTERM')
  f.children[0].finish()
  for (const timer of f.timers) timer()
  assert.deepEqual(f.children[0].signals, ['SIGTERM'])
  for (const child of f.children.slice(1)) {
    assert.deepEqual(child.signals, ['SIGTERM', 'SIGKILL'])
    child.finish(null, 'SIGKILL')
  }
  await settle()
  assert.deepEqual(f.exits, [0])
})

test('any required process exiting, even with zero, stops siblings and fails', async () => {
  for (const index of [0, 1, 2]) {
    const f = await fixture()
    f.children[index].finish(0)
    for (const [i, child] of f.children.entries()) {
      if (i === index) continue
      assert.deepEqual(child.signals, ['SIGTERM'])
      child.finish()
    }
    await settle()
    assert.deepEqual(f.exits, [1])
  }
})

test('spawn error terminates siblings instead of leaving a partial service', async () => {
  const f = await fixture()
  f.children[2].emit('error', Object.assign(new Error('SECRET'), { code: 'EPERM' }))
  f.children[2].emit('close', -2)
  for (const child of f.children.slice(0, 2)) {
    assert.deepEqual(child.signals, ['SIGTERM'])
    child.finish()
  }
  await settle()
  assert.deepEqual(f.exits, [1])
  assert.match(f.logs.join(''), /caddy failed to start: EPERM/)
  assert.doesNotMatch(f.logs.join(''), /SECRET/)
})

test('synchronous spawn EPERM stops earlier children and prevents later starts', async () => {
  for (const [index, name] of ['api', 'web', 'caddy'].entries()) {
    const f = await fixture({}, { throwAt: index })
    assert.equal(f.children.length, index)
    for (const child of f.children) {
      assert.deepEqual(child.signals, ['SIGTERM'])
      child.finish()
    }
    await settle()
    assert.deepEqual(f.exits, [1])
    assert.match(f.logs.join(''), new RegExp(`${name} failed to start: EPERM`))
    assert.doesNotMatch(f.logs.join(''), /SECRET/)
  }
})

test('synchronous migration spawn failure exits nonzero without starting services', async () => {
  const f = await fixture({ RUN_MIGRATE_ON_BOOT: 'true' }, { throwAt: 0 })
  assert.equal(f.children.length, 0)
  assert.deepEqual(f.exits, [1])
  assert.match(f.logs.join(''), /migrate failed to start: EPERM/)
  assert.doesNotMatch(f.logs.join(''), /SECRET/)
})

test('SIGTERM during opt-in migration stops it without starting the services', async () => {
  const f = await fixture({ RUN_MIGRATE_ON_BOOT: 'true' })
  assert.equal(f.children.length, 1)
  f.proc.emit('SIGTERM')
  assert.deepEqual(f.children[0].signals, ['SIGTERM'])
  f.children[0].finish(null, 'SIGTERM')
  await settle()
  assert.equal(f.children.length, 1)
  assert.deepEqual(f.exits, [0])
})
