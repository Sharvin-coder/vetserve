"use client";

// Public, read-only verification of an hours export — no sign-in needed.
// A school checks the code (or scans the PDF's QR) and lands here.

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Banner } from "@/components/ui/Banner";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Table, Td, Th } from "@/components/ui/Table";
import { API_URL } from "@/lib/api";

interface VerifyPayload {
  student_name: string;
  school: string;
  total_hours: number;
  entries: { date: string; task: string; hours: number }[];
  generated_at: string;
}

export default function VerifyPage() {
  const params = useParams<{ code: string }>();
  const [data, setData] = useState<VerifyPayload | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/verify/${encodeURIComponent(params.code)}`)
      .then(async (r) => {
        if (!r.ok) throw new Error();
        setData(await r.json());
      })
      .catch(() => setNotFound(true));
  }, [params.code]);

  return (
    <main className="mx-auto max-w-[720px] px-5 py-10">
      <h1 className="mb-2 font-display text-xl font-medium">Hours verification</h1>
      <p className="mb-6 max-w-measure text-base text-ink-muted">
        This page confirms a VetServe Katy service-hours export against our records. Every line
        was confirmed by the veteran who received the help.
      </p>

      {notFound ? (
        <Banner kind="warn" title="No match for this code.">
          Check the code for typos. If it still doesn&rsquo;t match, the document wasn&rsquo;t
          issued by VetServe Katy.
        </Banner>
      ) : data === null ? (
        <Skeleton className="h-48" />
      ) : (
        <>
          <Card className="mb-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-md font-semibold">{data.student_name}</p>
                <p className="text-ui text-ink-muted">{data.school || "School not listed"}</p>
                <p className="mt-1 text-sm text-ink-muted tnum">
                  Code <span className="font-semibold text-accent">{params.code}</span> · issued{" "}
                  {new Date(data.generated_at).toLocaleDateString()}
                </p>
              </div>
              <p className="font-display text-2xl font-medium tnum">
                {data.total_hours.toFixed(1)}
                <span className="ml-2 text-md text-ink-muted">hours</span>
              </p>
            </div>
          </Card>
          <Table>
            <thead>
              <tr>
                <Th>Date</Th>
                <Th>Task</Th>
                <Th className="text-right">Hours</Th>
              </tr>
            </thead>
            <tbody>
              {data.entries.map((e, i) => (
                <tr key={i}>
                  <Td className="tnum">{e.date}</Td>
                  <Td>{e.task}</Td>
                  <Td className="tnum text-right">{e.hours.toFixed(1)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </>
      )}
    </main>
  );
}
