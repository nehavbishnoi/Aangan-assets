import { useAuth } from '@/lib/auth';

export default function SettingsPage() {
  const { user, family } = useAuth();
  return (
    <div data-testid="settings-page" className="max-w-[820px]">
      <p className="eyebrow">Settings</p>
      <h1 className="font-serif text-5xl mt-3">A few quiet things.</h1>

      <section className="mt-10">
        <h2 className="font-serif text-2xl">Account</h2>
        <dl className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-y-3 text-sm">
          <dt className="eyebrow text-[10px]">Name</dt><dd>{user?.name}</dd>
          <dt className="eyebrow text-[10px]">Email</dt><dd>{user?.email}</dd>
          <dt className="eyebrow text-[10px]">Role</dt><dd className="capitalize">{user?.role}</dd>
          <dt className="eyebrow text-[10px]">Family</dt><dd>{family?.name}</dd>
        </dl>
      </section>

      <section className="mt-10">
        <h2 className="font-serif text-2xl">How privacy works here</h2>
        <ul className="mt-4 space-y-2 text-[hsl(var(--aangan-forest))]/80 text-[15px] leading-relaxed">
          <li>&middot; Each member&rsquo;s identity (name, photo, relation, date of birth) is shared with the family by default.</li>
          <li>&middot; Sensitive fields (bio, notes, profession, favourite food, languages, place of birth) stay private to the member who added them &mdash; unless they tick &ldquo;public&rdquo; in the member form.</li>
          <li>&middot; Stories are private by default. Tick &ldquo;Share with the whole family&rdquo; to make a story visible to everyone signed in.</li>
          <li>&middot; The family head sees all data, always &mdash; like a quiet caretaker of the archive.</li>
          <li>&middot; Aangan never trains on your family&rsquo;s archive. Ever.</li>
        </ul>
      </section>
    </div>
  );
}
