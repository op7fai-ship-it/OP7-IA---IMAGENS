export type AdSize = '1080x1350' | '1080x1920' | '1080x1080';

export type LayerType = 'text' | 'image' | 'shape' | 'button';
export type FontFamily = 'Montserrat' | 'Bebas Neue' | 'Inter' | 'Outfit' | 'Playfair Display';
export type TextAlign = 'left' | 'center' | 'right';
export type ToneType = 'Premium' | 'Direto' | 'Urgente' | 'Elegante';
export type BackgroundStyle = 'Clean' | 'Tech' | 'Clínica' | 'Urbano' | 'Minimalista';

export interface Position {
  x: number; // percentage 0-100
  y: number; // percentage 0-100
}

export interface Size {
  width: number; // percentage of container width
  height: number; // percentage of container height
}

export interface LayerStyle {
  color?: string;
  backgroundColor?: string;
  fontSize?: number; // rem
  fontWeight?: string;
  fontFamily?: FontFamily;
  textAlign?: TextAlign;
  opacity?: number;
  borderRadius?: number;
  padding?: number;
  boxShadow?: string;
  letterSpacing?: string;
  lineHeight?: number;
  textTransform?: 'uppercase' | 'none' | 'capitalize';
  rotate?: number;
}

export interface Layer {
  id: string;
  type: LayerType;
  name: string;
  content: string; // text content or image src
  position: Position;
  size: Size;
  style: LayerStyle;
  visible: boolean;
  locked: boolean;
}

export interface ColorPalette {
  primary: string;
  secondary: string;
  background: string;
  text: string;
  accent: string;
  gradientEnabled: boolean;
  gradientStart: string;
  gradientEnd: string;
}

export interface DesignConfig {
  size: AdSize;
  backgroundColor: string;
  backgroundImage: string | null;
  overlayOpacity: number;
  overlayColor: string;
  palette?: ColorPalette; // Added palette to the saved config state
  layers: Layer[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  images?: string[];
  timestamp: number;
}

export interface ImageReference {
  name: string;
  type: string;
  data: string; // base64
}

export interface GenerationOptions {
  format?: AdSize;
  language?: string;
  tone?: ToneType;
  backgroundStyle?: BackgroundStyle;
  palette?: ColorPalette;
  useReferences?: boolean;
  references?: ImageReference[];
  conversationId?: string | null;
  userId?: string;
}

export interface GenerationProgress {
  step: string;
  percentage: number;
}

export enum GenerationStatus {
  IDLE = 'IDLE',
  INTERPRETING = 'INTERPRETING',
  GENERATING_TEXT = 'GENERATING_TEXT',
  GENERATING_ART = 'GENERATING_ART',
  ASSEMBLING = 'ASSEMBLING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export interface ProjectVersion {
  id: string;
  timestamp: number;
  config: DesignConfig;
}