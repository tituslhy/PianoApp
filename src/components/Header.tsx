import { ThemeToggle } from './ThemeToggle';

/**
 * App header with title, theme toggle, and short instructions.
 * @returns Header banner for the piano app.
 */
export function Header() {
  return (
    <header className="relative w-full max-w-2xl text-center">
      <div className="absolute right-0 top-0">
        <ThemeToggle />
      </div>
      <h1 className="bg-gradient-to-r from-indigo-400 via-violet-300 to-indigo-400 bg-clip-text text-4xl font-bold tracking-tight text-transparent light:from-indigo-600 light:via-violet-600 light:to-indigo-600">
        Piano
      </h1>
      <p className="mt-2 text-sm text-piano-text-muted sm:text-base">
        Play with your keyboard or tap the keys. Select a song for follow-along mode.
      </p>
    </header>
  );
}
