import { Link } from 'react-router';

export default function Home() {
  return (
    <div className="flex max-w-md min-w-0 flex-col gap-4 text-sm leading-loose">
      <div>
        <h1 className="font-medium">Project ready!</h1>
        <p>You may now add components and start building.</p>
      </div>
      <nav className="flex flex-col gap-1">
        <Link className="underline underline-offset-4 hover:text-foreground/80" to="/login">
          Login
        </Link>
        <Link className="underline underline-offset-4 hover:text-foreground/80" to="/sortable">
          Sortable Cards Demo
        </Link>
        <Link className="underline underline-offset-4 hover:text-foreground/80" to="/profile">
          Profile Demo
        </Link>
      </nav>
    </div>
  );
}
