import { useColorScheme } from 'react-native';

const light = {
  bg: '#F6F5F1',
  card: '#FFFFFF',
  text: '#1B1B1A',
  muted: '#62615C',
  border: '#DEDCD5',
  accent: '#1F6F4A',
  accentText: '#FFFFFF',
  track: '#E7E5DE',
  done: '#B3261E',
  doneBg: '#FCEDEB',
  chip: '#ECEAE3',
};

export type Palette = typeof light;

const dark: Palette = {
  bg: '#121211',
  card: '#1E1E1C',
  text: '#F1F0EC',
  muted: '#A8A69F',
  border: '#34332F',
  accent: '#5CC593',
  accentText: '#0D2419',
  track: '#2C2B28',
  done: '#FF8A80',
  doneBg: '#3A1D1A',
  chip: '#2A2926',
};

export function usePalette(): Palette {
  return useColorScheme() === 'dark' ? dark : light;
}
