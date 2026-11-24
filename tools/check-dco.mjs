#!/usr/bin/env node
/**
 * Verifikasi DCO: setiap commit non-merge pada rentang harus memiliki trailer
 * `Signed-off-by` yang cocok dengan penulis commit (FND-034, ADR-0001).
 *
 * Pemakaian: node tools/check-dco.mjs <base> <head>
 */

import { execFileSync } from 'node:child_process';

const [base, head = 'HEAD'] = process.argv.slice(2);

if (!base) {
  console.error('Pemakaian: node tools/check-dco.mjs <base> <head>');
  process.exit(2);
}

function githubLogin(email) {
  const match = /^(?:\d+\+)?([^@]+)@users\.noreply\.github\.com$/i.exec(email);
  return match?.[1]?.toLowerCase();
}

/**
 * GitHub squash-merge menulis ulang email author menjadi noreply; terima
 * sign-off yang menyebut login GitHub yang sama agar tidak false positive.
 */
function matchesSignOff(signedOff, authorName, authorEmail) {
  const expected = `${authorName} <${authorEmail}>`.toLowerCase();
  if (signedOff.toLowerCase() === expected) return true;

  const login = githubLogin(authorEmail);
  return login ? signedOff.toLowerCase().includes(login) : false;
}

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

const shas = git(['log', '--no-merges', '--format=%H', `${base}..${head}`])
  .split('\n')
  .filter(Boolean);

const failures = [];

for (const sha of shas) {
  const author = git(['show', '-s', '--format=%an <%ae>', sha]);
  const body = git(['show', '-s', '--format=%B', sha]);

  const signedOff = [...body.matchAll(/^Signed-off-by: (.+)$/gim)].map(
    (match) => match[1].trim(),
  );

  if (signedOff.length === 0) {
    failures.push(`${sha.slice(0, 7)} ${author}: tidak ada Signed-off-by`);
    continue;
  }

  const name = git(['show', '-s', '--format=%an', sha]);
  const email = git(['show', '-s', '--format=%ae', sha]);
  const matches = signedOff.some((line) => matchesSignOff(line, name, email));

  if (!matches) {
    failures.push(
      `${sha.slice(0, 7)} ${author}: Signed-off-by tidak cocok (${signedOff.join(', ')})`,
    );
  }
}

if (failures.length > 0) {
  console.error('DCO gagal. Tandatangani commit dengan `git commit -s`.');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `DCO lulus untuk ${shas.length} commit (${base.slice(0, 7)}..${head.slice(0, 7)}).`,
);
