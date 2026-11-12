"use client";

import { useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Drawer,
  EmptyState,
  Field,
  Modal,
  MoneyInput,
  Skeleton,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  useToast,
} from "@/components/ui";
import { formatDate } from "@/lib/format/dates";
import { formatINR, formatINRCompact } from "@/lib/format/inr";

export default function HomePage() {
  const { push } = useToast();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [amount, setAmount] = useState<number | null>(2_500_000);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-2 border-b border-border pb-6">
        <p className="text-2xl font-semibold tracking-tight text-primary">
          IIMCIP · Programme OS
        </p>
        <p className="max-w-2xl text-sm text-muted">
          An Integrated Programme Operating System for Startup Incubation and
          Acceleration. Milestone M0 — scaffold, design tokens, UI primitives,
          and INR/date formatters.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge tone="primary">M0 Scaffold</Badge>
          <Badge tone="on-track">Static export</Badge>
          <Badge tone="in-progress">Prototype</Badge>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Full INR</CardDescription>
            <CardTitle>{formatINR(2_500_000)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Compact KPI</CardDescription>
            <CardTitle>{formatINRCompact(2_500_000)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Demo date</CardDescription>
            <CardTitle>{formatDate("2026-11-12")}</CardTitle>
          </CardHeader>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Controls</CardTitle>
            <CardDescription>
              Buttons, toast, drawer, and modal primitives.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button onClick={() => push({ title: "Saved", tone: "success" })}>
              Primary
            </Button>
            <Button variant="secondary" onClick={() => setDrawerOpen(true)}>
              Open drawer
            </Button>
            <Button variant="accent" onClick={() => setModalOpen(true)}>
              Open modal
            </Button>
            <Button
              variant="ghost"
              onClick={() =>
                push({
                  title: "Change applied",
                  description: "Budget updated in the mock store.",
                  tone: "info",
                  onUndo: () =>
                    push({ title: "Undone", tone: "warning" }),
                })
              }
            >
              Toast with undo
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fields</CardTitle>
            <CardDescription>Labelled inputs with Indian money grouping.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Field
              label="Programme code"
              defaultValue="IIMCIP-INC-2026-001"
              hint="Read-only style example"
            />
            <MoneyInput
              label="Programme budget"
              value={amount}
              onChange={setAmount}
            />
          </CardContent>
        </Card>
      </section>

      <section>
        <Tabs defaultValue="table">
          <TabsList>
            <TabsTrigger value="table">Table</TabsTrigger>
            <TabsTrigger value="empty">Empty</TabsTrigger>
            <TabsTrigger value="loading">Loading</TabsTrigger>
          </TabsList>
          <TabsContent value="table">
            <Table>
              <THead>
                <TR>
                  <TH>Code</TH>
                  <TH>Name</TH>
                  <TH>Budget</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                <TR>
                  <TD>IIMCIP-INC-2026-001</TD>
                  <TD>Vanguard Incubation Cohort 5</TD>
                  <TD>{formatINR(25_00_000)}</TD>
                  <TD>
                    <Badge tone="in-progress">Active</Badge>
                  </TD>
                </TR>
                <TR>
                  <TD>IIMCIP-ACC-2026-002</TD>
                  <TD>Eastern Rail Acceleration Sprint</TD>
                  <TD>{formatINR(40_00_000)}</TD>
                  <TD>
                    <Badge tone="on-track">Active</Badge>
                  </TD>
                </TR>
              </TBody>
            </Table>
          </TabsContent>
          <TabsContent value="empty">
            <EmptyState
              title="No programmes yet"
              description="Load demo data or create a programme to begin the presentation."
              action={<Button>Load demo data</Button>}
            />
          </TabsContent>
          <TabsContent value="loading">
            <div className="flex flex-col gap-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-10 w-1/2" />
            </div>
          </TabsContent>
        </Tabs>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Status tones</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Badge tone="on-track">On track</Badge>
          <Badge tone="at-risk">At risk</Badge>
          <Badge tone="delayed">Delayed</Badge>
          <Badge tone="in-progress">In progress</Badge>
          <Badge tone="not-started">Not started</Badge>
          <Badge tone="neutral">Simulated</Badge>
        </CardContent>
        <CardFooter>
          <p className="text-xs text-muted">
            Design tokens from prototype blueprint doc 05 §1. Store and screens
            arrive in later milestones.
          </p>
        </CardFooter>
      </Card>

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Activity drawer"
        footer={
          <Button className="w-full" onClick={() => setDrawerOpen(false)}>
            Done
          </Button>
        }
      >
        <p className="text-sm text-muted">
          Side drawer primitive for activity edit and detail panels.
        </p>
      </Drawer>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Confirm action"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setModalOpen(false)}>Confirm</Button>
          </>
        }
      >
        <p className="text-sm text-muted">
          Destructive actions will use this modal with type-to-confirm where
          required.
        </p>
      </Modal>
    </main>
  );
}
