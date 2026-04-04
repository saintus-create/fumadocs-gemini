import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-6 px-6 py-16">
      <div>
        <p className="text-sm font-medium text-default-500">Fumadocs + Studio</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">Docs, coding workspace, and assistant in one repo.</h1>
      </div>
      <div className="flex flex-wrap gap-4 text-sm">
        <Link href="/studio" className="rounded-lg border px-4 py-2 font-medium">
          Open /studio
        </Link>
        <Link href="/docs" className="rounded-lg border px-4 py-2 font-medium">
          Open /docs
        </Link>
      </div>
    </div>
  );
}
