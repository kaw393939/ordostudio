"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { ThemeToggle } from "@/components/theme-toggle";
import { AsyncBoundary } from "@/components/patterns/async-boundary";
import { FadeIn, SlideUp, StaggerContainer, StaggerItem } from "@/components/ui/motion-wrapper";
import {
  Check,
  AlertCircle,
  AlertTriangle,
  Info,
  Calendar,
  Clock,
  User,
  Search,
  Settings,
  Trash2,
  Pencil,
  Plus,
  Download,
  ExternalLink,
  Filter,
  ArrowUpDown,
  ChevronRight,
  Menu,
  X,
  Sun,
  Moon,
  Eye,
  EyeOff,
  Undo2,
  Loader2,
} from "lucide-react";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      <Separator />
      {children}
    </section>
  );
}

export default function CatalogPage() {
  const [asyncDemo, setAsyncDemo] = React.useState<"loading" | "error" | "empty" | "data">("loading");

  return (
    <div className="mx-auto max-w-5xl space-y-12 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Component Catalog</h1>
          <p className="mt-1 text-muted-foreground">
            Sprint 45 — shadcn primitives, motion, themes, and patterns.
          </p>
        </div>
        <ThemeToggle />
      </div>

      <Separator />

      {/* ── Button Variants ── */}
      <Section title="Button">
        <div className="flex flex-wrap gap-3">
          <Button variant="default">Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button size="sm">Small</Button>
          <Button size="default">Default</Button>
          <Button size="lg">Large</Button>
          <Button size="icon"><Plus className="size-4" /></Button>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button disabled>Disabled</Button>
          <Button variant="destructive" disabled>Disabled Destructive</Button>
        </div>
      </Section>

      {/* ── Card ── */}
      <Section title="Card">
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Event Card</CardTitle>
              <CardDescription>Spring Workshop 2025</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                A sample card showing header, content, and footer.
              </p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" size="sm">Register</Button>
            </CardFooter>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Stats Card</CardTitle>
              <CardDescription>Registration overview</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">142</p>
              <p className="text-sm text-muted-foreground">Total registrations</p>
            </CardContent>
          </Card>
        </div>
      </Section>

      {/* ── Badge ── */}
      <Section title="Badge">
        <div className="flex flex-wrap gap-3">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="destructive">Destructive</Badge>
          <Badge variant="outline">Outline</Badge>
        </div>
      </Section>

      {/* ── Avatar ── */}
      <Section title="Avatar">
        <div className="flex gap-3">
          <Avatar><AvatarFallback>JD</AvatarFallback></Avatar>
          <Avatar><AvatarFallback>AB</AvatarFallback></Avatar>
          <Avatar><AvatarFallback>KW</AvatarFallback></Avatar>
        </div>
      </Section>

      {/* ── Table ── */}
      <Section title="Table">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>Alice Johnson</TableCell>
              <TableCell>alice@example.com</TableCell>
              <TableCell><Badge>Active</Badge></TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Bob Smith</TableCell>
              <TableCell>bob@example.com</TableCell>
              <TableCell><Badge variant="secondary">Pending</Badge></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Section>

      {/* ── Tabs ── */}
      <Section title="Tabs">
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="registrations">Registrations</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="mt-4">
            <p className="text-sm text-muted-foreground">Overview tab content.</p>
          </TabsContent>
          <TabsContent value="registrations" className="mt-4">
            <p className="text-sm text-muted-foreground">Registrations tab content.</p>
          </TabsContent>
          <TabsContent value="settings" className="mt-4">
            <p className="text-sm text-muted-foreground">Settings tab content.</p>
          </TabsContent>
        </Tabs>
      </Section>

      {/* ── Breadcrumb ── */}
      <Section title="Breadcrumb">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/admin">Admin</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Events</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </Section>

      {/* ── Skeleton ── */}
      <Section title="Skeleton">
        <div className="space-y-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-full" />
          <div className="flex gap-3">
            <Skeleton className="size-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        </div>
      </Section>

      {/* ── Lucide Icon Map ── */}
      <Section title="Lucide Icon Map">
        <p className="text-sm text-muted-foreground mb-4">
          Canonical icons from <code>/docs/icon-map.md</code>
        </p>
        <div className="grid grid-cols-4 gap-4 sm:grid-cols-6 md:grid-cols-8">
          {[
            { icon: Check, label: "Check" },
            { icon: AlertCircle, label: "AlertCircle" },
            { icon: AlertTriangle, label: "AlertTriangle" },
            { icon: Info, label: "Info" },
            { icon: Calendar, label: "Calendar" },
            { icon: Clock, label: "Clock" },
            { icon: User, label: "User" },
            { icon: Search, label: "Search" },
            { icon: Settings, label: "Settings" },
            { icon: Trash2, label: "Trash2" },
            { icon: Pencil, label: "Pencil" },
            { icon: Plus, label: "Plus" },
            { icon: Download, label: "Download" },
            { icon: ExternalLink, label: "ExternalLink" },
            { icon: Filter, label: "Filter" },
            { icon: ArrowUpDown, label: "ArrowUpDown" },
            { icon: ChevronRight, label: "ChevronRight" },
            { icon: Menu, label: "Menu" },
            { icon: X, label: "X" },
            { icon: Sun, label: "Sun" },
            { icon: Moon, label: "Moon" },
            { icon: Eye, label: "Eye" },
            { icon: EyeOff, label: "EyeOff" },
            { icon: Undo2, label: "Undo2" },
            { icon: Loader2, label: "Loader2" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex flex-col items-center gap-1 text-center">
              <Icon className="size-5 text-foreground" />
              <span className="text-[10px] text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Motion Wrappers ── */}
      <Section title="Motion Wrappers">
        <div className="grid gap-4 sm:grid-cols-2">
          <FadeIn>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm">FadeIn wrapper</p>
              </CardContent>
            </Card>
          </FadeIn>
          <SlideUp>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm">SlideUp wrapper</p>
              </CardContent>
            </Card>
          </SlideUp>
        </div>
        <StaggerContainer>
          <div className="flex gap-3">
            {["Item A", "Item B", "Item C"].map((text) => (
              <StaggerItem key={text}>
                <Badge variant="outline">{text}</Badge>
              </StaggerItem>
            ))}
          </div>
        </StaggerContainer>
      </Section>

      {/* ── AsyncBoundary Demo ── */}
      <Section title="AsyncBoundary">
        <div className="flex gap-2 mb-4">
          {(["loading", "error", "empty", "data"] as const).map((state) => (
            <Button
              key={state}
              variant={asyncDemo === state ? "default" : "outline"}
              size="sm"
              onClick={() => setAsyncDemo(state)}
            >
              {state}
            </Button>
          ))}
        </div>
        <AsyncBoundary
          isLoading={asyncDemo === "loading"}
          error={asyncDemo === "error" ? "Network request failed (simulated)" : null}
          data={
            asyncDemo === "data"
              ? [
                  { id: 1, name: "Spring Workshop" },
                  { id: 2, name: "Summer Conference" },
                ]
              : asyncDemo === "empty"
                ? []
                : null
          }
          onRetry={() => setAsyncDemo("loading")}
          emptyTitle="No events found"
          emptyDescription="Try adjusting your filters or create a new event."
          renderData={(events) => (
            <div className="space-y-2">
              {events.map((e: { id: number; name: string }) => (
                <Card key={e.id}>
                  <CardContent className="flex items-center justify-between py-3">
                    <span>{e.name}</span>
                    <Badge>Active</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        />
      </Section>

      {/* ── Separator ── */}
      <Section title="Separator">
        <div className="space-y-3">
          <Separator />
          <div className="flex items-center gap-3">
            <span className="text-sm">Left</span>
            <Separator orientation="vertical" className="h-4" />
            <span className="text-sm">Right</span>
          </div>
        </div>
      </Section>
    </div>
  );
}
