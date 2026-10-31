"use client";

// Every primitive in every state, for review before Phase 1.

import { useState } from "react";
import { Banner, CrisisBanner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CitationMarker } from "@/components/ui/Citation";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";
import { SourceCard } from "@/components/ui/SourceCard";
import { StatusPill, type TaskStatus } from "@/components/ui/StatusPill";
import { Table, Td, Th } from "@/components/ui/Table";
import { Tabs } from "@/components/ui/Tabs";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-line py-10 last:border-b-0">
      <h2 className="mb-5 font-display text-lg font-medium">{title}</h2>
      {children}
    </section>
  );
}

const STATUSES: TaskStatus[] = ["open", "claimed", "accepted", "done", "confirmed", "cancelled"];

export default function Styleguide() {
  const toast = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeCitation, setActiveCitation] = useState<number | null>(null);

  return (
    <main className="mx-auto max-w-board px-5 py-12">
      <h1 className="font-display text-2xl font-medium">Styleguide</h1>
      <p className="mt-1 text-base text-ink-muted">
        All primitives, all states. Review this before Phase 1 starts.
      </p>

      <Section title="Type">
        <p className="font-display text-3xl">Fraunces 48 — headlines only</p>
        <p className="mt-2 font-display text-2xl">Fraunces 38</p>
        <p className="mt-2 font-display text-xl">Fraunces 30</p>
        <p className="mt-4 text-lg">Inter 24</p>
        <p className="mt-1 text-md">Inter 20</p>
        <p className="mt-1 max-w-measure text-base">
          Inter 17, the body size for veterans-facing screens, at line-height 1.55 so long
          paragraphs about eligibility rules stay comfortable to read.
        </p>
        <p className="mt-1 text-ui">Inter 16, for dense screens like the admin tables.</p>
        <p className="mt-1 text-sm text-ink-muted">Inter 14 — the floor. Nothing smaller exists.</p>
        <p className="mt-3 text-base tnum">Tabular numerals: 11:30–14:00 · 1,024 hours · 06/14/2026</p>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Post this task</Button>
          <Button variant="secondary">Preview</Button>
          <Button variant="quiet">Skip for now</Button>
          <Button variant="danger">Cancel task</Button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button disabled>Post this task</Button>
          <Button variant="secondary" disabled>
            Preview
          </Button>
          <Button variant="quiet" disabled>
            Skip for now
          </Button>
          <Button variant="danger" disabled>
            Cancel task
          </Button>
        </div>
        <p className="mt-3 text-sm text-ink-muted">
          Tab to any button to see the focus ring. Minimum hit target is 44px.
        </p>
      </Section>

      <Section title="Form controls">
        <div className="grid max-w-[560px] gap-5">
          <Input label="Display name" hint="Shown instead of your real name." defaultValue="J. Alvarez" />
          <Input label="ZIP code" inputMode="numeric" placeholder="77494" />
          <Input
            label="Email"
            type="email"
            defaultValue="not-an-email"
            error="That doesn't look like an email address. Check for a typo."
          />
          <Input label="School" disabled value="Clarke Central High School" readOnly />
          <Textarea
            label="What do you need help with?"
            hint="A sentence or two is plenty."
            placeholder="My printer won't connect to the new laptop."
          />
          <Select
            label="Category"
            placeholder="Choose one"
            defaultValue=""
            options={[
              { value: "tech_help", label: "Help with my phone or computer" },
              { value: "yard", label: "Yard work" },
              { value: "ride", label: "A ride" },
              { value: "errand", label: "An errand" },
              { value: "paperwork", label: "Help with a form" },
              { value: "company", label: "Company and conversation" },
            ]}
          />
        </div>
      </Section>

      <Section title="Status pills">
        <div className="flex flex-wrap gap-2.5">
          {STATUSES.map((s) => (
            <StatusPill key={s} status={s} />
          ))}
        </div>
      </Section>

      <Section title="Citations — the signature element">
        <div className="grid gap-6 md:grid-cols-[1fr_320px]">
          <Card>
            <p className="max-w-measure text-base">
              Veterans with a service-connected disability rated at least 10 percent are exempt
              from certain property taxes in Texas
              <CitationMarker
                n={1}
                active={activeCitation === 1}
                onActivate={setActiveCitation}
                onDeactivate={() => setActiveCitation(null)}
              />
              . The exemption amount depends on the disability rating
              <CitationMarker
                n={2}
                active={activeCitation === 2}
                onActivate={setActiveCitation}
                onDeactivate={() => setActiveCitation(null)}
              />
              .
            </p>
            <p className="mt-3 text-sm text-ink-muted">
              Hover or focus a marker to highlight its source card.
            </p>
          </Card>
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium text-ink">
              Confidence: High — both claims matched official passages.
            </p>
            <SourceCard
              n={1}
              title="Texas Property Tax Exemptions"
              sourceUrl="https://tvc.texas.gov"
              page={4}
              excerpt="A disabled veteran is entitled to an exemption from taxation of a portion of the assessed value of a property the veteran owns."
              match="A disabled veteran is entitled to an exemption"
              active={activeCitation === 1}
              onSelect={setActiveCitation}
            />
            <SourceCard
              n={2}
              title="Texas Property Tax Exemptions"
              sourceUrl="https://tvc.texas.gov"
              page={5}
              excerpt="The amount of the exemption is determined by the veteran's disability rating, from $5,000 up to a total exemption."
              match="determined by the veteran's disability rating"
              active={activeCitation === 2}
              onSelect={setActiveCitation}
            />
          </div>
        </div>
      </Section>

      <Section title="Banners">
        <div className="grid max-w-measure gap-4">
          <Banner kind="info" title="Your task is posted.">
            A volunteer can now claim it. You&rsquo;ll choose whether to accept them.
          </Banner>
          <Banner kind="warn" title="Your account isn't verified yet.">
            An admin reviews new accounts, usually within a day. You can browse until then.
          </Banner>
          <CrisisBanner />
        </div>
      </Section>

      <Section title="Empty state">
        <EmptyState
          title="No tasks near 30606 yet."
          body="Tasks from your neighbors will show up here."
          action={<Button variant="secondary">Show all open tasks</Button>}
        />
      </Section>

      <Section title="Skeleton">
        <div className="grid max-w-[480px] gap-4">
          <Skeleton className="h-11 w-40" />
          <SkeletonText lines={3} />
        </div>
      </Section>

      <Section title="Toast">
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => toast("Task claimed. The veteran will review your offer.")}>
            Show info toast
          </Button>
          <Button variant="secondary" onClick={() => toast("Hours confirmed.", "success")}>
            Show success toast
          </Button>
          <Button variant="secondary" onClick={() => toast("Couldn't save. Try again.", "danger")}>
            Show danger toast
          </Button>
        </div>
      </Section>

      <Section title="Dialog">
        <Button variant="secondary" onClick={() => setDialogOpen(true)}>
          Open dialog
        </Button>
        <Dialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          title="Cancel this task?"
          footer={
            <>
              <Button variant="secondary" onClick={() => setDialogOpen(false)}>
                Keep it
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  setDialogOpen(false);
                  toast("Task cancelled.");
                }}
              >
                Cancel task
              </Button>
            </>
          }
        >
          <p>
            The volunteer who claimed it will be notified. You can post it again any time. Focus is
            trapped here until you close.
          </p>
        </Dialog>
      </Section>

      <Section title="Tabs">
        <Tabs
          tabs={[
            {
              id: "open",
              label: "Open tasks",
              content: <p className="text-base text-ink-muted">Open tasks render here.</p>,
            },
            {
              id: "yours",
              label: "Your tasks",
              content: <p className="text-base text-ink-muted">Claimed and accepted tasks render here.</p>,
            },
          ]}
        />
      </Section>

      <Section title="Table">
        <Table>
          <thead>
            <tr>
              <Th>Date</Th>
              <Th>Task</Th>
              <Th>Veteran</Th>
              <Th className="text-right">Hours</Th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <Td className="tnum">06/02/2026</Td>
              <Td>Set up new phone</Td>
              <Td>J. Alvarez</Td>
              <Td className="tnum text-right">1.5</Td>
            </tr>
            <tr>
              <Td className="tnum">06/11/2026</Td>
              <Td>Ride to the VA clinic</Td>
              <Td>R. Okafor</Td>
              <Td className="tnum text-right">2.0</Td>
            </tr>
          </tbody>
        </Table>
      </Section>
    </main>
  );
}
