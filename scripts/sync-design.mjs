#!/usr/bin/env node
// Mirror a fresh Claude Design export into design/.
//
//   node scripts/sync-design.mjs <export.zip | unzipped-dir> [--dry-run] [--force]
//
// Copies added/changed files, deletes files the export no longer contains, and
// leaves untouched files alone so `git status` shows only the real change.
// Nothing outside design/ is ever written.

import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const IGNORED = new Set(['__MACOSX', '.DS_Store', 'Thumbs.db', '.git'])
const repoRoot = path.resolve(import.meta.dirname, '..')
const dest = path.join(repoRoot, 'design')

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const force = args.includes('--force')
const source = args.find((a) => !a.startsWith('--'))

if (!source) die('usage: node scripts/sync-design.mjs <export.zip | dir> [--dry-run] [--force]')
if (!fs.existsSync(source)) die(`no such file or directory: ${source}`)

function die(message) {
  console.error(`sync-design: ${message}`)
  process.exit(1)
}

/** Extract a zip to a temp dir using whichever unzipper the machine has. */
function unzip(zipPath) {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'design-export-'))
  const attempts = [
    ['unzip', ['-q', '-o', path.resolve(zipPath), '-d', out]],
    ['python3', ['-c', 'import sys,zipfile;zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])',
      path.resolve(zipPath), out]],
  ]
  for (const [cmd, argv] of attempts) {
    const run = spawnSync(cmd, argv, { stdio: 'ignore' })
    if (!run.error && run.status === 0) return out
  }
  die(`could not extract ${zipPath} — need \`unzip\` or \`python3\` on PATH`)
}

/**
 * Exports arrive wrapped differently every time (design/…, SomeFolder/design/…,
 * or the files at top level). Walk down single-child folders, then prefer a
 * nested `design/` if one is there.
 */
function findDesignRoot(dir) {
  let here = dir
  for (;;) {
    const entries = fs.readdirSync(here, { withFileTypes: true })
      .filter((e) => !IGNORED.has(e.name))
    if (entries.length === 1 && entries[0].isDirectory() && entries[0].name !== 'design') {
      here = path.join(here, entries[0].name)
      continue
    }
    const nested = entries.find((e) => e.isDirectory() && e.name === 'design')
    return nested ? path.join(here, 'design') : here
  }
}

/** relative path -> sha256 of contents, for every file under dir. */
function index(dir) {
  const files = new Map()
  const walk = (abs, rel) => {
    for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
      if (IGNORED.has(entry.name)) continue
      const childAbs = path.join(abs, entry.name)
      const childRel = rel ? `${rel}/${entry.name}` : entry.name
      if (entry.isDirectory()) walk(childAbs, childRel)
      else if (entry.isFile()) {
        files.set(childRel, createHash('sha256').update(fs.readFileSync(childAbs)).digest('hex'))
      }
    }
  }
  if (fs.existsSync(dir)) walk(dir, '')
  return files
}

/** Remove directories left empty after deletions, stopping at design/. */
function pruneEmptyDirs(dir) {
  if (!fs.existsSync(dir) || path.resolve(dir) === dest) return
  if (fs.readdirSync(dir).length === 0) {
    fs.rmdirSync(dir)
    pruneEmptyDirs(path.dirname(dir))
  }
}

const stat = fs.statSync(source)
const extracted = stat.isDirectory() ? null : unzip(source)
const src = findDesignRoot(extracted ?? path.resolve(source))

const incoming = index(src)
const current = index(dest)

if (incoming.size === 0) die(`found no files under ${src} — is that the right export?`)

const added = [...incoming.keys()].filter((f) => !current.has(f)).sort()
const changed = [...incoming.keys()].filter((f) => current.has(f) && current.get(f) !== incoming.get(f)).sort()
const removed = [...current.keys()].filter((f) => !incoming.has(f)).sort()
const unchanged = incoming.size - added.length - changed.length

// A truncated or wrong-folder export would otherwise wipe the design handoff.
if (!force && !dryRun && removed.length > 5 && removed.length > current.size / 2) {
  if (extracted) fs.rmSync(extracted, { recursive: true, force: true })
  die(`refusing to delete ${removed.length} of ${current.size} existing files.\n` +
      `  Check that ${source} is the whole export, then re-run with --force.`)
}

for (const rel of [...added, ...changed]) {
  const to = path.join(dest, rel)
  // Zip-slip guard: never write outside design/.
  if (path.relative(dest, to).startsWith('..')) die(`export contains an unsafe path: ${rel}`)
  if (dryRun) continue
  fs.mkdirSync(path.dirname(to), { recursive: true })
  fs.copyFileSync(path.join(src, rel), to)
}

for (const rel of removed) {
  if (dryRun) continue
  fs.rmSync(path.join(dest, rel))
  pruneEmptyDirs(path.dirname(path.join(dest, rel)))
}

if (extracted) fs.rmSync(extracted, { recursive: true, force: true })

const report = (label, list) => {
  if (!list.length) return
  console.log(`\n${label} (${list.length})`)
  for (const f of list) console.log(`  ${f}`)
}
console.log(dryRun ? 'Dry run — nothing written.' : 'design/ synced.')
report('added', added)
report('changed', changed)
report('deleted', removed)
console.log(`\n${unchanged} file(s) unchanged.`)
if (!added.length && !changed.length && !removed.length) console.log('Export matches design/ exactly.')
