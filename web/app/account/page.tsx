"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Tabs } from "@/components/ui/Tabs";
import { useAuth } from "@/lib/auth";
import { signup } from "@/lib/tasks";

function SignInForm() {
  const { signIn, configured } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!configured) {
    return (
      <Banner kind="warn" title="Accounts aren't set up yet.">
        Add the Supabase values to .env and restart — see the README.
      </Banner>
    );
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        const err = await signIn(email, password);
        setBusy(false);
        if (err) setError(err);
        else router.push("/");
      }}
    >
      <Input
        label="Email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <Input
        label="Password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={error ?? undefined}
        required
      />
      <Button type="submit" disabled={busy} block>
        Sign in
      </Button>
    </form>
  );
}

function SignUpForm() {
  const [role, setRole] = useState<"veteran" | "student">("veteran");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [zip, setZip] = useState("");
  const [school, setSchool] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (done) {
    return (
      <Banner kind="info" title="Account created.">
        {done} You can sign in now — browsing works right away.
      </Banner>
    );
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        const res = await signup({
          email,
          password,
          role,
          display_name: displayName,
          zip,
          school: role === "student" ? school : undefined,
        });
        setBusy(false);
        if (res.ok) setDone(res.next ?? "");
        else setError(res.error ?? "Couldn't create the account.");
      }}
    >
      <Select
        label="I am a"
        value={role}
        onChange={(e) => setRole(e.target.value as "veteran" | "student")}
        options={[
          { value: "veteran", label: "Veteran or family member" },
          { value: "student", label: "Student volunteer" },
        ]}
      />
      <Input
        label="Display name"
        hint="Shown instead of your real name. First name and last initial works well."
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        required
        minLength={2}
      />
      <Input
        label={role === "student" ? "School email" : "Email"}
        hint={role === "student" ? "Use your school address — it's how we verify students." : undefined}
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <Input
        label="Password"
        hint="At least 8 characters."
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        minLength={8}
      />
      <Input
        label="ZIP code"
        inputMode="numeric"
        pattern="\d{5}"
        value={zip}
        onChange={(e) => setZip(e.target.value)}
        required
      />
      {role === "student" && (
        <Input
          label="School"
          value={school}
          onChange={(e) => setSchool(e.target.value)}
          required
        />
      )}
      {error && (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
      <Button type="submit" disabled={busy} block>
        Create account
      </Button>
      <p className="text-sm text-ink-muted">
        An admin approves new accounts before posting or claiming unlocks — usually within a day.
      </p>
    </form>
  );
}

export default function AccountPage() {
  return (
    <main className="mx-auto max-w-[480px] px-5 py-10">
      <h1 className="mb-6 font-display text-xl font-medium">Your account</h1>
      <Card>
        <Tabs
          tabs={[
            { id: "signin", label: "Sign in", content: <SignInForm /> },
            { id: "signup", label: "Create account", content: <SignUpForm /> },
          ]}
        />
      </Card>
    </main>
  );
}
