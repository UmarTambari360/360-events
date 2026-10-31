import { useQuery } from "@tanstack/react-query";
import { apiClient } from "./lib/api-client";

const fetchReadiness = () => apiClient<{ status: string }>("/health/ready");

export function App() {
  const { data, error, isLoading } = useQuery({
    queryKey: ["health"],
    queryFn: fetchReadiness,
    retry: false,
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="p-8 max-w-md w-full bg-white shadow rounded-lg text-center">
        <h1 className="text-2xl font-bold mb-4 text-gray-900">
          360Events Platform
        </h1>
        {isLoading && (
          <p className="text-gray-500">Checking API readiness...</p>
        )}
        {error && (
          <div className="p-4 bg-red-50 text-red-700 rounded-md border border-red-200">
            <p className="font-semibold">API is unreachable</p>
            <p className="text-sm mt-1">
              {error instanceof Error ? error.message : "Unknown error"}
            </p>
          </div>
        )}
        {data && (
          <div className="p-4 bg-green-50 text-green-700 rounded-md border border-green-200">
            <p className="font-semibold">API is Online</p>
            <p className="text-sm mt-1">Status: {data.status}</p>
          </div>
        )}
      </div>
    </div>
  );
}
