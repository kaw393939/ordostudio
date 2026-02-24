"use client";

import { Component, type ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { Button, Card } from "@/components/primitives";

type ErrorBoundaryProps = {
  children: ReactNode;
  title?: string;
  description?: string;
  homeHref?: string;
  homeLabel?: string;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("ErrorBoundary caught", error);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const title = this.props.title ?? "Something went wrong";
    const description =
      this.props.description ?? "An unexpected error occurred. Try again, or return to a safe page.";

    return (
      <main id="main-content" className="container-grid py-6">
        <Card className="p-6 text-center">
          <div className="mx-auto mb-3 inline-flex size-12 items-center justify-center rounded-sm border border-border-default bg-surface text-text-secondary">
            <AlertCircle className="size-5" />
          </div>
          <h1 className="type-title text-text-primary">{title}</h1>
          <p className="type-body mt-2 text-text-secondary">{description}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button
              intent="primary"
              onClick={() => {
                this.setState({ hasError: false });
              }}
            >
              Try again
            </Button>
            <a className="type-label underline" href={this.props.homeHref ?? "/"}>
              {this.props.homeLabel ?? "Go home"}
            </a>
          </div>
        </Card>
      </main>
    );
  }
}
