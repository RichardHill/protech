"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);
  const [taskID, setTaskID] = useState<string | null>(null);
  const [data, setData] = useState<
    { name: string; address: string; phone: string; email: string }[] | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const callApi = async () => {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const res = await fetch("https://api.greencloud.dev/gc/678c008b428b9003e155c812", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          exampleKey: "exampleValue", // Adjust payload as needed
        }),
      });

      if (!res.ok) {
        throw new Error(`Initial request failed with status: ${res.status}`);
      }

      const responseData = await res.json();

      if (responseData.id) {
        setTaskID(responseData.id);
        setPolling(true); // Start polling
      } else {
        throw new Error("Task ID not provided in the response");
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred during the initial call");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!taskID) return;

    const intervalId: NodeJS.Timeout = setInterval(async () => {
      try {
        const res = await fetch(`https://api.greencloud.dev/gc/${taskID}/result`);
        const contentType = res.headers.get("content-type");
    
        let responseMessage: string | Record<string, unknown>;
        if (contentType?.includes("application/json")) {
          responseMessage = await res.json();
        } else {
          responseMessage = await res.text();
        }
    
        if (res.status === 200) {
          setPolling(false);
        
          // Check if the responseMessage is an array of objects with the expected structure
          if (Array.isArray(responseMessage)) {
            setData(responseMessage as { name: string; address: string; phone: string; email: string }[]);
          } else {
            console.error("Unexpected response format:", responseMessage);
            setError("Unexpected response format received from API.");
          }
        
          clearInterval(intervalId);
        } else if (res.status === 404) {
          console.log("Polling: Result not ready yet...");
        } else if (res.status === 500 || res.status === 408) {
          setPolling(false);
          setError(`Error (${res.status}): ${typeof responseMessage === "string" ? responseMessage : JSON.stringify(responseMessage)}`);
          clearInterval(intervalId);
        } else {
          throw new Error(`Unexpected status during polling: ${res.status}`);
        }
      } catch (err) {
        console.error("Polling error:", err);
        setError("An error occurred during polling");
        setPolling(false);
        clearInterval(intervalId);
      }
    }, 1500);

    return () => clearInterval(intervalId); // Cleanup interval on unmount or taskID change
  }, [taskID]);

  const filteredData = data?.filter((row) =>
    Object.values(row).some((value) =>
      value.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  return (
    <div className="min-h-screen p-8 pb-20 font-[family-name:var(--font-geist-sans)]">
      {/* Top Section */}
      <div className="flex flex-col items-center mb-8">
        <div className="flex items-center justify-between w-full max-w-5xl">
          <Image src="/proteclogo.jpg" alt="Protech Logo" width={50} height={50} />
          <button
            type="button"
            onClick={callApi}
            className="rounded-full border border-solid border-transparent transition-colors bg-green-600 text-white hover:bg-green-700 text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5"
            disabled={loading || polling}
          >
            {loading ? "Initializing..." : polling ? "Processing..." : "Click to start processing..."}
          </button>
        </div>
        {data && (
          <input
            type="text"
            className="mt-4 w-full max-w-md p-2 border rounded"
            placeholder="Search the table..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        )}
      </div>

      {/* Table Section */}
      {data && (
        <div className="overflow-x-auto">
          <table className="table-auto w-full max-w-5xl mx-auto border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-200">
                <th className="border border-gray-300 px-4 py-2">Name</th>
                <th className="border border-gray-300 px-4 py-2">Address</th>
                <th className="border border-gray-300 px-4 py-2">Phone</th>
                <th className="border border-gray-300 px-4 py-2">Email</th>
              </tr>
            </thead>
            <tbody>
              {filteredData?.map((row) => {
                const uniqueKey = `${row.name}-${row.email}`; // Generate a unique key for each row
                return (
                  <tr key={uniqueKey} className="hover:bg-gray-100">
                    <td className="border border-gray-300 px-4 py-2">{row.name || "N/A"}</td>
                    <td className="border border-gray-300 px-4 py-2 whitespace-pre-line">{row.address || "N/A"}</td>
                    <td className="border border-gray-300 px-4 py-2">{row.phone || "N/A"}</td>
                    <td className="border border-gray-300 px-4 py-2">{row.email || "N/A"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Error Section */}
      {error && (
        <div className="mt-4 text-center text-red-600">
          <h2>Error</h2>
          <pre className="bg-red-100 text-sm p-4 rounded shadow-md">
            {error}
          </pre>
        </div>
      )}
    </div>
  );
}