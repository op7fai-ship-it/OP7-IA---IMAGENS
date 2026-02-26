export type AdSize = '1080x1350' | '1080x1920';

export interface AdContent {
  headline: string;
  tagline: string;
  cta: string;
}

export type FontFamily = 'Montserrat' | 'Bebas Neue';
export type TextAlign = 'left' | 'center' | 'right';

export interface Position {
  x: number; // percentage 0-100
  y: number; // percentage 0-100
}

export interface DesignConfig {
  size: AdSize;
  backgroundImage: string | null;
  referenceImage: string | null;
  logoImage: string | null;
  overlayOpacity: number;

  // Base scales for resizing (percentage of container width)
  headlineScale: number;
  taglineScale: number;
  ctaScale: number;

  // Card customization
  cardOpacity: number;
  cardColor: string;

  // Headline
  headlineColor: string;
  headlineBgColor: string;
  headlineFont: FontFamily;
  headlineAlign: TextAlign;
  headlinePos: Position;
  headlineWeight: string;

  // Tagline
  taglineColor: string;
  taglineFont: FontFamily;
  taglineAlign: TextAlign;
  taglinePos: Position;
  taglineWeight: string;

  // CTA
  ctaColor: string;
  ctaBgColor: string;
  ctaFont: FontFamily;
  ctaAlign: TextAlign;
  ctaPos: Position;
  ctaWeight: string;
}

export enum GenerationStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}