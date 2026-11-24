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
  assert.match(appTsx, /id="btn-camera-view"[\s\S]*?onClick=\{handleToggleCameraView\}[\s\S]*?\{cameraView === 'player' \? 'Igrač' : 'Odozgo'\}/);
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

test('AI difficulty supports 5 calibrated levels with popover selector and JS search fallback', () => {
  const appTsx = fs.readFileSync(path.join(ROOT, 'src/App.tsx'), 'utf-8');
  const engine = fs.readFileSync(path.join(ROOT, 'src/wizardChessEngine.js'), 'utf-8');
  const rules = fs.readFileSync(path.join(ROOT, 'src/shared/chessRules.ts'), 'utf-8');
  assert.ok(appTsx.includes('wizard_chess_ai_difficulty'), 'AI difficulty preference must persist locally');
  for (const level of ['beginner', 'casual', 'intermediate', 'advanced', 'master']) {
    assert.ok(rules.includes(`'${level}'`), `Difficulty tier ${level} must be defined`);
    assert.ok(appTsx.includes(`${level}:`), `UI must label difficulty tier ${level}`);
  }
  assert.ok(appTsx.includes('id="ai-difficulty-menu"'), 'UI must expose the compact 5-level difficulty popover');
  assert.ok(appTsx.includes('normalizeStockfishDifficulty'), 'Saved legacy difficulty preferences must normalize cleanly');
  assert.ok(engine.includes('function chooseBeginnerAIMove(color)'), 'Beginner fallback difficulty must be implemented');
  assert.ok(engine.includes('function chooseMediumAIMove(color)'), 'Intermediate fallback difficulty must be implemented');
  assert.ok(engine.includes('const opponentMoves = getAllLegalMoves(opponentColor)'), 'Medium difficulty must consider opponent replies');
  assert.ok(engine.includes('if (moveScore <= bestScore) break'), 'Medium difficulty must prune inferior branches');
  assert.ok(engine.includes('function chooseHardAIMove(color)'), 'Advanced/Master fallback difficulty must be implemented');
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

  const bottomMatch = styles.match(/#hud-bottom\s*\{[^}]*bottom:\s*(\d+)px/);
  const dockMatch = styles.match(/#hud-dock\s*\{[^}]*bottom:\s*(\d+)px/);
  assert.ok(bottomMatch && dockMatch, '#hud-bottom and #hud-dock must define bottom offsets');
  assert.ok(
    Number(dockMatch[1]) >= Number(bottomMatch[1]) + 30,
    '#hud-dock must sit cleanly above #hud-bottom without overlapping the controls status bar'
  );
});

test('Procedural chess sets are selectable without replacing the existing sculpted models', () => {
  const appTsx = fs.readFileSync(path.join(ROOT, 'src/App.tsx'), 'utf-8');
  const engine = fs.readFileSync(path.join(ROOT, 'src/wizardChessEngine.js'), 'utf-8');
  assert.ok(appTsx.includes('wizard_chess_piece_set'), 'Piece set preference must persist locally');
  assert.ok(engine.includes("PIECE_SET_IDS = ['wizard', 'ancient', 'dragon', 'medieval', 'vitez', 'srpski', 'klasicni']"), 'All seven piece set IDs must be supported');
  assert.ok(engine.includes('function createAncientPiece(type, color)'), 'Ancient pieces must be generated procedurally');
  assert.ok(engine.includes('function createDragonPiece(type, color)'), 'Dragon and knight pieces must be generated procedurally');
  assert.ok(engine.includes('function createMedievalPiece(type, color)'), 'Medieval pieces must be generated procedurally');
  assert.ok(engine.includes('map: medievalStoneTexture'), 'Medieval stone should have a subtle surface grain');
  assert.ok(engine.includes('bumpMap: medievalStoneTexture'), 'Medieval stone should have tactile surface relief');
  assert.ok(engine.includes('color: 0x454950'), 'Black medieval stone should use a darker slate color');
  assert.ok(engine.includes('medievalBlackIron: new THREE.MeshStandardMaterial'), 'Black medieval armor should use dark iron');
  assert.ok(engine.includes('color === \'w\' ? pieceSetMaterials.medievalIron : pieceSetMaterials.medievalBlackIron'), 'Black figures should use darker armor');
  assert.ok(engine.includes('medievalSkin: new THREE.MeshStandardMaterial'), 'Medieval figures should have natural skin tones');
  assert.ok(engine.includes('new THREE.LatheGeometry(points.map(([x, y]) => new THREE.Vector2(x, y)), 48)'), 'Medieval silhouettes should use smoother geometry');
  assert.match(engine, /function createMedievalPiece[\s\S]*?const tube =/);
  assert.match(engine, /function createMedievalPiece[\s\S]*?const limb =/);
  assert.ok(engine.includes('function setPieceSet(pieceSetId)'), 'Engine must support changing sets during a game');
  assert.ok(engine.includes('      setPieceSet,'), 'Piece set control must be exposed to the UI');
  assert.ok(engine.includes("activePieceSet === 'ancient'"), 'Existing GLB pieces must remain the default set');
  assert.ok(engine.includes("activePieceSet === 'dragon'"), 'Fantasy set must be selectable');
  assert.ok(engine.includes("activePieceSet === 'medieval'"), 'Medieval set must be selectable');
  assert.ok(engine.includes("activePieceSet === 'vitez'"), 'Vitez GLB set must be selectable');
  assert.ok(engine.includes("activePieceSet === 'srpski'"), 'Srpski GLB set must be selectable');
  assert.ok(engine.includes("activePieceSet === 'klasicni'"), 'Klasicni GLB set must be selectable');
  assert.ok(engine.includes("activePieceSet === 'vitez' || activePieceSet === 'srpski'"), 'Detailed GLB sets must be selectable');
  assert.ok(engine.includes("const boardFitTemplates = activePieceSet === 'vitez'"), 'Detailed sets must select their own piece templates');
  assert.ok(engine.includes('          : klasicniPieceTemplates;'), 'Klasični templates must be used for its own set');
  assert.ok(engine.includes("const folder = color === 'w' ? 'bele' : 'crne'"), 'GLB paths must use the matching white or black assets');
  assert.ok(engine.includes('loadGltfModel(`${setId}/${folder}/${modelPrefix}_${type}`)'), 'Detailed sets must load correctly named models from their own asset folders');
  assert.ok(engine.includes("['klasicni', klasicniPieceTemplates, 'classic']"), 'Classic models must use their classic filename prefix');
  assert.ok(engine.includes('const BOARD_FIT_PIECE_HEIGHTS = {'), 'Board-fit sets must share normalized target heights');
  assert.ok(engine.includes('modelBounds.min.x + modelBounds.max.x'), 'Board-fit models must be centered on each square');
  assert.ok(engine.includes('-modelBounds.min.y'), 'Board-fit model bases must sit on the board surface');
  assert.ok(engine.includes('const modelScale = BOARD_FIT_PIECE_HEIGHTS[type] / modelSize.y'), 'Board-fit target height must use each model’s measured height');
  assert.ok(engine.includes('model.scale.setScalar(modelScale)'), 'Board-fit models must be uniformly scaled by measured height');
  assert.ok(engine.includes('-((modelBounds.min.x + modelBounds.max.x) / 2) * modelScale'), 'Board-fit centering offset must be applied in scaled model coordinates');
  assert.ok(engine.includes('root.scale.setScalar(isBoardFitModelSet ? 1 : BOARD_SQ_SIZE)'), 'Normalized models must not receive a second global scale');
  assert.match(engine, /if \(isBoardFitModelSet\) \{[\s\S]*?child\.receiveShadow = true;[\s\S]*?\} else \{/);
  assert.ok(engine.includes("previousPieceSet === 'ancient' || previousPieceSet === 'dragon' || previousPieceSet === 'medieval'"), 'Procedural geometries must be disposed when leaving a generated set');
  assert.ok(appTsx.includes("dragon: 'Zmajevi'"), 'Fantasy set must have a localized name');
  assert.ok(appTsx.includes("medieval: 'Srednji vek'"), 'Medieval set must have a localized name');
  assert.ok(appTsx.includes("vitez: 'Vitez'"), 'Vitez set must be selectable by name');
  assert.ok(appTsx.includes("srpski: 'Srpski'"), 'Srpski set must be selectable by name');
  assert.ok(appTsx.includes("klasicni: 'Klasični'"), 'Klasični set must be selectable by name');
  assert.ok(!appTsx.includes('srpski-kraljevski'), 'Srpski kraljevski set must be removed');
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

test('All 12-piece GLB sets decode to valid GLB 2.0 assets', () => {
  const pieceTypes = ['pawn', 'rook', 'knight', 'bishop', 'queen', 'king'];
  const colors = ['bele', 'crne'];
  const pieceSets = [
    { id: 'vitez', prefix: 'medieval' },
    { id: 'srpski', prefix: 'medieval' },
    { id: 'klasicni', prefix: 'classic' }
  ];

  for (const { id: setId, prefix } of pieceSets) {
    for (const color of colors) {
      for (const type of pieceTypes) {
        const name = `${prefix}_${type}`;
        const b64Path = path.join(ROOT, 'public/assets/glb', setId, color, `${name}.glb.gz.b64`);
        assert.ok(fs.existsSync(b64Path), `Missing ${setId} model ${color}/${name}`);
        const b64Text = fs.readFileSync(b64Path, 'utf-8').trim();
        assert.ok(b64Text.length > 1000, `${setId} asset ${color}/${name} is unexpectedly small`);

        const glbBuf = zlib.gunzipSync(Buffer.from(b64Text, 'base64'));
        assert.equal(glbBuf.toString('ascii', 0, 4), 'glTF', `Invalid GLB header for ${setId}/${color}/${name}`);
        assert.equal(glbBuf.readUInt32LE(4), 2, `Invalid GLB version for ${setId}/${color}/${name}`);
        assert.equal(glbBuf.readUInt32LE(8), glbBuf.length, `Invalid GLB byte length for ${setId}/${color}/${name}`);

        if (setId === 'vitez' && color === 'bele') {
          const jsonLength = glbBuf.readUInt32LE(12);
          const gltf = JSON.parse(glbBuf.toString('utf8', 20, 20 + jsonLength).trim());
          assert.ok(gltf.materials.length >= 1, `Vitez white ${type} should contain a material`);
          assert.ok(gltf.images.length >= 1, `Vitez white ${type} should retain its embedded texture`);
        }
      }
    }
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

test('Piece set persistence defaults to Klasični for new users and extra GLB sets lazy-load on demand', () => {
  const appTsx = fs.readFileSync(path.join(ROOT, 'src/App.tsx'), 'utf-8');
  const engine = fs.readFileSync(path.join(ROOT, 'src/wizardChessEngine.js'), 'utf-8');

  assert.ok(!appTsx.includes('srpski-kraljevski'), 'Removed srpski-kraljevski set must not be restored');
  assert.match(
    appTsx,
    /localStorage\.getItem\('wizard_chess_piece_set'\)[\s\S]*?saved === 'klasicni'[\s\S]*?return 'klasicni';/,
    'New users without saved piece set preference must default to Klasični in App.tsx'
  );
  assert.match(
    engine,
    /let activePieceSet = 'klasicni';\s*\n\s*let desiredPieceSet = 'klasicni';/,
    'Engine must default activePieceSet and desiredPieceSet to klasicni for new users'
  );
  assert.ok(
    engine.includes('function ensureBoardFitPieceSetLoaded(targetSetId'),
    'Detailed GLB sets must be lazy-loaded via ensureBoardFitPieceSetLoaded'
  );
  assert.ok(
    engine.includes('delete boardFitLoadPromises[setId]'),
    'Failed lazy loads must not poison the promise cache so retries succeed'
  );
  assert.ok(
    engine.includes('if (!initialAssetsLoaded)'),
    'Initial saved GLB set must be awaited before spawning the board'
  );
  assert.ok(
    engine.includes("new CustomEvent('wizardchess:pieceset-loading'"),
    'Engine must notify UI while lazy-loading an unloaded GLB piece set'
  );
});

test('Special chess rules, 2D instant sync, single Undo shortcut, and player-only XP are enforced', () => {
  const appTsx = fs.readFileSync(path.join(ROOT, 'src/App.tsx'), 'utf-8');
  const board2d = fs.readFileSync(path.join(ROOT, 'src/components/Classic2DBoard.tsx'), 'utf-8');
  const engine = fs.readFileSync(path.join(ROOT, 'src/wizardChessEngine.js'), 'utf-8');
  const gemini = fs.readFileSync(path.join(ROOT, 'src/services/geminiService.ts'), 'utf-8');
  const progression = fs.readFileSync(path.join(ROOT, 'src/services/progressionService.ts'), 'utf-8');

  // Special chess rules: en passant, promotion choice, 50-move rule, threefold repetition
  assert.ok(engine.includes('enPassant: true'), 'Pseudo/legal moves must generate en passant captures');
  assert.ok(engine.includes("PROMOTION_TYPES = ['queen', 'rook', 'bishop', 'knight']"), 'All four promotion piece types must be supported');
  assert.ok(engine.includes("new CustomEvent('wizardchess:promotion-request'"), 'Human pawn promotion must request piece selection');
  assert.ok(appTsx.includes('promotion-modal-backdrop'), 'App must render pawn promotion choice modal');
  assert.ok(engine.includes("drawReason = 'repetition'"), 'Threefold repetition draw must be detected');
  assert.ok(engine.includes("drawReason = 'fifty-move'"), '50-move draw rule must be detected');

  // KeyU must NOT hide the HUD in wizardChessEngine.js
  assert.ok(!engine.includes("e.code === 'KeyU'"), 'Pressing U must undo moves, never hide the HUD');

  // 2D mode: instant move execution, render pause, single keydown owner, mate vs draw distinction, turn guard
  assert.ok(engine.includes('function set2DModeActive(active)'), 'Engine must track 2D mode for instant moves and render pause');
  assert.ok(engine.includes('const executeInstantly = Boolean(options.instant || is2DModeActive)'), 'Moves in 2D mode must execute without 3D animation delay');
  assert.ok(!board2d.includes("window.addEventListener('keydown'"), 'Classic2DBoard must not duplicate global Undo/2D keydown listeners');
  assert.ok(board2d.includes('if (gameOver || currentTurn !== playerColor) return;'), '2D board must prevent clicking AI pieces out of turn');
  assert.ok(board2d.includes('chess-2d-alert-draw'), '2D board must distinguish stalemate/draw from checkmate');

  // XP & AI persona reactions distinguish player vs AI moves
  assert.ok(appTsx.includes('if (isPlayerMove) {\n        progressionService.awardMove(') || appTsx.includes('if (isPlayerMove) {'), 'XP move rewards must only trigger on player moves');
  assert.ok(appTsx.includes('progressionService.recordOpponentMove('), 'Opponent captures/checkmates must not award player victory XP');
  assert.ok(progression.includes('public recordOpponentMove('), 'ProgressionService must handle opponent captures/wins separately');
  assert.ok(gemini.includes('isPlayerMove ? pool.checkmate : pool.aiCheckmate'), 'Persona fallback must distinguish player checkmate win vs defeat');
  assert.ok(gemini.includes('isPlayerMove ? pool.capture : pool.blunder'), 'Persona fallback must use blunder lines when AI captures player piece');
});

test('Opponent hologram visualizes all three personas across from player and reacts to match events', () => {
  const hologramSrc = fs.readFileSync(path.join(ROOT, 'src/services/opponentHolograms.ts'), 'utf-8');
  const engine = fs.readFileSync(path.join(ROOT, 'src/wizardChessEngine.js'), 'utf-8');

  assert.ok(hologramSrc.includes('export function createOpponentHologramSystem()'));
  assert.ok(hologramSrc.includes('createMentorCharacter'));
  assert.ok(hologramSrc.includes('createRoastCharacter'));
  assert.ok(hologramSrc.includes('createRivalCharacter'));
  assert.ok(hologramSrc.includes("currentPlayerColor === 'w' ? -OPPONENT_SIDE_Z : OPPONENT_SIDE_Z"));
  assert.ok(engine.includes('opponentHologram.setPersona(themeId)'));
  assert.ok(engine.includes('opponentHologram.setPlayerSide(playerColor'));
  assert.ok(engine.includes('opponentHologram.triggerReaction('));
  assert.ok(engine.includes('opponentHologram.update(dt, elapsedTotal)'));
});

test('Shared authoritative chess rules validate moves, en passant, castling, promotion, and checkmate', async () => {
  const { createInitialChessState, applyChessMove, getLegalMovesForSquare } = await import('../src/shared/chessRules.ts');

  let state = createInitialChessState();
  assert.equal(state.currentTurn, 'w');
  assert.equal(state.moveCount, 0);

  // Fool's mate: 1. f3 e5 2. g4 Qh4#
  let res = applyChessMove(state, 6, 5, 5, 5); // f2->f3
  assert.equal(res.ok, true);
  state = res.state;

  res = applyChessMove(state, 1, 4, 3, 4); // e7->e5
  assert.equal(res.ok, true);
  state = res.state;

  // Reject out-of-turn Black move while White's turn
  const wrongTurn = applyChessMove(state, 0, 3, 4, 7);
  assert.equal(wrongTurn.ok, false);

  res = applyChessMove(state, 6, 6, 4, 6); // g2->g4
  assert.equal(res.ok, true);
  state = res.state;

  res = applyChessMove(state, 0, 3, 4, 7); // Qd8->h4#
  assert.equal(res.ok, true);
  state = res.state;

  assert.equal(state.inCheck, true);
  assert.equal(state.isCheckmate, true);
  assert.equal(state.gameOver, true);

  // En passant + pawn promotion check on fresh board
  state = createInitialChessState();
  state = applyChessMove(state, 6, 4, 4, 4).state; // e2->e4
  state = applyChessMove(state, 1, 0, 3, 0).state; // a7->a5
  state = applyChessMove(state, 4, 4, 3, 4).state; // e4->e5
  state = applyChessMove(state, 1, 3, 3, 3).state; // d7->d5 (double push)
  const epMoves = getLegalMovesForSquare(state, 3, 4);
  assert.ok(epMoves.some((m) => m.r === 2 && m.c === 3 && m.enPassant), 'En passant target must be generated');
  res = applyChessMove(state, 3, 4, 2, 3);
  assert.equal(res.ok, true);
  assert.equal(res.move.enPassant, true);
  assert.equal(res.state.board[3][3], null, 'En passant must remove captured pawn');
});

test('Online 2-player duel mode wires WebSocket server, modal, match bar, and engine sync', () => {
  const serverSrc = fs.readFileSync(path.join(ROOT, 'server.ts'), 'utf-8');
  const appTsx = fs.readFileSync(path.join(ROOT, 'src/App.tsx'), 'utf-8');
  const engine = fs.readFileSync(path.join(ROOT, 'src/wizardChessEngine.js'), 'utf-8');

  assert.ok(serverSrc.includes("url.pathname === '/ws'"), 'Server must upgrade /ws WebSocket connections');
  assert.ok(serverSrc.includes("msg.type === 'room:create'"));
  assert.ok(serverSrc.includes("msg.type === 'room:join'"));
  assert.ok(serverSrc.includes("msg.type === 'move:submit'"));
  assert.ok(serverSrc.includes("msg.type === 'match:resign'"));
  assert.ok(serverSrc.includes("msg.type === 'match:draw_offer'"));
  assert.ok(serverSrc.includes("msg.type === 'match:rematch'"));

  assert.ok(appTsx.includes('id="btn-online-duel"'));
  assert.ok(appTsx.includes('<OnlineDuelModal'));
  assert.ok(appTsx.includes('<OnlineMatchBar'));
  assert.ok(appTsx.includes("wizardchess:online-move-submit"));

  assert.ok(engine.includes('function enterOnlineMode('));
  assert.ok(engine.includes('function applyOnlineMove('));
  assert.ok(engine.includes('function endOnlineMatch('));
  assert.ok(engine.includes('function exitOnlineMode('));
});

test('Local SQLite authStore registers users, merges guest progression, manages sessions, and records match history', async () => {
  const { createAuthStore } = await import('../src/server/authStore.ts');
  const store = createAuthStore(':memory:');

  try {
    // Validation guards
    const badPass = store.registerUser({ username: 'milan', password: '123' });
    assert.equal(badPass.ok, false);

    // Registration merges guest XP & Academy progress
    const reg = store.registerUser({
      username: 'Carobnjak_99',
      password: 'tajnalozinka',
      displayName: 'Veliki Milan',
      guestStats: { xp: 180, totalMoves: 12, totalCaptures: 3, streak: 2 },
      guestAcademy: { puzzles: ['puzzle-1'], openings: ['op-1'] },
    });
    assert.equal(reg.ok, true);
    assert.equal(reg.data.user.username, 'carobnjak_99');
    assert.equal(reg.data.user.displayName, 'Veliki Milan');
    assert.equal(reg.data.user.stats.level, 2);
    assert.equal(reg.data.user.stats.title, 'Kameni Adept');
    assert.deepEqual(reg.data.user.academyProgress.puzzles, ['puzzle-1']);

    // Duplicate username rejected
    const dup = store.registerUser({ username: 'carobnjak_99', password: 'tajnalozinka2' });
    assert.equal(dup.ok, false);
    assert.equal(dup.status, 409);

    // Wrong password rejected
    const badLogin = store.loginUser({ username: 'carobnjak_99', password: 'pogresna' });
    assert.equal(badLogin.ok, false);
    assert.equal(badLogin.status, 401);

    // Session lookup works
    const sess = store.getSessionUser(reg.data.token);
    assert.ok(sess);
    assert.equal(sess.user.id, reg.data.user.id);

    // Display name update works
    const renamed = store.updateDisplayName(reg.data.user.id, 'Arhimag Milan');
    assert.equal(renamed.ok, true);
    assert.equal(renamed.user.displayName, 'Arhimag Milan');

    // Recording online and single-player matches updates W/D/L and history
    store.recordMatch(reg.data.user.id, {
      mode: 'online',
      playerColor: 'w',
      opponentName: 'Luka',
      result: 'win',
      reason: 'checkmate',
      moveCount: 24,
    });
    const afterSecond = store.recordMatch(reg.data.user.id, {
      mode: 'single',
      playerColor: 'b',
      opponentName: 'Alistair (AI)',
      result: 'draw',
      reason: 'stalemate',
      moveCount: 52,
    });
    assert.equal(afterSecond.user.stats.wins, 1);
    assert.equal(afterSecond.user.stats.draws, 1);
    assert.equal(afterSecond.user.stats.losses, 0);
    assert.equal(afterSecond.matches.length, 2);
    assert.equal(afterSecond.matches[0].mode, 'single');
    assert.equal(afterSecond.matches[1].mode, 'online');

    // Login merges newer guest progress monotonically
    const loginRes = store.loginUser({
      username: 'carobnjak_99',
      password: 'tajnalozinka',
      guestStats: { xp: 450 },
      guestAcademy: { strategy: ['strat-2'] },
    });
    assert.equal(loginRes.ok, true);
    assert.equal(loginRes.data.user.stats.xp, 450);
    assert.equal(loginRes.data.user.stats.level, 3);
    assert.deepEqual(loginRes.data.user.academyProgress.strategy, ['strat-2']);
    assert.deepEqual(loginRes.data.user.academyProgress.puzzles, ['puzzle-1']);

    // Logout revokes token
    store.logoutSession(reg.data.token);
    assert.equal(store.getSessionUser(reg.data.token), null);
  } finally {
    store.close();
  }
});

test('Local auth endpoints and React AccountModal UI are wired without Firebase', () => {
  const serverSrc = fs.readFileSync(path.join(ROOT, 'server.ts'), 'utf-8');
  const appTsx = fs.readFileSync(path.join(ROOT, 'src/App.tsx'), 'utf-8');
  const pkgJson = fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8');

  for (const endpoint of [
    '/api/auth/register',
    '/api/auth/login',
    '/api/auth/logout',
    '/api/auth/me',
    '/api/profile/display-name',
    '/api/profile/progress',
    '/api/profile/matches',
  ]) {
    assert.ok(serverSrc.includes(endpoint), `Missing auth endpoint ${endpoint} in server.ts`);
  }
  assert.ok(serverSrc.includes('recordCompletedOnlineRoom'), 'Server must record completed online matches');

  assert.ok(appTsx.includes('id="btn-account"'), 'App.tsx must include #btn-account button');
  assert.ok(appTsx.includes('<AccountModal'), 'App.tsx must render AccountModal');
  assert.ok(appTsx.includes('authService.recordSinglePlayerMatch'), 'App.tsx must record finished AI matches');
  assert.ok(!pkgJson.includes('firebase'), 'Firebase dependency must not be added');
});

test('2D board orientation renders White at bottom by default and rotates 180 degrees when flipped', async () => {
  const { createInitialChessState, get2DBoardOrientation } = await import('../src/shared/chessRules.ts');
  const board2dSrc = fs.readFileSync(path.join(ROOT, 'src/components/Classic2DBoard.tsx'), 'utf-8');
  assert.ok(board2dSrc.includes('get2DBoardOrientation(playerColor, flipped)'));

  const initial = createInitialChessState().board;
  const isLight = (r, c) => (r + c) % 2 === 0;

  // White default view (not flipped): top=r0 (Black), bottom=r7 (White), left=a (c0), right=h (c7)
  const whiteNormal = get2DBoardOrientation('w', false);
  assert.equal(whiteNormal.isViewFlipped, false);
  assert.deepEqual([...whiteNormal.rowIndices], [0, 1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual([...whiteNormal.colIndices], [0, 1, 2, 3, 4, 5, 6, 7]);
  // Bottom-right corner must be h1 (light square, White rook)
  assert.equal(isLight(whiteNormal.rowIndices[7], whiteNormal.colIndices[7]), true);
  assert.equal(initial[whiteNormal.rowIndices[7]][whiteNormal.colIndices[0]].color, 'w');
  assert.equal(initial[whiteNormal.rowIndices[0]][whiteNormal.colIndices[0]].color, 'b');

  // White flipped view ("Okreni"): 180deg rotation -> Black at bottom, h..a left-to-right, a8 (light) bottom-right
  const whiteFlipped = get2DBoardOrientation('w', true);
  assert.equal(whiteFlipped.isViewFlipped, true);
  assert.deepEqual([...whiteFlipped.rowIndices], [7, 6, 5, 4, 3, 2, 1, 0]);
  assert.deepEqual([...whiteFlipped.colIndices], [7, 6, 5, 4, 3, 2, 1, 0]);
  assert.equal(isLight(whiteFlipped.rowIndices[7], whiteFlipped.colIndices[7]), true);
  assert.equal(initial[whiteFlipped.rowIndices[7]][whiteFlipped.colIndices[0]].color, 'b');
  assert.equal(initial[whiteFlipped.rowIndices[0]][whiteFlipped.colIndices[0]].color, 'w');

  // Black default matches White flipped; Black flipped matches White default
  const blackNormal = get2DBoardOrientation('b', false);
  assert.deepEqual(blackNormal, whiteFlipped);
  const blackFlipped = get2DBoardOrientation('b', true);
  assert.deepEqual(blackFlipped, whiteNormal);
});

test('Gemini server proxy uses active low-latency model, User-Agent header, and request timeouts', () => {
  const serverSrc = fs.readFileSync(path.join(ROOT, 'server.ts'), 'utf-8');
  const geminiSrc = fs.readFileSync(path.join(ROOT, 'src/services/geminiService.ts'), 'utf-8');
  assert.ok(!serverSrc.includes('gemini-2.5-flash'), 'Deprecated gemini-2.5-flash model must not be used');
  assert.ok(serverSrc.includes("model: 'gemini-3.1-flash-lite'"), 'Server must use active low-latency gemini-3.1-flash-lite model');
  assert.ok(serverSrc.includes('ThinkingLevel.MINIMAL'), 'Server must configure minimal thinking latency for short commentary');
  assert.ok(serverSrc.includes('abortSignal: AbortSignal.timeout'), 'Server Gemini request must have an abort timeout');
  assert.ok(serverSrc.includes("errName === 'AbortError'"), 'Server Gemini proxy must handle AbortError gracefully without 502 error logs');
  assert.ok(serverSrc.includes("'User-Agent': 'aistudio-build'"), 'GoogleGenAI client must set User-Agent header');
  assert.ok(geminiSrc.includes('new AbortController()'), 'Client proxy must abort stalled requests so AI bubble never spins forever');
});

test('Stockfish 19 Lite WASM static assets exist and are non-empty', () => {
  const workerJs = path.join(ROOT, 'public/stockfish/stockfish-19-lite-single.js');
  const wasmBin = path.join(ROOT, 'public/stockfish/stockfish-19-lite-single.wasm');
  assert.ok(fs.existsSync(workerJs), 'Missing Stockfish single-threaded worker JS');
  assert.ok(fs.existsSync(wasmBin), 'Missing Stockfish single-threaded WASM binary');
  assert.ok(fs.statSync(workerJs).size > 5000, 'Stockfish worker JS is unexpectedly small');
  assert.ok(fs.statSync(wasmBin).size > 500000, 'Stockfish WASM binary is unexpectedly small');
});

test('Stockfish FEN serialization, UCI move parsing, ELO profiles, eval display, and blunder classification work', async () => {
  const {
    createInitialChessState,
    applyChessMove,
    coordsToSquare,
    squareToCoords,
    parseUciMove,
    boardToFen,
    getStockfishEloProfile,
    normalizeScoreToWhite,
    evalToDisplay,
    classifyPlayerMoveQuality,
  } = await import('../src/shared/chessRules.ts');

  assert.equal(coordsToSquare(6, 4), 'e2');
  assert.deepEqual(squareToCoords('e2'), { r: 6, c: 4 });
  assert.equal(coordsToSquare(0, 7), 'h8');

  const parsedPromo = parseUciMove('e7e8q');
  assert.deepEqual(parsedPromo, {
    uci: 'e7e8q',
    fromR: 1,
    fromC: 4,
    toR: 0,
    toC: 4,
    fromSquare: 'e7',
    toSquare: 'e8',
    promotion: 'queen',
  });
  assert.equal(parseUciMove('(none)'), null);

  let state = createInitialChessState();
  assert.equal(
    boardToFen(state.board, {
      currentTurn: state.currentTurn,
      enPassantTarget: state.enPassantTarget,
      halfMoveClock: 0,
      moveCount: 0,
    }),
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
  );

  // 1. e4 -> en passant target e3, black to move
  state = applyChessMove(state, 6, 4, 4, 4).state;
  assert.equal(
    boardToFen(state.board, {
      currentTurn: state.currentTurn,
      enPassantTarget: state.enPassantTarget,
      halfMoveClock: 0,
      moveCount: 1,
    }),
    'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1'
  );

  // Persona + 5-tier non-overlapping ELO scaling
  const b = getStockfishEloProfile('rival', 'beginner');
  const c = getStockfishEloProfile('mentor', 'casual');
  const i = getStockfishEloProfile('mentor', 'intermediate');
  const a = getStockfishEloProfile('roast', 'advanced');
  const m = getStockfishEloProfile('rival', 'master');
  assert.ok(b.uciElo < c.uciElo && c.uciElo < i.uciElo && i.uciElo < a.uciElo && a.uciElo < m.uciElo);
  assert.equal(b.mode, 'multipv');
  assert.equal(c.mode, 'multipv');
  assert.equal(i.mode, 'uci_elo');
  assert.equal(getStockfishEloProfile('mentor', 'easy').difficulty, 'beginner');
  assert.equal(getStockfishEloProfile('mentor', 'medium').difficulty, 'intermediate');
  assert.equal(getStockfishEloProfile('mentor', 'hard').difficulty, 'master');

  // Score normalization (Black +180 => White -180)
  const normBlackLead = normalizeScoreToWhite('cp', 180, 'b');
  assert.equal(normBlackLead.whiteCp, -180);
  assert.equal(normBlackLead.mateIn, null);
  const disp = evalToDisplay(normBlackLead);
  assert.equal(disp.label, '-1.8');
  assert.ok(disp.whitePercent < 50);

  // Blunder threshold (>= 200 cp drop from player's POV)
  const blunderRes = classifyPlayerMoveQuality(
    { whiteCp: 40, mateIn: null },
    { whiteCp: -210, mateIn: null },
    'w'
  );
  assert.equal(blunderRes.quality, 'blunder');
  assert.equal(blunderRes.cpLoss, 250);

  const blackGoodRes = classifyPlayerMoveQuality(
    { whiteCp: 60, mateIn: null },
    { whiteCp: 40, mateIn: null },
    'b'
  );
  assert.equal(blackGoodRes.quality, 'good');
  assert.equal(blackGoodRes.cpLoss, 0);
});

test('Stockfish WASM worker, blunder MP3 cue, hint highlights, and EvalBar fair-play guards are wired', () => {
  const sfService = fs.readFileSync(path.join(ROOT, 'src/services/stockfishService.ts'), 'utf-8');
  const voiceSrc = fs.readFileSync(path.join(ROOT, 'src/services/voiceService.ts'), 'utf-8');
  const geminiSrc = fs.readFileSync(path.join(ROOT, 'src/services/geminiService.ts'), 'utf-8');
  const evalBarSrc = fs.readFileSync(path.join(ROOT, 'src/components/EvalBar.tsx'), 'utf-8');
  const board2dSrc = fs.readFileSync(path.join(ROOT, 'src/components/Classic2DBoard.tsx'), 'utf-8');
  const engineSrc = fs.readFileSync(path.join(ROOT, 'src/wizardChessEngine.js'), 'utf-8');
  const appTsx = fs.readFileSync(path.join(ROOT, 'src/App.tsx'), 'utf-8');

  assert.ok(sfService.includes('/stockfish/stockfish-19-lite-single.js'));
  assert.ok(sfService.includes('UCI_LimitStrength'));
  assert.ok(sfService.includes('navigator.webdriver'));

  assert.ok(voiceSrc.includes('export type VoiceCue'));
  assert.ok(voiceSrc.includes('blunder_0.mp3') && voiceSrc.includes('blunder_1.mp3'));
  assert.ok(voiceSrc.includes('this.pickCueClip(personaId, voiceCue)'));

  assert.ok(geminiSrc.includes("detail.moveQuality === 'blunder'"));
  assert.ok(geminiSrc.includes('stockfishHint?: StockfishHintContext | null'));

  assert.ok(evalBarSrc.includes('transform: `scaleY(${scale})`'));
  assert.ok(board2dSrc.includes('<EvalBar'));
  assert.ok(board2dSrc.includes('square-hint-from'));
  assert.ok(board2dSrc.includes('chess-2d-btn-hint'));

  assert.ok(engineSrc.includes('stockfishService') && engineSrc.includes('chooseBotMove'));
  assert.ok(engineSrc.includes('function showHintHighlight(') && engineSrc.includes("new CustomEvent('wizardchess:hint'"));

  assert.ok(appTsx.includes('{!isOnlineMode && !academyVisible && !is2DMode && ('));
  assert.ok(appTsx.includes('classifyPlayerMoveQuality('));
  assert.ok(appTsx.includes("voiceCue = 'blunder'"));
  assert.ok(appTsx.includes('stockfishService.getHintMove('));
});

test('AI thinking indicator cannot get stuck across StrictMode remounts or stalled requests', () => {
  const sfService = fs.readFileSync(path.join(ROOT, 'src/services/stockfishService.ts'), 'utf-8');
  const geminiSrc = fs.readFileSync(path.join(ROOT, 'src/services/geminiService.ts'), 'utf-8');
  const appTsx = fs.readFileSync(path.join(ROOT, 'src/App.tsx'), 'utf-8');

  assert.ok(sfService.includes('initGeneration'), 'StockfishService must guard against stale init timers across StrictMode mounts');
  assert.ok(sfService.includes('clearTimeout(this.initTimer)'), 'StockfishService cleanup must clear pending init timers');
  assert.match(geminiSrc, /checkServerStatus[\s\S]*?new AbortController\(\)/, 'checkServerStatus must abort stalled requests');
  assert.match(appTsx, /if \(!isLoadingAI\) return;\s*const watchdog = setTimeout/, 'App must enforce a watchdog clearing isLoadingAI');
  assert.match(appTsx, /useEffect\(\(\) => \{\s*if \(!isOnlineMode\) \{\s*void stockfishService\.init\(\);/, 'Stockfish init must run on StrictMode remount');
});

test('parseFenPosition parses castling rights, en passant, turn, and all 30 3D Academy lessons execute 100% legal moves', async () => {
  const {
    DEFAULT_START_FEN,
    parseFenPosition,
    squareToCoords,
    applyChessMove,
    boardToFen,
  } = await import('../src/shared/chessRules.ts');
  const { CHESS_ACADEMY_LESSONS } = await import('../src/data/chessAcademyLessons.ts');

  const startState = parseFenPosition(DEFAULT_START_FEN);
  assert.ok(startState);
  assert.equal(startState.currentTurn, 'w');
  assert.equal(boardToFen(startState.board, { currentTurn: 'w', enPassantTarget: null, halfMoveClock: 0, moveCount: 0 }), DEFAULT_START_FEN);

  const customFen = '4k2r/8/8/3pP3/8/8/8/R3K3 w Qk d6 2 15';
  const customState = parseFenPosition(customFen);
  assert.ok(customState);
  assert.equal(customState.board[7][0]?.hasMoved, false, 'White a1 rook should be unmoved when Q castling right exists');
  assert.equal(customState.board[7][7], null);
  assert.equal(customState.board[0][0], null);
  assert.equal(customState.board[0][7]?.hasMoved, false, 'Black h8 rook should be unmoved when k castling right exists');
  assert.deepEqual(customState.enPassantTarget, { r: 2, c: 3, pawnR: 3, pawnC: 3, color: 'b' });

  assert.equal(CHESS_ACADEMY_LESSONS.length, 30, 'Academy 3D Mentor must contain exactly 30 lessons');
  assert.equal(new Set(CHESS_ACADEMY_LESSONS.map((l) => l.id)).size, 30, 'Lesson IDs must be unique');
  assert.equal(CHESS_ACADEMY_LESSONS.filter((l) => l.category === 'Otvaranje').length, 10);
  assert.equal(CHESS_ACADEMY_LESSONS.filter((l) => l.category === 'Odbrana').length, 10);
  assert.equal(CHESS_ACADEMY_LESSONS.filter((l) => l.category === 'Strategija').length, 5);
  assert.equal(CHESS_ACADEMY_LESSONS.filter((l) => l.category === 'Poznata partija').length, 5);

  for (const lesson of CHESS_ACADEMY_LESSONS) {
    let state = parseFenPosition(lesson.initialFen || DEFAULT_START_FEN);
    assert.ok(state, `Failed to parse initialFen for lesson ${lesson.id}`);
    assert.ok(lesson.steps.length >= 2, `Lesson ${lesson.id} must have at least 2 steps`);

    for (let i = 0; i < lesson.steps.length; i++) {
      const step = lesson.steps[i];
      const from = squareToCoords(step.from);
      const to = squareToCoords(step.to);
      assert.ok(from && to, `Invalid coordinates in ${lesson.id} step ${i + 1}: ${step.from}->${step.to}`);
      const res = applyChessMove(state, from.r, from.c, to.r, to.c, step.promotion);
      assert.equal(
        res.ok,
        true,
        `Illegal move in lesson ${lesson.id} step ${i + 1} (${step.moveNumber}: ${step.from}->${step.to}): ${res.reason || ''}`
      );
      state = res.state;
    }
  }
});

test('3D Mentor Tutorial wires engine FEN loading, animated steps, board lock, SFX, and Igraj odavde takeover', () => {
  const academySrc = fs.readFileSync(path.join(ROOT, 'src/components/Academy.tsx'), 'utf-8');
  const appTsx = fs.readFileSync(path.join(ROOT, 'src/App.tsx'), 'utf-8');
  const engineSrc = fs.readFileSync(path.join(ROOT, 'src/wizardChessEngine.js'), 'utf-8');
  const progressionSrc = fs.readFileSync(path.join(ROOT, 'src/services/academyProgression.ts'), 'utf-8');
  const cssSrc = fs.readFileSync(path.join(ROOT, 'src/styles.css'), 'utf-8');

  assert.ok(academySrc.includes('Interaktivni 3D Tutorijal (30 lekcija)'));
  assert.ok(academySrc.includes('id="academy-tutorial-controls"'));
  assert.ok(academySrc.includes('id="btn-academy-minimize"'));
  assert.ok(academySrc.includes('id="btn-tutorial-autoplay"'));
  assert.ok(academySrc.includes('id="btn-tutorial-prev-step"'));
  assert.ok(academySrc.includes('id="btn-tutorial-takeover"'));
  assert.ok(academySrc.includes('Igraj odavde'));
  assert.ok(academySrc.includes('id="btn-tutorial-next-step"'));
  assert.ok(academySrc.includes('id="btn-tutorial-reset"'));

  assert.ok(cssSrc.includes('.academy-tutorial-float'));
  assert.ok(cssSrc.includes('.academy-panel.minimized'));

  assert.ok(appTsx.includes('handlePrevTutorialStep'));
  assert.ok(appTsx.includes('handleToggleTutorialAutoPlay'));
  assert.ok(appTsx.includes('enterAcademyTutorial'));
  assert.ok(appTsx.includes('executeTutorialMove'));
  assert.ok(appTsx.includes('takeOverAcademyGame'));
  assert.ok(appTsx.includes('academyProgression.markTutorialCompleted'));

  assert.ok(engineSrc.includes('function enterAcademyTutorial('));
  assert.ok(engineSrc.includes('function setAcademyFenPosition('));
  assert.ok(engineSrc.includes('function executeTutorialMove('));
  assert.ok(engineSrc.includes('function takeOverAcademyGame('));
  assert.ok(engineSrc.includes('skipCaptureDuel = Boolean(options.tutorialStep || academyTutorialMode)'));
  assert.ok(engineSrc.includes('animateCaptureDuel = isCapture && !skipCaptureDuel'));
  assert.ok(engineSrc.includes('|| academyTutorialMode) return;'), '3D board clicks must be locked during tutorial playback');
  assert.ok(engineSrc.includes('tutorialStep: Boolean(options.tutorialStep)'));

  assert.ok(progressionSrc.includes('wizard_academy_tutorials_v1'));
  assert.ok(progressionSrc.includes('markTutorialCompleted('));
});

test('Central Park Zen mode builds procedural outdoor plaza, swaps stone board, silences hologram & voice, and exposes HUD toggle', () => {
  const parkEnvSrc = fs.readFileSync(path.join(ROOT, 'src/three/environments/outdoorParkEnv.ts'), 'utf-8');
  const engineSrc = fs.readFileSync(path.join(ROOT, 'src/wizardChessEngine.js'), 'utf-8');
  const voiceSrc = fs.readFileSync(path.join(ROOT, 'src/services/voiceService.ts'), 'utf-8');
  const bubbleSrc = fs.readFileSync(path.join(ROOT, 'src/components/AIBubble.tsx'), 'utf-8');
  const appTsx = fs.readFileSync(path.join(ROOT, 'src/App.tsx'), 'utf-8');

  assert.ok(parkEnvSrc.includes('export function createOutdoorParkEnvironment('));
  assert.ok(parkEnvSrc.includes('createCentralParkChessPedestal'));
  assert.ok(parkEnvSrc.includes('createCentralParkBench'));
  assert.ok(parkEnvSrc.includes('createCentralParkLamp'));
  assert.ok(parkEnvSrc.includes('createParkParasolSet'));
  assert.ok(parkEnvSrc.includes('createCentralParkTree'));
  assert.ok(parkEnvSrc.includes('createManhattanSkylineRing'));
  assert.ok(parkEnvSrc.includes('dispose: () =>'));

  assert.ok(engineSrc.includes('function setAmbienceMode(mode)'));
  assert.ok(engineSrc.includes('function syncOpponentHologramVisibility()'));
  assert.ok(engineSrc.includes("ambienceMode !== 'park'"));
  assert.ok(engineSrc.includes('0xeceef2') && engineSrc.includes('0x181b20'), 'Park mode must apply high-contrast stone square colors');
  assert.ok(engineSrc.includes('boardRimMat = goldTrimMat.clone()'), 'Board rim must use dedicated material so chess piece goldTrimMat stays untouched');
  assert.ok(engineSrc.includes('setAmbienceMode,') && engineSrc.includes('getAmbienceMode,'));

  assert.ok(voiceSrc.includes('setAmbienceMuted(muted: boolean)'));
  assert.ok(voiceSrc.includes('this.mutedByAmbience'));
  assert.ok(bubbleSrc.includes('zenMode?: boolean'));
  assert.ok(bubbleSrc.includes('Central Park · Zen tekstualni saveti'));

  assert.ok(appTsx.includes('wizard_chess_ambience'));
  assert.ok(appTsx.includes('id="btn-ambience-toggle"'));
  assert.ok(appTsx.includes('🌳 Park (Čista 3D tabla)'));
  assert.ok(appTsx.includes('🏛️ Katedrala (Duel)'));
  assert.ok(appTsx.includes("zenMode={ambience === 'park'}"));
});

test('.gitignore anchors root /data/ so src/data/chessAcademyLessons.ts is included in builds', () => {
  const gitignore = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf-8');
  const lines = gitignore.split(/\r?\n/).map((line) => line.trim());
  assert.ok(!lines.includes('data/'), '.gitignore must not use unanchored data/ which ignores src/data/');
  assert.ok(lines.includes('/data/'), '.gitignore should anchor /data/ to root SQLite directory');
  assert.ok(fs.existsSync(path.join(ROOT, 'src/data/chessAcademyLessons.ts')), 'src/data/chessAcademyLessons.ts must exist');
});

test('PGN service parses annotated PGNs with custom FEN, strips clock tags, reconstructs FEN, and exports round-trip PGN', async () => {
  const {
    stripPgnCommandTags,
    parsePgnToLesson,
    reconstructLessonFen,
    exportMovesToPgn,
  } = await import('../src/services/pgnService.ts');

  assert.equal(
    stripPgnCommandTags('Sjajan potez! {[%clk 0:09:58]} {[%eval 0.35]}'),
    'Sjajan potez! {} {}'
  );
  assert.equal(
    stripPgnCommandTags('Kontrola centra [%clk 0:09:58] [%eval +0.25]'),
    'Kontrola centra'
  );

  // Empty/invalid PGN throws localized error
  assert.throws(() => parsePgnToLesson('   '), /Unesi ili izaberi PGN/);
  assert.throws(() => parsePgnToLesson('not a valid chess move z9'), /Neispravan PGN/);

  // Annotated PGN with custom starting FEN, comment + [%clk], disambiguated knight move, and pawn promotion
  const customFen = 'k7/4P3/8/8/8/8/8/4K3 w - - 0 40';
  const promoPgn = [
    '[Event "Test Promocije"]',
    '[White "Carobnjak"]',
    '[Black "Alistair"]',
    '[Date "2026.11.22"]',
    '[Result "1-0"]',
    '[SetUp "1"]',
    `[FEN "${customFen}"]`,
    '',
    '40. e8=Q+ { Promocija uz šah! [%clk 0:04:12] } 1-0',
  ].join('\n');

  const promoLesson = parsePgnToLesson(promoPgn);
  assert.equal(promoLesson.category, 'Uvezene');
  assert.equal(promoLesson.isCustom, true);
  assert.equal(promoLesson.initialFen, customFen);
  assert.equal(promoLesson.steps.length, 1);
  assert.equal(promoLesson.steps[0].from, 'e7');
  assert.equal(promoLesson.steps[0].to, 'e8');
  assert.equal(promoLesson.steps[0].promotion, 'queen');
  assert.equal(promoLesson.steps[0].explanation, 'Promocija uz šah!');

  // Reconstruct FEN before and after step 1
  assert.equal(reconstructLessonFen(promoLesson, 0), customFen);
  assert.equal(reconstructLessonFen(promoLesson, 1), 'k3Q3/8/8/8/8/8/8/4K3 b - - 0 40');

  // Full game with SAN disambiguation (Nbd7)
  const disambigPgn = [
    '[Event "Philidor"]',
    '[ECO "C41"]',
    '[White "Beli"]',
    '[Black "Crni"]',
    '1. e4 e5 2. Nf3 d6 3. d4 Nf6 4. Nc3 Nbd7 *',
  ].join('\n');
  const philidor = parsePgnToLesson(disambigPgn);
  assert.equal(philidor.badge, 'C41');
  assert.equal(philidor.steps.length, 8);
  assert.equal(philidor.steps[7].from, 'b8');
  assert.equal(philidor.steps[7].to, 'd7');

  // Export round-trip from custom starting FEN (e.g., after Igraj odavde)
  const exported = exportMovesToPgn({
    startingFen: customFen,
    moves: [{ from: 'e7', to: 'e8', promotion: 'queen' }],
    result: '1-0',
    whiteName: 'Milan',
    blackName: 'Alistair (AI)',
  });
  assert.ok(exported.includes('[SetUp "1"]'));
  assert.ok(exported.includes(`[FEN "${customFen}"]`));
  assert.ok(exported.includes('e8=Q+'));
  assert.ok(exported.includes('[White "Milan"]'));
});

test('Lichess Masters Explorer service caches responses & master PGNs, computes top-3 W/D/L and topGames, and backs off 60s on HTTP 429', async () => {
  const {
    fetchLichessMasterStats,
    fetchLichessMasterGamePgn,
    __resetLichessExplorerForTests,
  } = await import('../src/services/lichessExplorerService.ts');

  __resetLichessExplorerForTests();

  let fetchCalls = 0;
  let now = 1_000_000;
  const mockOkFetch = async (url) => {
    fetchCalls += 1;
    if (String(url).includes('/masters/pgn/')) {
      return new Response('[Event "Master Game"]\n1. e4 e5 2. Nf3 Nc6 *', { status: 200 });
    }
    return new Response(
      JSON.stringify({
        white: 400,
        draws: 350,
        black: 250,
        opening: { eco: 'C50', name: 'Italian Game' },
        moves: [
          { uci: 'e2e4', san: 'e4', white: 200, draws: 150, black: 150 },
          { uci: 'd2d4', san: 'd4', white: 140, draws: 120, black: 40 },
          { uci: 'c2c4', san: 'c4', white: 40, draws: 50, black: 10 },
          { uci: 'g1f3', san: 'Nf3', white: 20, draws: 30, black: 50 },
        ],
        topGames: [
          {
            id: 'abc12345',
            winner: 'white',
            year: 2023,
            white: { name: 'Carlsen, M', rating: 2853 },
            black: { name: 'Caruana, F', rating: 2786 },
          },
        ],
      }),
      { status: 200 }
    );
  };

  const fen1 = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const res1 = await fetchLichessMasterStats(fen1, {
    fetchImpl: mockOkFetch,
    nowMs: () => now,
  });
  assert.equal(res1.status, 'ready');
  assert.equal(res1.eco, 'C50');
  assert.equal(res1.openingName, 'Italian Game');
  assert.equal(res1.topMoves.length, 3);
  assert.equal(res1.topMoves[0].san, 'e4');
  assert.equal(res1.topMoves[0].whitePct + res1.topMoves[0].drawPct + res1.topMoves[0].blackPct, 100);
  assert.equal(res1.topGames.length, 1);
  assert.equal(res1.topGames[0].id, 'abc12345');
  assert.equal(res1.topGames[0].whiteName, 'Carlsen, M');

  // Second query for same FEN hits cache without network call
  const res1Cached = await fetchLichessMasterStats(fen1, {
    fetchImpl: mockOkFetch,
    nowMs: () => now,
  });
  assert.equal(fetchCalls, 1);
  assert.equal(res1Cached.eco, 'C50');

  // Master game PGN fetch caches result across subsequent lookups
  const masterPgn1 = await fetchLichessMasterGamePgn('abc12345', {
    fetchImpl: mockOkFetch,
    nowMs: () => now,
  });
  assert.ok(masterPgn1.includes('1. e4 e5'));
  const masterPgn2 = await fetchLichessMasterGamePgn('abc12345', {
    fetchImpl: mockOkFetch,
    nowMs: () => now,
  });
  assert.equal(masterPgn2, masterPgn1);
  assert.equal(fetchCalls, 2);

  // Empty database position returns status: 'empty'
  const resEmpty = await fetchLichessMasterStats('8/8/8/8/8/8/8/K6k w - - 0 1', {
    fetchImpl: async () =>
      new Response(JSON.stringify({ white: 0, draws: 0, black: 0, moves: [] }), { status: 200 }),
    nowMs: () => now,
  });
  assert.equal(resEmpty.status, 'empty');

  // HTTP 429 triggers 60-second cooldown preventing further fetches
  let limitedCalls = 0;
  const mock429Fetch = async () => {
    limitedCalls += 1;
    return new Response('Too Many Requests', { status: 429 });
  };
  const fen2 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
  const limited = await fetchLichessMasterStats(fen2, {
    fetchImpl: mock429Fetch,
    nowMs: () => now,
  });
  assert.equal(limited.status, 'rate-limited');
  assert.equal(limitedCalls, 1);

  const fen3 = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
  const stillLimited = await fetchLichessMasterStats(fen3, {
    fetchImpl: mock429Fetch,
    nowMs: () => now + 30_000,
  });
  assert.equal(stillLimited.status, 'rate-limited');
  assert.equal(limitedCalls, 1, 'Rate-limit cooldown must avoid fetching before 60s expires');
});

test('Online chess import service parses URLs, falls back 404 Lichess IDs to Masters PGN, and parses Lichess NDJSON + Chess.com archives', async () => {
  const { __resetLichessExplorerForTests } = await import('../src/services/lichessExplorerService.ts');
  const {
    parseOnlineChessUrl,
    fetchPgnFromOnlineUrl,
    fetchLichessUserGames,
    fetchChessComUserGames,
  } = await import('../src/services/onlineChessImportService.ts');

  __resetLichessExplorerForTests();

  assert.deepEqual(parseOnlineChessUrl('https://lichess.org/30WVeXdd/black'), {
    kind: 'lichess-game',
    gameId: '30WVeXdd',
  });
  assert.deepEqual(parseOnlineChessUrl('https://lichess.org/study/AbCdEf12/GhIjKl34'), {
    kind: 'lichess-study-chapter',
    studyId: 'AbCdEf12',
    chapterId: 'GhIjKl34',
  });
  assert.deepEqual(parseOnlineChessUrl('https://lichess.org/study/AbCdEf12'), {
    kind: 'lichess-study',
    studyId: 'AbCdEf12',
  });
  assert.deepEqual(parseOnlineChessUrl('https://www.chess.com/game/live/123456'), {
    kind: 'chesscom-url',
  });

  // 404 on regular Lichess export falls back to Lichess Masters PGN endpoint
  const fallbackPgn = await fetchPgnFromOnlineUrl('https://lichess.org/mast1234', {
    fetchImpl: async (url) => {
      if (String(url).includes('/game/export/')) {
        return new Response('Not found', { status: 404 });
      }
      if (String(url).includes('/masters/pgn/mast1234')) {
        return new Response('[Event "Masters"]\n1. d4 Nf6 *', { status: 200 });
      }
      return new Response('Bad URL', { status: 500 });
    },
  });
  assert.ok(fallbackPgn.includes('1. d4 Nf6'));

  await assert.rejects(
    () => fetchPgnFromOnlineUrl('https://www.chess.com/game/live/123456'),
    /korisničko ime/i
  );

  // Lichess NDJSON games feed
  const lichessGames = await fetchLichessUserGames('DrNykterstein', {
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          id: 'gm1',
          winner: 'white',
          createdAt: 1700000000000,
          opening: { name: 'Sicilian Defense' },
          players: {
            white: { user: { name: 'DrNykterstein' }, rating: 2900 },
            black: { user: { name: 'Opponent' }, rating: 2750 },
          },
          pgn: '1. e4 c5 *',
        }) + '\n',
        { status: 200 }
      ),
  });
  assert.equal(lichessGames.length, 1);
  assert.equal(lichessGames[0].source, 'lichess');
  assert.equal(lichessGames[0].result, '1-0');
  assert.equal(lichessGames[0].openingName, 'Sicilian Defense');

  // Chess.com player monthly archive feed
  const chessComGames = await fetchChessComUserGames('Hikaru', {
    fetchImpl: async (url) => {
      if (String(url).endsWith('/games/archives')) {
        return new Response(
          JSON.stringify({ archives: ['https://api.chess.com/pub/player/hikaru/games/2026/11'] }),
          { status: 200 }
        );
      }
      return new Response(
        JSON.stringify({
          games: [
            {
              url: 'https://www.chess.com/game/live/99',
              rules: 'chess',
              end_time: 1700000000,
              white: { username: 'Hikaru', rating: 3250, result: 'win' },
              black: { username: 'DanielNaroditsky', rating: 3180, result: 'checkmated' },
              pgn: '[ECOUrl "https://www.chess.com/openings/Ruy-Lopez-Opening"]\n1. e4 e5 2. Nf3 Nc6 3. Bb5 *',
            },
          ],
        }),
        { status: 200 }
      );
    },
  });
  assert.equal(chessComGames.length, 1);
  assert.equal(chessComGames[0].source, 'chesscom');
  assert.equal(chessComGames[0].result, '1-0');
  assert.equal(chessComGames[0].openingName, 'Ruy Lopez Opening');
});

test('Academy PGN import/delete, online Lichess/Chess.com importer UI, engine getMoveHistory, and HUD/checkmate PGN export are wired', () => {
  const academySrc = fs.readFileSync(path.join(ROOT, 'src/components/Academy.tsx'), 'utf-8');
  const appTsx = fs.readFileSync(path.join(ROOT, 'src/App.tsx'), 'utf-8');
  const engineSrc = fs.readFileSync(path.join(ROOT, 'src/wizardChessEngine.js'), 'utf-8');

  assert.ok(academySrc.includes('id="btn-open-pgn-import"'));
  assert.ok(academySrc.includes('id="academy-pgn-importer"'));
  assert.ok(academySrc.includes('id="tab-import-masters"'));
  assert.ok(academySrc.includes('id="tab-import-online"'));
  assert.ok(academySrc.includes('id="tab-import-file"'));
  assert.ok(academySrc.includes('id="select-masters-preset"'));
  assert.ok(academySrc.includes('id="input-online-pgn-url"'));
  assert.ok(academySrc.includes('id="btn-fetch-online-url"'));
  assert.ok(academySrc.includes('id="input-online-username"'));
  assert.ok(academySrc.includes('id="btn-fetch-player-games"'));
  assert.ok(academySrc.includes('id="input-pgn-file"'));
  assert.ok(academySrc.includes('id="textarea-pgn-input"'));
  assert.ok(academySrc.includes('id="btn-submit-pgn-import"'));
  assert.ok(academySrc.includes('id="btn-delete-custom-pgn"'));
  assert.ok(academySrc.includes('id="academy-lichess-box"'));
  assert.ok(academySrc.includes('fetchLichessMasterStats('));
  assert.ok(academySrc.includes('fetchLichessMasterGamePgn('));

  assert.ok(appTsx.includes('id="btn-export-pgn"'));
  assert.ok(appTsx.includes('id="btn-checkmate-export-pgn"'));
  assert.ok(appTsx.includes('exportMovesToPgn('));
  assert.ok(appTsx.includes('downloadPgnFile('));
  assert.ok(appTsx.includes('parsePgnToLesson('));

  assert.ok(engineSrc.includes('function getMoveHistory()'));
  assert.ok(engineSrc.includes('gameStartingFen = getFen()'));
  assert.ok(engineSrc.includes('getMoveHistory,'));
});

test('Guided Mode (Vođeni režim) wires auto-recommendation triggers, localStorage persistence, engine fallback, and HUD/2D toggles', () => {
  const appTsx = fs.readFileSync(path.join(ROOT, 'src/App.tsx'), 'utf-8');
  const bubbleTsx = fs.readFileSync(path.join(ROOT, 'src/components/AIBubble.tsx'), 'utf-8');
  const board2dTsx = fs.readFileSync(path.join(ROOT, 'src/components/Classic2DBoard.tsx'), 'utf-8');
  const engineSrc = fs.readFileSync(path.join(ROOT, 'src/wizardChessEngine.js'), 'utf-8');
  const cssSrc = fs.readFileSync(path.join(ROOT, 'src/styles.css'), 'utf-8');

  assert.ok(appTsx.includes("localStorage.getItem('wizard_chess_guided_mode')"));
  assert.ok(appTsx.includes('handleToggleGuidedMode'));
  assert.ok(appTsx.includes('runMoveHint('));
  assert.ok(appTsx.includes('id="btn-guided-mode"'));
  assert.ok(appTsx.includes('guidedMode={guidedMode}'));
  assert.ok(appTsx.includes('onToggleGuidedMode={handleToggleGuidedMode}'));

  assert.ok(!bubbleTsx.includes('id="btn-bubble-guided"'), 'AIBubble keeps only Zen/Voice and Savet actions');
  assert.ok(bubbleTsx.includes('guidedMode = false'));

  assert.ok(board2dTsx.includes('id="btn-2d-guided"'));
  assert.ok(board2dTsx.includes('getHintHighlight'));

  assert.ok(engineSrc.includes('function getFallbackBestMove()'));
  assert.ok(engineSrc.includes('getHintHighlight:'));
  assert.ok(engineSrc.includes('getFallbackBestMove,'));

  assert.ok(cssSrc.includes('#hud-dock .hud-btn.guided-active'));
  assert.ok(cssSrc.includes('.chess-2d-btn-guided.active'));
});

test('Game Brief service builds local overview, caches Gemini brief persistently without regenerating, and wires modal UI', async () => {
  const { parsePgnToLesson } = await import('../src/services/pgnService.ts');
  const {
    buildLocalGameBrief,
    getOrCreateGameBrief,
    getAutoOpenBriefPreference,
    setAutoOpenBriefPreference,
    __resetGameBriefCacheForTests,
  } = await import('../src/services/gameBriefService.ts');

  __resetGameBriefCacheForTests();

  const samplePgn = `[Event "Opera House"]
[Site "Paris"]
[Date "1858.11.02"]
[White "Paul Morphy"]
[Black "Duke Karl"]
[WhiteElo "2690"]
[BlackElo "2100"]
[ECO "C41"]
[Opening "Philidor Defense"]
[Result "1-0"]

1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0`;

  const lesson = parsePgnToLesson(samplePgn);
  assert.equal(lesson.gameInfo?.white, 'Paul Morphy');
  assert.equal(lesson.gameInfo?.black, 'Duke Karl');
  assert.equal(lesson.gameInfo?.whiteElo, '2690');
  assert.equal(lesson.gameInfo?.eco, 'C41');
  assert.equal(lesson.gameInfo?.opening, 'Philidor Defense');

  const localBrief = buildLocalGameBrief(lesson);
  assert.equal(localBrief.source, 'local');
  assert.ok(localBrief.playersLine.includes('Paul Morphy (2690)'));
  assert.ok(localBrief.openingLine.includes('C41'));
  assert.ok(localBrief.keyMoments.some((m) => m.includes('17. Rd8#')));

  const storageMap = new Map();
  const mockStorage = {
    getItem: (k) => (storageMap.has(k) ? storageMap.get(k) : null),
    setItem: (k, v) => storageMap.set(k, v),
  };

  let geminiCalls = 0;
  const mockGenerate = async () => {
    geminiCalls += 1;
    return JSON.stringify({
      contextLine: 'Čuvena partija iz Pariza 1858. godine u operskoj loži.',
      openingLine: 'Filidorova odbrana (C41) — rani razvoj za brzu inicijativu.',
      strategySummary: 'Morfi žrtvuje materijal za brzi razvoj i otvaranje linija ka kralju.',
      keyMoments: ['10. Nxb5 — Žrtva skakača za otvaranje d-linije', '17. Rd8# — Odlučujući mat'],
    });
  };

  const first = await getOrCreateGameBrief(lesson, {
    storage: mockStorage,
    checkGeminiConfigured: async () => true,
    generateGeminiJson: mockGenerate,
  });
  assert.equal(first.fromCache, false);
  assert.equal(first.brief.source, 'gemini');
  assert.equal(geminiCalls, 1);

  // Clear in-memory cache and re-import the same PGN — must hit persistent storage and never re-call Gemini
  __resetGameBriefCacheForTests();
  const reimportedLesson = parsePgnToLesson(samplePgn);
  const second = await getOrCreateGameBrief(reimportedLesson, {
    storage: mockStorage,
    checkGeminiConfigured: async () => true,
    generateGeminiJson: mockGenerate,
  });
  assert.equal(second.fromCache, true);
  assert.equal(second.brief.source, 'gemini');
  assert.equal(geminiCalls, 1, 'Cached brief must not trigger a second Gemini call');

  assert.equal(getAutoOpenBriefPreference(mockStorage), true);
  setAutoOpenBriefPreference(false, mockStorage);
  assert.equal(getAutoOpenBriefPreference(mockStorage), false);

  const academySrc = fs.readFileSync(path.join(ROOT, 'src/components/Academy.tsx'), 'utf-8');
  const appTsx = fs.readFileSync(path.join(ROOT, 'src/App.tsx'), 'utf-8');
  const serverSrc = fs.readFileSync(path.join(ROOT, 'server.ts'), 'utf-8');

  assert.ok(academySrc.includes('id="academy-game-brief-modal"'));
  assert.ok(academySrc.includes('id="btn-tutorial-brief"'));
  assert.ok(academySrc.includes('id="btn-brief-play"'));
  assert.ok(appTsx.includes('handleStartTutorialAutoPlay'));
  assert.ok(appTsx.includes('handleCacheLessonBrief'));
  assert.ok(serverSrc.includes('maxOutputTokens'));
});

test('validateAndNormalizeFen validates kings, pawn ranks, opponent-in-check, and normalizes FEN turn overrides', async () => {
  const { validateAndNormalizeFen } = await import('../src/shared/chessRules.ts');

  const validRes = validateAndNormalizeFen('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1');
  assert.equal(validRes.ok, true);
  assert.equal(validRes.state?.currentTurn, 'b');

  // Partial placement + turn override works cleanly
  const overrideRes = validateAndNormalizeFen('4k3/8/8/8/8/8/4P3/4K3 b - - 0 1', 'w');
  assert.equal(overrideRes.ok, true);
  assert.ok(overrideRes.fen?.includes(' w '));

  // Missing black king must be rejected
  const missingKing = validateAndNormalizeFen('8/8/8/8/8/8/4P3/4K3 w - - 0 1');
  assert.equal(missingKing.ok, false);

  // Pawn on 8th rank must be rejected
  const badPawn = validateAndNormalizeFen('4k2P/8/8/8/8/8/8/4K3 w - - 0 1');
  assert.equal(badPawn.ok, false);

  // Opponent king already in check while not on move must be rejected
  const illegalCheck = validateAndNormalizeFen('4k3/4Q3/8/8/8/8/8/4K3 w - - 0 1');
  assert.equal(illegalCheck.ok, false);
  assert.equal(illegalCheck.opponentInCheck, true);
});

test('Analysis Mode wires dual-side 2D/3D play, 1-ply undo, XP isolation, FEN loading, and Gemini Image-to-FEN', async () => {
  const engineSrc = fs.readFileSync(path.join(ROOT, 'src/wizardChessEngine.js'), 'utf-8');
  const board2dSrc = fs.readFileSync(path.join(ROOT, 'src/components/Classic2DBoard.tsx'), 'utf-8');
  const panelSrc = fs.readFileSync(path.join(ROOT, 'src/components/AnalysisPanel.tsx'), 'utf-8');
  const appSrc = fs.readFileSync(path.join(ROOT, 'src/App.tsx'), 'utf-8');
  const serverSrc = fs.readFileSync(path.join(ROOT, 'server.ts'), 'utf-8');

  // Engine hooks
  assert.ok(engineSrc.includes('function setAnalysisMode(enabled)'));
  assert.ok(engineSrc.includes('function loadCustomFenPosition(fen, options = {})'));
  assert.ok(engineSrc.includes('if (gameMode === \'single\' && !analysisMode)'));
  assert.ok(engineSrc.includes('Boolean(options.tutorialStep || academyTutorialMode) || analysisMode'));
  assert.ok(engineSrc.includes('!is2DModeActive && !academyMode && !analysisMode'));
  assert.ok(engineSrc.includes('if (!academyMode && !analysisMode && currentTurn !== playerColor) return;'));
  assert.ok(engineSrc.includes('setAnalysisMode,'));
  assert.ok(engineSrc.includes('loadCustomFenPosition,'));

  // 2D & UI hooks
  assert.ok(board2dSrc.includes('isAnalysisMode = false'));
  assert.ok(board2dSrc.includes('id="btn-2d-analysis"'));
  assert.ok(panelSrc.includes('id="analysis-fen-input"'));
  assert.ok(panelSrc.includes('id="btn-analysis-upload-image"'));
  assert.ok(panelSrc.includes('id="btn-analysis-track-both"'));
  assert.ok(appSrc.includes('id="btn-analysis-mode"'));
  assert.ok(appSrc.includes('if (!analysisModeRef.current) {'));
  assert.ok(appSrc.includes('!analysisModeRef.current'));
  assert.ok(appSrc.includes('isSideTrackedForHint('));

  // Server Gemini 4 Flash multimodal endpoint
  assert.ok(serverSrc.includes("app.post('/api/gemini/board-from-image'"));
  assert.ok(serverSrc.includes("model: 'gemini-4-hydrogen'"));
  assert.ok(serverSrc.includes('thinkingLevel: ThinkingLevel.LOW'));
  assert.ok(serverSrc.includes('type: Type.OBJECT'));
  assert.ok(serverSrc.includes('validateAndNormalizeFen(rawFen'));

  // Client geminiService.extractFenFromBoardImage
  const { geminiService } = await import('../src/services/geminiService.ts');
  const okResult = await geminiService.extractFenFromBoardImage(
    { imageBase64: 'ZmFrZQ==', mimeType: 'image/png', turnHint: 'auto', perspectiveHint: 'auto' },
    async () =>
      new Response(
        JSON.stringify({
          ok: true,
          configured: true,
          fen: '4k3/8/8/8/8/8/4Q3/4K3 w - - 0 1',
          turn: 'w',
          perspective: 'w',
          confidence: 'high',
          notes: 'Pozicija prepoznata.',
        }),
        { status: 200 }
      )
  );
  assert.equal(okResult.ok, true);
  assert.equal(okResult.fen, '4k3/8/8/8/8/8/4Q3/4K3 w - - 0 1');
  assert.equal(okResult.confidence, 'high');

  const errResult = await geminiService.extractFenFromBoardImage(
    { imageBase64: 'ZmFrZQ==', mimeType: 'image/jpeg' },
    async () =>
      new Response(
        JSON.stringify({ ok: false, error: 'Slika nije jasna.' }),
        { status: 422 }
      )
  );
  assert.equal(errResult.ok, false);
  assert.equal(errResult.error, 'Slika nije jasna.');
});

test('Board Editor builds valid FEN, strips impossible castling rights, and wires auto move recommendation', async () => {
  const { buildFenFromEditorBoard } = await import('../src/shared/chessRules.ts');

  const emptyGrid = () => Array.from({ length: 8 }, () => Array(8).fill(null));

  // Valid endgame with kings on home squares + white rook on h1 -> K allowed, Q/k/q stripped
  const g1 = emptyGrid();
  g1[7][4] = { type: 'king', color: 'w' };
  g1[7][7] = { type: 'rook', color: 'w' };
  g1[0][4] = { type: 'king', color: 'b' };
  g1[4][3] = { type: 'queen', color: 'b' };
  const res1 = buildFenFromEditorBoard(g1, {
    turn: 'b',
    castling: { K: true, Q: true, k: true, q: true },
  });
  assert.equal(res1.ok, true);
  assert.equal(res1.fen, '4k3/8/8/8/3q4/8/8/4K2R b K - 0 1');

  // Invalid setup: missing black king
  const g2 = emptyGrid();
  g2[7][4] = { type: 'king', color: 'w' };
  const res2 = buildFenFromEditorBoard(g2, { turn: 'w' });
  assert.equal(res2.ok, false);

  // Invalid setup: opponent king already in check
  const g3 = emptyGrid();
  g3[7][4] = { type: 'king', color: 'w' };
  g3[0][4] = { type: 'king', color: 'b' };
  g3[2][4] = { type: 'rook', color: 'w' };
  const res3 = buildFenFromEditorBoard(g3, { turn: 'w' });
  assert.equal(res3.ok, false);
  assert.equal(res3.opponentInCheck, true);

  // Verify wiring in AnalysisPanel, Classic2DBoard, and App
  const panelSrc = fs.readFileSync(path.join(ROOT, 'src/components/AnalysisPanel.tsx'), 'utf-8');
  const board2dSrc = fs.readFileSync(path.join(ROOT, 'src/components/Classic2DBoard.tsx'), 'utf-8');
  const appSrc = fs.readFileSync(path.join(ROOT, 'src/App.tsx'), 'utf-8');

  assert.ok(panelSrc.includes('id="btn-analysis-edit-board"'));
  assert.ok(board2dSrc.includes('id="board-editor-panel"'));
  assert.ok(board2dSrc.includes('id="btn-editor-apply"'));
  assert.ok(board2dSrc.includes('if (gameOver || currentTurn !== playerColor) return;'));
  assert.ok(appSrc.includes('handleApplyEditedPosition'));
  assert.ok(appSrc.includes('handleOpenBoardEditor'));
  assert.ok(appSrc.includes('isBoardEditorOpen'));
});

test('HUD reorganization places 2D toggle in brand pill, Online next to Account in #hud-right, and Piece Set dropdown in Podešavanja', () => {
  const appSrc = fs.readFileSync(path.join(ROOT, 'src/App.tsx'), 'utf-8');
  const cssSrc = fs.readFileSync(path.join(ROOT, 'src/styles.css'), 'utf-8');

  // 1. Standalone 2D toggle inside brand-pill in #hud-left (no redundant 3D button in 3D HUD)
  assert.match(
    appSrc,
    /<div className="brand-pill">[\s\S]*?<span className="brand-title">Wizard Chess 3D<\/span>[\s\S]*?id="btn-toggle-2d"[\s\S]*?<\/div>/
  );
  assert.ok(!appSrc.includes('id="btn-view-3d"'));
  // 2. Online paired with Account inside #hud-right
  assert.match(
    appSrc,
    /id="hud-right"[\s\S]*?className="hud-account-online-group"[\s\S]*?id="btn-account"[\s\S]*?id="btn-online-duel"/
  );
  // 3. Piece Set dropdown popover with all 7 sets
  assert.ok(appSrc.includes('id="piece-set-menu"'));
  for (const setId of ['klasicni', 'wizard', 'ancient', 'dragon', 'medieval', 'vitez', 'srpski']) {
    assert.ok(appSrc.includes(`id={\`btn-piece-set-\${setId}\`}`) || appSrc.includes(`btn-piece-set-`));
    assert.ok(appSrc.includes(`${setId}:`), `Piece set metadata must include ${setId}`);
  }
  // 4. Clean 3-mode dock-modes capsule and ambience moved to dock-settings
  assert.match(
    appSrc,
    /className="dock-capsule dock-modes"[\s\S]*?id="btn-academy"[\s\S]*?id="btn-analysis-mode"[\s\S]*?id="btn-guided-mode"[\s\S]*?className=\{`dock-capsule dock-game/
  );
  assert.match(
    appSrc,
    /className="dock-capsule dock-settings"[\s\S]*?id="btn-piece-set"[\s\S]*?id="btn-ai-difficulty"[\s\S]*?id="btn-ambience-toggle"/
  );
  assert.ok(cssSrc.includes('.brand-view-btn'));
  assert.ok(cssSrc.includes('.hud-account-online-group'));
  assert.ok(cssSrc.includes('.piece-set-popover'));
});
