import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packagesDir = join(projectRoot, 'packages');

const REQUIRED_YML_FIELDS = ['name', 'slug', 'version', 'description', 'homepage', 'license', 'maintainer'];
const REQUIRED_PAK_FIELDS = ['SRC', 'BUILDDIR', 'BIN', 'LIB', 'INSTALL_BIN', 'INSTALL_LIB'];

function parsePak(text) {
	const lines = text.split(/\r?\n/);
	const result = {};
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const match = line.match(/^([A-Z_]+)=(.*)$/);
		if (!match) continue;
		const [, key, rawValue] = match;
		const trimmed = rawValue.trim();

		if (trimmed === '(') {
			const items = [];
			i++;
			while (i < lines.length && lines[i].trim() !== ')') {
				const item = lines[i].trim();
				if (item) items.push(item);
				i++;
			}
			result[key] = items;
			continue;
		}

		if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
			result[key] = trimmed
				.slice(1, -1)
				.split(/\s+/)
				.map((s) => s.trim())
				.filter(Boolean);
			continue;
		}

		result[key] = trimmed;
	}
	return result;
}

function sameSlugs(a, b) {
	const sa = [...new Set(a)].sort();
	const sb = [...new Set(b)].sort();
	return sa.length === sb.length && sa.every((v, i) => v === sb[i]);
}

function lintPackage(dir, allSlugs) {
	const errors = [];
	const base = join(packagesDir, dir);
	const files = readdirSync(base);

	const ymlFiles = files.filter((f) => f === 'package.yml');
	const pakFiles = files.filter((f) => f === 'package.pak');

	if (ymlFiles.length !== 1) {
		errors.push(`expected exactly one package.yml, found ${ymlFiles.length}`);
	}
	if (pakFiles.length !== 1) {
		errors.push(`expected exactly one package.pak, found ${pakFiles.length}`);
	}
	if (errors.length) return errors;

	let meta;
	try {
		meta = yaml.load(readFileSync(join(base, 'package.yml'), 'utf-8')) ?? {};
	} catch (err) {
		errors.push(`package.yml failed to parse: ${err.message}`);
		return errors;
	}

	for (const field of REQUIRED_YML_FIELDS) {
		const value = meta[field];
		if (value === undefined || value === null || String(value).trim() === '') {
			errors.push(`package.yml missing required field: ${field}`);
		}
	}

	if (meta.slug !== undefined && meta.slug !== dir) {
		errors.push(`package.yml slug "${meta.slug}" does not match directory name "${dir}"`);
	}

	const ymlDeps = Array.isArray(meta.dependencies) ? meta.dependencies : [];
	if (meta.dependencies != null && !Array.isArray(meta.dependencies)) {
		errors.push('package.yml dependencies must be a list');
	}

	let pak;
	try {
		pak = parsePak(readFileSync(join(base, 'package.pak'), 'utf-8'));
	} catch (err) {
		errors.push(`package.pak failed to parse: ${err.message}`);
		return errors;
	}

	for (const field of REQUIRED_PAK_FIELDS) {
		const value = pak[field];
		if (value === undefined || String(value).trim() === '') {
			errors.push(`package.pak missing required field: ${field}`);
		}
	}

	if (!Array.isArray(pak.BUILD_SCRIPT) || pak.BUILD_SCRIPT.length === 0) {
		errors.push('package.pak BUILD_SCRIPT must contain at least one command');
	}

	for (const field of ['INSTALL_BIN', 'INSTALL_LIB']) {
		if (pak[field] !== undefined && pak[field] !== 'y' && pak[field] !== 'n') {
			errors.push(`package.pak ${field} must be "y" or "n", got "${pak[field]}"`);
		}
	}

	const pakDeps = Array.isArray(pak.DEPENDENCIES) ? pak.DEPENDENCIES : [];
	if (!sameSlugs(ymlDeps, pakDeps)) {
		errors.push(
			`dependency mismatch: package.yml has [${ymlDeps.join(', ')}], package.pak has [${pakDeps.join(', ')}]`
		);
	}

	for (const dep of ymlDeps) {
		if (!allSlugs.has(dep)) {
			errors.push(`dependency "${dep}" is not an existing package in this repo`);
		}
	}

	return errors;
}

function main() {
	const dirs = readdirSync(packagesDir).filter((name) => statSync(join(packagesDir, name)).isDirectory());
	const allSlugs = new Set(dirs);

	const results = dirs.map((dir) => ({ dir, errors: lintPackage(dir, allSlugs) }));
	const failing = results.filter((r) => r.errors.length > 0);

	if (failing.length === 0) {
		console.log(`${dirs.length} package${dirs.length === 1 ? '' : 's'} OK`);
		process.exit(0);
	}

	for (const { dir, errors } of failing) {
		console.error(`packages/${dir}:`);
		for (const err of errors) console.error(`  - ${err}`);
	}
	console.error(`\n${failing.length}/${dirs.length} package(s) failed`);
	process.exit(1);
}

main();
