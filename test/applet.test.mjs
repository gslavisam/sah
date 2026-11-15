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
    'btn-piece-set',
    'btn-ai-difficulty',
    'btn-ai-move',
    'btn-reset',
    'btn-camera-view',
    'btn-hide-ui',
    'controls-hint',
    'captured-tray'
  ]) {
    assert.ok(appTsx.includes(`id="${requiredId}"`), `Missing required HUD control #${requiredId}`);
  }
  for (const removedCameraId of ['btn-cam-player', 'btn-cam-top', 'btn-cam-side', 'btn-cam-wide']) {
    assert.ok(!appTsx.includes(`id="${removedCameraId}"`), `Obsolete camera control #${removedCameraId} must be removed`);
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

test('Camera control switches between player and overhead views using one button', () => {
  const appTsx = fs.readFileSync(path.join(ROOT, 'src/App.tsx'), 'utf-8');
  const engine = fs.readFileSync(path.join(ROOT, 'src/wizardChessEngine.js'), 'utf-8');
  assert.match(appTsx, /id="btn-camera-view"[\s\S]*?onClick=\{handleToggleCameraView\}[\s\S]*?\{cameraView === 'player' \? 'Player Cam' : 'Overhead'\}/);
  assert.ok(appTsx.includes('setCameraPreset?: (preset: CameraView) => void'), 'The button must call the engine camera API');
  assert.ok(appTsx.includes("window.addEventListener('wizardchess:cameraview'"), 'The UI must track camera changes from the engine');
  assert.ok(engine.includes('      setCameraPreset,'), 'The camera preset API must be exposed');
  assert.ok(engine.includes("new CustomEvent('wizardchess:cameraview'"), 'Camera changes must notify the React UI');
});

test('Dragon pawns have team-colored center medallions and white dragon knights have white legs', () => {
  const engine = fs.readFileSync(path.join(ROOT, 'src/wizardChessEngine.js'), 'utf-8');
  assert.ok(engine.includes('dragonPawnMarkWhite: new THREE.MeshBasicMaterial({ color: 0xe6dfd0'));
  assert.ok(engine.includes('dragonPawnMarkBlack: new THREE.MeshBasicMaterial({ color: 0x111318'));
  assert.ok(engine.includes('for (const facing of [-1, 1])'), 'Pawn marks must be visible from either side');
  assert.ok(engine.includes('[0, 0.42, facing * 0.17]'), 'Pawn marks must sit on the torso, not the base');
  assert.ok(engine.includes("color === 'w' ? pieceSetMaterials.dragonPawnMarkWhite : pieceSetMaterials.dragonPawnMarkBlack"));
  assert.ok(engine.includes("const legMat = color === 'w' ? primary : darkMat"));
  assert.ok(engine.includes('cylinder(0.05, 0.07, 0.32, legMat'), 'Dragon knight legs must use the side-specific leg material');
  assert.ok(engine.includes('cylinder(0.05, 0.07, 0.3, legMat'));
});

test('AI difficulty can be switched and medium and hard levels search ahead', () => {
  const appTsx = fs.readFileSync(path.join(ROOT, 'src/App.tsx'), 'utf-8');
  const engine = fs.readFileSync(path.join(ROOT, 'src/wizardChessEngine.js'), 'utf-8');
  assert.ok(appTsx.includes('wizard_chess_ai_difficulty'), 'AI difficulty preference must persist locally');
  assert.ok(appTsx.includes("'easy', 'medium', 'hard'"), 'The UI must cycle through all three difficulty levels');
  assert.ok(appTsx.includes("saved === 'hard'"), 'The hard difficulty preference must persist');
  assert.ok(engine.includes("aiDifficulty === 'hard'"), 'The engine must select the hard difficulty');
  assert.ok(engine.includes('function chooseMediumAIMove(color)'), 'Medium difficulty must be implemented');
  assert.ok(engine.includes('const opponentMoves = getAllLegalMoves(opponentColor)'), 'Medium difficulty must consider opponent replies');
  assert.ok(engine.includes('if (moveScore <= bestScore) break'), 'Medium difficulty must prune inferior branches');
  assert.ok(engine.includes('function chooseHardAIMove(color)'), 'Hard difficulty must be implemented');
  assert.ok(engine.includes('searchHardPosition(opponentColor, color, 2, alpha, beta, 1)'), 'Hard difficulty must search three plies');
  assert.ok(engine.includes('if (beta <= alpha) break'), 'Hard difficulty must use alpha-beta pruning');
  assert.ok(engine.includes('setAIDifficulty,'), 'AI difficulty must be exposed to the UI');
});

test('Restore UI control remains visible and clickable whenever the HUD is hidden', () => {
  const appTsx = fs.readFileSync(path.join(ROOT, 'src/App.tsx'), 'utf-8');
  const styles = fs.readFileSync(path.join(ROOT, 'src/styles.css'), 'utf-8');
  assert.match(appTsx, /id="btn-mobile-show-ui"[\s\S]*?onClick=\{handleRestoreUI\}/);
  assert.match(styles, /body\.cinematic-ui-hidden \.restore-ui-button\s*\{[^}]*display:\s*inline-flex;[^}]*pointer-events:\s*auto;/);
  assert.ok(styles.includes('z-index: 40;'), 'Restore control must remain above the hidden HUD and overlays');
});

test('Procedural chess sets are selectable without replacing the existing sculpted models', () => {
  const appTsx = fs.readFileSync(path.join(ROOT, 'src/App.tsx'), 'utf-8');
  const engine = fs.readFileSync(path.join(ROOT, 'src/wizardChessEngine.js'), 'utf-8');
  assert.ok(appTsx.includes('wizard_chess_piece_set'), 'Piece set preference must persist locally');
  assert.ok(engine.includes("PIECE_SET_IDS = ['wizard', 'ancient', 'dragon']"), 'All three piece set IDs must be supported');
  assert.ok(engine.includes('function createAncientPiece(type, color)'), 'Ancient pieces must be generated procedurally');
  assert.ok(engine.includes('function createDragonPiece(type, color)'), 'Dragon and knight pieces must be generated procedurally');
  assert.ok(engine.includes('function setPieceSet(pieceSetId)'), 'Engine must support changing sets during a game');
  assert.ok(engine.includes('      setPieceSet,'), 'Piece set control must be exposed to the UI');
  assert.ok(engine.includes("activePieceSet === 'ancient'"), 'Existing GLB pieces must remain the default set');
  assert.ok(engine.includes("activePieceSet === 'dragon'"), 'Fantasy set must be selectable');
  assert.ok(engine.includes("previousPieceSet === 'ancient' || previousPieceSet === 'dragon'"), 'Procedural geometries must be disposed when leaving either generated set');
  assert.ok(appTsx.includes("dragon: 'Zmajevi i vitezovi'"), 'Fantasy set must have a localized name');
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
