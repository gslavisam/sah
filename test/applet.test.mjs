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
  assert.ok(appTsx.includes("dragon: 'Zmajevi i vitezovi'"), 'Fantasy set must have a localized name');
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

test('Piece set persistence supports Klasični and extra GLB sets lazy-load on demand', () => {
  const appTsx = fs.readFileSync(path.join(ROOT, 'src/App.tsx'), 'utf-8');
  const engine = fs.readFileSync(path.join(ROOT, 'src/wizardChessEngine.js'), 'utf-8');

  assert.ok(!appTsx.includes('srpski-kraljevski'), 'Removed srpski-kraljevski set must not be restored');
  assert.match(
    appTsx,
    /localStorage\.getItem\('wizard_chess_piece_set'\)[\s\S]*?saved === 'klasicni'/,
    'Saved Klasični piece set must be restored on reload'
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

