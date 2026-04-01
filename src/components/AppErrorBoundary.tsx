import { Component, type ReactNode } from 'react';

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  public constructor(props: AppErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  public static getDerivedStateFromError() {
    return { hasError: true };
  }

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-6 px-6 text-center text-[#e7f4eb]">
          <h1 className="font-display text-4xl font-bold">
            HiveLaunch hit an unexpected client-side issue.
          </h1>
          <p className="max-w-xl text-base text-[#9bb5a4]">
            Refresh the page to reset the local state. Your saved campaigns stay
            in local storage unless you clear the browser.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-full border border-[#d7f171]/40 bg-[#d7f171] px-5 py-3 font-semibold text-[#08110d]"
          >
            Reload HiveLaunch
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
