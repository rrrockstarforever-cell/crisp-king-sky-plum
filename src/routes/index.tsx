import { createFileRoute } from "@tanstack/react-router";
import App from "@/pulse/App.tsx";

export const Route = createFileRoute("/")({
  ssr: false,
  component: Home,
});

function Home() {
  return <App />;
}
