import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const ROOT = process.cwd();

test('Simplified Single-Player HUD in src/App.tsx excludes speed sliders, notation script bar, and multiplayer lobby', () => {
  const appTsx = fs.readFileSync(path.join(ROOT, 'src/App.tsx'), 'utf-8');

  // Must include simplified game & camera controls
  for (const requiredId of [
    'btn-side-toggle',
    'btn-ai-move',
    'btn-reset',
    'btn-cam-player',
    'btn-cam-top',
    'btn-cam-side',
    'btn-cam-wide',
    'btn-hide-ui',
    'controls-hint',
    'captured-tray'
  ]) {
    assert.ok(appTsx.includes(`id="${requiredId}"`), `Missing required HUD control #${requiredId}`);
  }

  // Must NOT include camera speed sliders, script mode bar, or multiplayer lobby
  for (const forbiddenId of [
    'cam-speed-wrap',
    'input-cam-speed',
    'rot-speed-wrap',
    'input-rot-speed',
    'script-bar',
    'btn-script-modal',
    'btn-script-prev',
    'btn-script-next',
    'btn-lobby',
    'lobby-modal',
    'room-pill',
    'btn-checkmate-stepback'
  ]) {
    assert.ok(!appTsx.includes(forbiddenId), `Forbidden UI element #${forbiddenId} found in App.tsx`);
  }
});

test('All 7 compressed 3D assets (.glb.gz.b64) decode and gunzip to valid glTF 2.0 binary models', () => {
  const expectedModels = [
    'option8_cathedral',
    'pawn_white',
    'rook_white',
    'knight_white',
    'bishop_white',
    'queen_white',
    'king_white'
  ];

  for (const name of expectedModels) {
    const b64Path = path.join(ROOT, 'public/assets/glb', `${name}.glb.gz.b64`);
    assert.ok(fs.existsSync(b64Path), `Missing 3D asset ${b64Path}`);
    const b64Text = fs.readFileSync(b64Path, 'utf-8').trim();
    assert.ok(b64Text.length > 1000, `Asset ${name}.glb.gz.b64 is unexpectedly small`);

    const gzBuf = Buffer.from(b64Text, 'base64');
    const glbBuf = zlib.gunzipSync(gzBuf);

    const magic = glbBuf.toString('ascii', 0, 4);
    const version = glbBuf.readUInt32LE(4);
    const totalLen = glbBuf.readUInt32LE(8);
    assert.equal(magic, 'glTF', `Invalid glTF magic header for ${name}`);
    assert.equal(version, 2, `Invalid glTF version for ${name}`);
    assert.equal(totalLen, glbBuf.length, `Mismatched glTF byte length for ${name}`);
  }
});

test('Academy publishes 12 puzzles and 12 lessons for each learning area', () => {
  const puzzleSource = fs.readFileSync(path.join(ROOT, 'src/services/puzzleCatalog.ts'), 'utf-8');
  const lessonSource = fs.readFileSync(path.join(ROOT, 'src/services/academyCatalog.ts'), 'utf-8');
  const lessonIds = [...lessonSource.matchAll(/^\s+id: '([^']+)'/gm)]
    .map((match) => match[1])
    .filter((id) => !['puzzles', 'games', 'openings', 'strategy'].includes(id));
  assert.equal(lessonIds.length, 36, 'Expected 12 individually curated lessons in each of three areas');
  assert.equal(new Set(lessonIds).size, lessonIds.length, 'Lesson IDs must be unique');
  for (const field of ['lesson', 'question', 'options', 'answer', 'explanation', 'takeaway']) {
    assert.equal((lessonSource.match(new RegExp(`^\\s+${field}:`, 'gm')) || []).length, 37, `Each lesson must define ${field}`);
  }
  const answers = [...lessonSource.matchAll(/^\s+answer: (\d+)/gm)].map((match) => Number(match[1]));
  assert.ok(answers.every((answer) => answer >= 0 && answer < 3), 'Every answer index must match one of three choices');
  assert.match(puzzleSource, /CORE_PUZZLES: Puzzle\[\] = \[/);
  assert.match(puzzleSource, /\[\.\.\.CORE_PUZZLES, \.\.\.edgeQueenMates\]/);
  assert.match(puzzleSource, /\[6, 5, 4, 2\]/);
  assert.match(puzzleSource, /\[7, 6, 5, 4, 3\]/);
  assert.equal((puzzleSource.match(/solution: \{ fromR: \d+/g) || []).length, 3, 'Core puzzle solutions must be explicit');
  assert.match(puzzleSource, /solution: \{ fromR: r, fromC: 6, toR: 0, toC: 6 \}/);
  assert.match(puzzleSource, /solution: \{ fromR: r, fromC: 1, toR: 1, toC: 1 \}/);
});
