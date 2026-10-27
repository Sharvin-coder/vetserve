// The persistent "People who can help" box. Numbers are the same verified
// set the API serves; tel: links at 20px for older eyes and tremor.

const PEOPLE = [
  { org: "Georgia Dept. of Veterans Service", phone: "404-656-2300", note: "State benefits and claims, free" },
  { org: "Athens VA Clinic", phone: "706-733-0188", note: "VA health care" },
  { org: "VA Benefits Hotline", phone: "800-827-1000", note: "Federal benefits questions" },
];

export function HelpRail() {
  return (
    <aside aria-label="People who can help" className="rounded-card border border-line bg-surface p-4">
      <h2 className="mb-3 font-display text-md font-medium">People who can help</h2>
      <ul className="flex flex-col gap-3">
        {PEOPLE.map((p) => (
          <li key={p.org}>
            <p className="text-ui font-medium text-ink">{p.org}</p>
            <p className="text-sm text-ink-muted">{p.note}</p>
            <a
              href={`tel:${p.phone.replace(/-/g, "")}`}
              className="text-md font-semibold text-primary underline underline-offset-2 tnum"
            >
              {p.phone}
            </a>
          </li>
        ))}
        <li className="border-t border-line pt-3">
          <p className="text-ui font-medium text-ink">Veterans Crisis Line</p>
          <p className="text-sm text-ink-muted">Free, confidential, 24/7</p>
          <p className="text-md font-semibold tnum">
            <a href="tel:988" className="text-primary underline underline-offset-2">
              988
            </a>
            <span className="text-ink"> then press 1, or text </span>
            <a href="sms:838255" className="text-primary underline underline-offset-2">
              838255
            </a>
          </p>
        </li>
      </ul>
    </aside>
  );
}
