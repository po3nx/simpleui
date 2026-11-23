#!/usr/bin/env node
/**
 * SimpleUI progress tracker.
 *
 * Reads every task table under docs/ and produces a weighted progress
 * dashboard. No dependencies, Node 20+.
 *
 * Usage:
 *   node docs/10-tracking/tools/progress.mjs           # print dashboard
 *   node docs/10-tracking/tools/progress.mjs --check   # validate only
 *   node docs/10-tracking/tools/progress.mjs --write   # update progress.md
 */

import { readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DOCS_DIR = path.resolve(HERE, '..', '..');
const ROOT_DIR = path.resolve(DOCS_DIR, '..');
const PROGRESS_FILE = path.join(DOCS_DIR, '10-tracking', 'progress.md');

const STATUSES = new Set(['TODO', 'WIP', 'DONE', 'BLOCKED', 'CUT']);
const TASK_ID = /^[A-Z]{2,5}-\d{3,4}$/;
const COMPONENTS = {
  FND: 'Foundation',
  DG: 'DataGrid',
  PV: 'PivotGrid',
  CH: 'Charts',
};

const args = new Set(process.argv.slice(2));
const shouldWrite = args.has('--write');
const checkOnly = args.has('--check');

function normalize(value) {
  return String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .trim();
}

function stripMarkdown(value) {
  return normalize(value).replace(/^`|`$/g, '');
}

function parseDeps(value) {
  const raw = stripMarkdown(value);
  if (!raw || raw === '—' || raw === '-' || raw === '–') return [];
  return raw
    .split(',')
    .map((part) => stripMarkdown(part))
    .filter(Boolean);
}

function componentOf(id) {
  const prefix = id.split('-')[0];
  return COMPONENTS[prefix] ?? prefix;
}

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(full)));
    } else if (/tasks?\.md$/i.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

function parseTables(text, file) {
  const tasks = [];
  const errors = [];
  let header = null;
  let lineNumber = 0;

  for (const line of text.split(/\r?\n/)) {
    lineNumber += 1;
    if (!line.trim().startsWith('|')) {
      header = null;
      continue;
    }
    if (/^\|[\s:|-]+\|$/.test(line.trim())) continue;

    const cells = line
      .split('|')
      .slice(1, -1)
      .map((cell) => normalize(cell));

    if (cells[0]?.toUpperCase() === 'ID') {
      header = cells.map((cell) => cell.toLowerCase());
      continue;
    }
    if (!header) continue;

    const index = (name) => header.indexOf(name);
    const idIndex = index('id');
    if (idIndex === -1) continue;

    const id = stripMarkdown(cells[idIndex]);
    if (!TASK_ID.test(id)) continue;

    const get = (name) => {
      const i = index(name);
      return i === -1 ? '' : (cells[i] ?? '');
    };

    const estimateRaw = get('est (d)') || get('est') || get('estimasi (d)');
    const estimate = Number(String(estimateRaw).replace(',', '.'));
    const status = get('status').toUpperCase() || 'TODO';
    const task = {
      id,
      phase: get('fase') || '—',
      task: get('task') || '(tanpa judul)',
      area: get('area') || '—',
      priority: get('pri') || '—',
      estimate,
      depends: parseDeps(get('depends')),
      status,
      owner: get('owner') || '—',
      pr: get('pr') || '—',
      component: componentOf(id),
      file: path.relative(ROOT_DIR, file).replaceAll('\\', '/'),
      line: lineNumber,
    };

    if (!Number.isFinite(estimate) || estimate <= 0) {
      errors.push(`${id}: estimasi tidak valid "${estimateRaw}" (${task.file}:${lineNumber})`);
    }
    if (!STATUSES.has(status)) {
      errors.push(`${id}: status tidak valid "${status}" (${task.file}:${lineNumber})`);
    }
    if (!task.phase || task.phase === '—') {
      errors.push(`${id}: fase kosong (${task.file}:${lineNumber})`);
    }

    tasks.push(task);
  }

  return { tasks, errors };
}

function validate(tasks, parseErrors) {
  const errors = [...parseErrors];
  const byId = new Map();

  for (const task of tasks) {
    if (byId.has(task.id)) {
      errors.push(
        `${task.id}: ID duplikat di ${byId.get(task.id).file}:${byId.get(task.id).line} dan ${task.file}:${task.line}`,
      );
    } else {
      byId.set(task.id, task);
    }
  }

  for (const task of tasks) {
    for (const dep of task.depends) {
      if (dep === task.id) {
        errors.push(`${task.id}: dependency pada diri sendiri`);
        continue;
      }
      if (!byId.has(dep)) {
        errors.push(`${task.id}: dependency tidak dikenal "${dep}"`);
      }
    }
  }

  // Cycle detection (DFS, three colors).
  const color = new Map();
  const stack = [];
  const visit = (id) => {
    const state = color.get(id) ?? 0;
    if (state === 1) {
      const start = stack.indexOf(id);
      const cycle = [...stack.slice(start), id].join(' → ');
      errors.push(`Siklus dependency: ${cycle}`);
      return;
    }
    if (state === 2) return;
    color.set(id, 1);
    stack.push(id);
    const task = byId.get(id);
    for (const dep of task?.depends ?? []) {
      if (byId.has(dep)) visit(dep);
    }
    stack.pop();
    color.set(id, 2);
  };
  for (const task of tasks) visit(task.id);

  return { errors, byId };
}

function pct(part, total) {
  return total === 0 ? '0,0%' : `${((part / total) * 100).toFixed(1).replace('.', ',')}%`;
}

function fmtDays(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace('.', ',');
}

function renderDashboard(tasks, errors) {
  const excluded = tasks.filter((task) => task.status === 'CUT');
  const counted = tasks.filter((task) => task.status !== 'CUT');
  const totalEstimate = counted.reduce((sum, task) => sum + task.estimate, 0);
  const doneEstimate = counted
    .filter((task) => task.status === 'DONE')
    .reduce((sum, task) => sum + task.estimate, 0);
  const wipEstimate = counted
    .filter((task) => task.status === 'WIP')
    .reduce((sum, task) => sum + task.estimate, 0);
  const blockedEstimate = counted
    .filter((task) => task.status === 'BLOCKED')
    .reduce((sum, task) => sum + task.estimate, 0);

  const byStatus = new Map([...STATUSES].map((status) => [status, []]));
  for (const task of tasks) byStatus.get(task.status)?.push(task);

  const preferredComponents = ['Foundation', 'DataGrid', 'PivotGrid', 'Charts'];
  const componentNames = [...new Set(tasks.map((task) => task.component))].sort(
    (a, b) => {
      const ai = preferredComponents.indexOf(a);
      const bi = preferredComponents.indexOf(b);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi) || a.localeCompare(b);
    },
  );
  const componentRows = componentNames.map((name) => {
    const scoped = tasks.filter((task) => task.component === name);
    const active = scoped.filter((task) => task.status !== 'CUT');
    const total = active.reduce((sum, task) => sum + task.estimate, 0);
    const done = active
      .filter((task) => task.status === 'DONE')
      .reduce((sum, task) => sum + task.estimate, 0);
    return {
      name,
      totalTasks: scoped.length,
      done: active.filter((task) => task.status === 'DONE').length,
      wip: active.filter((task) => task.status === 'WIP').length,
      blocked: active.filter((task) => task.status === 'BLOCKED').length,
      todo: active.filter((task) => task.status === 'TODO').length,
      cut: scoped.filter((task) => task.status === 'CUT').length,
      total,
      doneEstimate: done,
      progress: pct(done, total),
    };
  });

  const phaseRank = (phase) => {
    if (phase === 'P0') return 0;
    if (phase.startsWith('DG-')) return 10 + Number(phase.slice(3));
    if (phase.startsWith('PV-')) return 20 + Number(phase.slice(3));
    if (phase.startsWith('CH-')) return 30 + Number(phase.slice(3));
    return 90;
  };
  const phaseNames = [...new Set(tasks.map((task) => task.phase))].sort(
    (a, b) => phaseRank(a) - phaseRank(b) || a.localeCompare(b, undefined, { numeric: true }),
  );
  const phaseRows = phaseNames.map((phase) => {
    const scoped = tasks.filter((task) => task.phase === phase && task.status !== 'CUT');
    const total = scoped.reduce((sum, task) => sum + task.estimate, 0);
    const done = scoped
      .filter((task) => task.status === 'DONE')
      .reduce((sum, task) => sum + task.estimate, 0);
    return { phase, count: scoped.length, total, done, progress: pct(done, total) };
  });

  const byId = new Map(tasks.map((task) => [task.id, task]));
  const ready = tasks
    .filter((task) => task.status === 'TODO')
    .filter((task) =>
      task.depends.every((dep) => {
        const dependency = byId.get(dep);
        return dependency?.status === 'DONE';
      }),
    )
    .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))
    .slice(0, 12);

  const blocked = tasks.filter((task) => task.status === 'BLOCKED');

  const lines = [];
  lines.push('## Ringkasan Progress');
  lines.push('');
  lines.push(
    `**${pct(doneEstimate, totalEstimate)}** dari total estimasi ` +
      `**${fmtDays(totalEstimate)} ideal day** selesai ` +
      `(${fmtDays(doneEstimate)} day). ` +
      `Task: ${counted.length} aktif, ${excluded.length} dibatalkan.`,
  );
  lines.push('');
  lines.push('| Status | Task | Estimasi (d) |');
  lines.push('|---|---:|---:|');
  for (const status of ['DONE', 'WIP', 'BLOCKED', 'TODO', 'CUT']) {
    const scoped = byStatus.get(status) ?? [];
    const estimate = scoped.reduce((sum, task) => sum + task.estimate, 0);
    lines.push(`| ${status} | ${scoped.length} | ${fmtDays(estimate)} |`);
  }
  lines.push('');
  lines.push(
    `Estimasi WIP: ${fmtDays(wipEstimate)} day · ` +
      `estimasi BLOCKED: ${fmtDays(blockedEstimate)} day.`,
  );
  lines.push('');

  lines.push('### Progress per komponen');
  lines.push('');
  lines.push('| Komponen | Task | DONE | WIP | BLOCKED | TODO | CUT | Est total | Est DONE | Progress |');
  lines.push('|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|');
  for (const row of componentRows) {
    lines.push(
      `| ${row.name} | ${row.totalTasks} | ${row.done} | ${row.wip} | ${row.blocked} | ` +
        `${row.todo} | ${row.cut} | ${fmtDays(row.total)} | ${fmtDays(row.doneEstimate)} | ${row.progress} |`,
    );
  }
  lines.push('');

  lines.push('### Progress per fase');
  lines.push('');
  lines.push('| Fase | Task | Est (d) | Est DONE | Progress |');
  lines.push('|---|---:|---:|---:|---:|');
  for (const row of phaseRows) {
    lines.push(
      `| ${row.phase} | ${row.count} | ${fmtDays(row.total)} | ${fmtDays(row.done)} | ${row.progress} |`,
    );
  }
  lines.push('');

  lines.push('### Siap dikerjakan');
  lines.push('');
  lines.push('Task `TODO` yang seluruh dependency-nya sudah `DONE`.');
  lines.push('');
  if (ready.length === 0) {
    lines.push('_Tidak ada task yang siap dikerjakan (atau semua dependency belum selesai)._');
  } else {
    lines.push('| ID | Task | Komponen | Est (d) | Owner |');
    lines.push('|---|---|---|---:|---|');
    for (const task of ready) {
      lines.push(
        `| ${task.id} | ${task.task} | ${task.component} | ${fmtDays(task.estimate)} | ${task.owner} |`,
      );
    }
  }
  lines.push('');

  lines.push('### Blocked');
  lines.push('');
  if (blocked.length === 0) {
    lines.push('_Tidak ada task blocked._');
  } else {
    lines.push('| ID | Task | Komponen | Est (d) | Owner |');
    lines.push('|---|---|---|---:|---|');
    for (const task of blocked) {
      lines.push(
        `| ${task.id} | ${task.task} | ${task.component} | ${fmtDays(task.estimate)} | ${task.owner} |`,
      );
    }
  }
  lines.push('');

  lines.push('### Validasi');
  lines.push('');
  if (errors.length === 0) {
    lines.push(`✅ Tidak ada error. ${tasks.length} task terbaca dari ${new Set(tasks.map((t) => t.file)).size} file.`);
  } else {
    lines.push(`❌ ${errors.length} error:`);
    lines.push('');
    for (const error of errors) lines.push(`- ${error}`);
  }
  lines.push('');
  lines.push(
    '_Dashboard ini di-generate oleh `docs/10-tracking/tools/progress.mjs`. ' +
      'Jangan mengedit bagian di antara marker secara manual._',
  );

  return { markdown: lines.join('\n'), errors, totalEstimate, doneEstimate, counted, excluded };
}

async function main() {
  const files = await walk(DOCS_DIR);
  const taskFiles = files.filter((file) => {
    const rel = path.relative(DOCS_DIR, file).replaceAll('\\', '/');
    if (rel.startsWith('11-templates/')) return false;
    if (rel === '10-tracking/progress.md') return false;
    if (rel.endsWith('README.md')) return false;
    if (rel.endsWith('master-backlog.md')) return false;
    return true;
  });

  const tasks = [];
  const parseErrors = [];
  for (const file of taskFiles) {
    const text = await readFile(file, 'utf8');
    const parsed = parseTables(text, file);
    tasks.push(...parsed.tasks);
    parseErrors.push(...parsed.errors);
  }

  const { errors } = validate(tasks, parseErrors);
  const dashboard = renderDashboard(tasks, errors);

  if (checkOnly) {
    if (errors.length > 0) {
      console.error(`Validasi gagal: ${errors.length} error.`);
      for (const error of errors) console.error(`- ${error}`);
      process.exitCode = 1;
      return;
    }
    console.log(
      `OK: ${tasks.length} task, ${fmtDays(dashboard.totalEstimate)} ideal day, ` +
        `${dashboard.counted.length} aktif, ${dashboard.excluded.length} CUT.`,
    );
    return;
  }

  if (shouldWrite) {
    if (errors.length > 0) {
      console.error('Validasi gagal; progress.md tidak diubah.');
      for (const error of errors) console.error(`- ${error}`);
      process.exitCode = 1;
      return;
    }
    const current = await readFile(PROGRESS_FILE, 'utf8');
    const start = '<!-- PROGRESS:START -->';
    const end = '<!-- PROGRESS:END -->';
    const startIndex = current.indexOf(start);
    const endIndex = current.indexOf(end);
    if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
      throw new Error(`Marker ${start} / ${end} tidak ditemukan di ${PROGRESS_FILE}`);
    }
    const next =
      current.slice(0, startIndex + start.length) +
      '\n\n' +
      dashboard.markdown +
      '\n' +
      current.slice(endIndex);
    await writeFile(PROGRESS_FILE, next, 'utf8');
    console.log(`progress.md diperbarui: ${pct(dashboard.doneEstimate, dashboard.totalEstimate)} selesai.`);
    return;
  }

  console.log(dashboard.markdown);
  if (errors.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
