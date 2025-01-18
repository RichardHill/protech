"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);
  const [taskID, setTaskID] = useState<string | null>(null);
  const [response, setResponse] = useState<{ status: number; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const callApi = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      // Make the initial POST request
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

      const data = await res.json();

      // Extract and set the task ID for polling
      if (data.id) {
        setTaskID(data.id);
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

  // Polling logic for task results
  useEffect(() => {
    if (!taskID) return;

    let intervalId: NodeJS.Timeout;

    async function getResult() {
      try {
        const res = await fetch(`https://api.greencloud.dev/gc/${taskID}/result`);
        const responseMessage = await res.text();

        if (res.status === 200) {
          // Successful result
          setPolling(false);
          setResponse({
            status: res.status,
            message: responseMessage,
          });
          clearInterval(intervalId);
        } else if (res.status === 404) {
          // Continue polling if still in progress
          console.log("Polling: Result not ready yet...");
        } else if (res.status === 500) {
          // Stop polling and handle irretrievable error
          setPolling(false);
          setError(`Server Error (500): ${responseMessage}`);
          clearInterval(intervalId);
        } else if (res.status === 408) {
          // Stop polling and handle timeout error
          setPolling(false);
          setError(`Request Timeout (408): ${responseMessage}`);
          clearInterval(intervalId);
        } else {
          // Handle unexpected status codes
          throw new Error(`Unexpected status during polling: ${res.status}`);
        }
      } catch (err) {
        console.error("Polling error:", err);
        setError("An error occurred during polling");
        setPolling(false);
        clearInterval(intervalId);
      }
    }

    intervalId = setInterval(getResult, 1500); // Poll every 1.5 seconds

    return () => clearInterval(intervalId); // Cleanup interval on unmount or taskID change
  }, [taskID]);

  return (
    <div className="relative grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      {/* Logo and Title in top-left corner */}
      <div className="absolute top-4 left-4 flex items-center gap-4">
        <Image
          src="/proteclogo.jpg"
          alt="Protech Logo"
          width={50}
          height={50}
        />
        <h1 className="text-xl font-bold">ProTech Lead Processor</h1>
      </div>

      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
        <button
          type="button"
          onClick={callApi}
          className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-green-600 text-white gap-2 hover:bg-green-700 text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5"
          disabled={loading || polling}
        >
          {loading ? "Initializing..." : polling ? "Processing..." : "Start Processing..."}
        </button>

        {loading && (
          <div aria-live="polite" className="flex items-center justify-center mt-4">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900" />
            <p className="ml-2 text-gray-600">Initializing request...</p>
          </div>
        )}

        {polling && (
          <div aria-live="polite" className="flex items-center justify-center mt-4">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500" />
            <p className="ml-2 text-green-600">Polling for result...</p>
          </div>
        )}

        {response && (
          <div className="mt-4 text-center">
            <h2 className="text-lg font-semibold">API Result:</h2>
            <pre className="bg-gray-100 text-sm p-4 rounded shadow-md">
              {JSON.stringify(response, null, 2)}
            </pre>
          </div>
        )}

        {error && (
          <div className="mt-4 text-center text-red-600">
            <h2>Error</h2>
            <pre className="bg-red-100 text-sm p-4 rounded shadow-md">
              {error}
            </pre>
          </div>
        )}
      </main>
    </div>
  );
}