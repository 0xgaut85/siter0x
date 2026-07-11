const colors = {
    white: '#FFFFFF',
    black: '#000000',
    turquoise: '#0d0d0d',
    lightGray: '#c3c6ca',
    darkGray: '#86898d',
    blue: '#0000a3',
    darkBlue: '#0000aa',
    red: '#ff0000',
    orange: '#CEF506',
    charcoal: '#1a1a1a',
    mediumGray: '#4D4D4D',
} as const;

export type ColorName = keyof typeof colors;
export type ThemeColor = typeof colors[ColorName];

export default colors;
