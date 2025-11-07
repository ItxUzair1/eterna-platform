#!/usr/bin/env node
// Migration: Move local files referenced in Prisma File.path to DigitalOcean Spaces
// Usage:
//   node scripts/migrate-local-uploads-to-spaces.js [--dry-run] [--limit=1000]

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const { uploadBufferToSpaces, uniqueKey } = require('../src/utils/spaces');

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const limitArg = args.find(a => a.startsWith('--limit='));
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1], 10) : 1000;

function guessPrefix(filePath) {
	const p = filePath.replace(/\\/g, '/');
	if (p.includes('/uploads/kanban')) return 'kanban';
	if (p.includes('/uploads/convert')) return 'image/outputs';
	if (p.includes('/tmp/uploads')) return 'tmp';
	if (p.includes('/uploads')) return 'uploads';
	return 'uploads';
}

function isLocalPath(p) {
	if (!p) return false;
	// Treat anything with path separators and not looking like a key as local
	// If we've already migrated, we likely stored keys like 'kanban/...' without absolute paths
	return path.isAbsolute(p) || p.includes('\\') || p.startsWith('./') || p.startsWith('../');
}

async function readFileAsBuffer(p) {
	return await fsp.readFile(p);
}

async function migrateBatch(offset, batchSize) {
	const rows = await prisma.file.findMany({
		skip: offset,
		take: batchSize,
		orderBy: { id: 'asc' }
	});
	let migrated = 0;
	for (const row of rows) {
		const current = row.path;
		if (!isLocalPath(current)) continue; // likely already migrated
		if (!fs.existsSync(current)) {
			console.warn(`[skip] Missing local file: id=${row.id} path=${current}`);
			continue;
		}
		const prefix = guessPrefix(current);
		const originalName = path.basename(current);
		const key = uniqueKey(prefix, originalName);
		if (DRY_RUN) {
			console.log(`[dry-run] Would upload -> ${current} => ${key}`);
			migrated += 1;
			continue;
		}
		try {
			const buffer = await readFileAsBuffer(current);
			await uploadBufferToSpaces({ key, buffer, contentType: row.mime || 'application/octet-stream' });
			await prisma.file.update({ where: { id: row.id }, data: { path: key } });
			console.log(`[ok] id=${row.id} ${current} => ${key}`);
			migrated += 1;
		} catch (e) {
			console.error(`[fail] id=${row.id} path=${current} error=${e.message}`);
		}
	}
	return migrated;
}

async function main() {
	console.log(`Starting migration to Spaces. dryRun=${DRY_RUN} limit=${LIMIT}`);
	let offset = 0;
	let totalMigrated = 0;
	while (true) {
		const m = await migrateBatch(offset, LIMIT);
		totalMigrated += m;
		if (m === 0) break;
		offset += LIMIT;
		if (DRY_RUN) break; // one pass in dry-run by default
	}
	console.log(`Done. Migrated ${totalMigrated} file records.`);
	process.exit(0);
}

main().catch((e) => {
	console.error('Migration failed:', e);
	process.exit(1);
});


