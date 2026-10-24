import { createFileRoute } from "@tanstack/react-router";
import { handlePulseApi } from "@/lib/pulse/api.server";

const handle = ({ request }: { request: Request }) => handlePulseApi(request);

export const Route = createFileRoute("/api/$")({
  server: { handlers: { GET: handle, POST: handle } },
});
