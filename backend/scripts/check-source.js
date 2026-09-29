import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { extname, join } from 'node:path';

function collect(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collect(path);
    return extname(path) === '.js' ? [path] : [];
  });
}

const files = collect('src');
for (const path of files) execFileSync(process.execPath, ['--check', path], { stdio: 'inherit' });
console.info(`Checked ${files.length} backend JavaScript modules.`);
