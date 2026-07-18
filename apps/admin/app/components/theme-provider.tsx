import { ThemeProvider as NextThemesProvider, useTheme } from 'next-themes';

export { useTheme };

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
