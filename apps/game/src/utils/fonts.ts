/**
 * The game's display font. Concert One has no ğ Ğ İ ş Ş, so "Sozler Turkish" follows it with
 * just those letters, drawn from Concert One's own outlines. The browser falls
 * back per letter, so the rest of the text never touches the second font.
 */
export const DISPLAY_FONT_FAMILY = ['Concert One', 'Sozler Turkish'];
