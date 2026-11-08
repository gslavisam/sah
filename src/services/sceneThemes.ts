import type { PersonaId } from './geminiService';

export type SceneThemeId = PersonaId;

export interface SceneTheme {
  name: string;
  background: number;
  fog: number;
  fogDensity: number;
  hemisphereSky: number;
  hemisphereGround: number;
  hemisphereIntensity: number;
  keyLight: number;
  keyIntensity: number;
  rimLight: number;
  rimIntensity: number;
  fillLight: number;
  fillIntensity: number;
  brazierLight: number;
  brazierIntensity: number;
  stoneTint: number;
  wallTint: number;
  floorTint: number;
}

export const SCENE_THEMES: Record<SceneThemeId, SceneTheme> = {
  mentor: {
    name: 'Akademija zvezdanih mapa',
    background: 0x10182b,
    fog: 0x10182b,
    fogDensity: 0.012,
    hemisphereSky: 0xb8c9ef,
    hemisphereGround: 0x302b3c,
    hemisphereIntensity: 0.72,
    keyLight: 0xc2d5ff,
    keyIntensity: 2.4,
    rimLight: 0x829dd8,
    rimIntensity: 0.92,
    fillLight: 0xffe6bb,
    fillIntensity: 0.4,
    brazierLight: 0xffcc75,
    brazierIntensity: 2.2,
    stoneTint: 0xe7eeff,
    wallTint: 0x293653,
    floorTint: 0x4a4556,
  },
  roast: {
    name: 'Goblinska radionica',
    background: 0x17231d,
    fog: 0x17231d,
    fogDensity: 0.018,
    hemisphereSky: 0xa2b681,
    hemisphereGround: 0x30251a,
    hemisphereIntensity: 0.7,
    keyLight: 0xffc477,
    keyIntensity: 2.3,
    rimLight: 0x9caf76,
    rimIntensity: 0.82,
    fillLight: 0xe8863a,
    fillIntensity: 0.62,
    brazierLight: 0xff7838,
    brazierIntensity: 4.1,
    stoneTint: 0xffe6c6,
    wallTint: 0x2d3b2b,
    floorTint: 0x4b4534,
  },
  rival: {
    name: 'Dvorana izazova',
    background: 0x18202d,
    fog: 0x18202d,
    fogDensity: 0.014,
    hemisphereSky: 0xb0bad3,
    hemisphereGround: 0x252331,
    hemisphereIntensity: 0.66,
    keyLight: 0xd8d9f2,
    keyIntensity: 2.5,
    rimLight: 0x9176cb,
    rimIntensity: 1.05,
    fillLight: 0x9eabd4,
    fillIntensity: 0.46,
    brazierLight: 0x9c75e8,
    brazierIntensity: 1.65,
    stoneTint: 0xe3dcff,
    wallTint: 0x303246,
    floorTint: 0x494353,
  },
};
