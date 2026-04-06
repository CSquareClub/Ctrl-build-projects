import { Container } from '../ui/Container'

export function Footer() {
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--bg-elev)] py-8">
      <Container className="flex flex-col items-center justify-between gap-4 text-sm text-[var(--muted)] sm:flex-row">
        <p className="text-sm text-[var(--muted)]">© {new Date().getFullYear()} FocusRoom. Designed for serious focus.</p>
        <nav className="flex items-center gap-5">
          <a href="https://github.com" target="_blank" rel="noreferrer" className="transition-colors hover:text-[var(--accent)]">
            GitHub
          </a>
          <a href="#" className="transition-colors hover:text-[var(--accent)]">
            Contact
          </a>
          <a href="#" className="transition-colors hover:text-[var(--accent)]">
            About
          </a>
        </nav>
      </Container>
    </footer>
  )
}
