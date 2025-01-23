"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);
  const [taskID, setTaskID] = useState<string | null>(null);
  const [data, setData] = useState<{
    extracted_contacts: { name: string; address: string; phone: string; email: string }[];
    filtered_out: {
      duplicates: { name: string; address: string; phone: string; email: string }[];
      empty_records: { name: string; address: string; phone: string; email: string }[];
      failed_extractions: { file_name: string; error: string }[];
    };
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [collapsedSections, setCollapsedSections] = useState({
    extracted_contacts: false,
    duplicates: false,
    empty_records: false,
    failed_extractions: false,
  });

  // Helper function to toggle collapsible sections
  const toggleSection = (section: keyof typeof collapsedSections) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Helper function to render tables dynamically
  const renderTable = (
    data: { [key: string]: string | undefined }[] | undefined,
    headers: string[],
    title: string,
    sectionKey: keyof typeof collapsedSections // Type sectionKey to match collapsedSections keys
  ) => (
    <div className="mb-8">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">{title}</h2>
        {/* biome-ignore lint/a11y/useButtonType: <explanation> */}
        <button
          className="text-sm text-blue-500 underline"
          onClick={() => toggleSection(sectionKey)}
        >
          {collapsedSections[sectionKey] ? "Expand" : "Collapse"}
        </button>
      </div>
      {!collapsedSections[sectionKey] && (
        <div className="overflow-x-auto">
          <table className="table-auto w-full border-collapse border border-gray-300 mt-4">
            <thead>
            <tr className="bg-black text-white">
            {headers.map((header, index) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
                  <th key={index} className="border border-gray-300 px-4 py-2">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data?.map((row, rowIndex) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
                 <tr key={rowIndex}>
                  {headers.map((header, colIndex) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
                    <td key={colIndex} className="border border-gray-300 px-4 py-2">
                      {row[header.toLowerCase()] || "N/A"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

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
          exampleKey: "exampleValue",
        }),
      });

      if (!res.ok) {
        throw new Error(`Initial request failed with status: ${res.status}`);
      }

      const responseData = await res.json();

      if (responseData.id) {
        setTaskID(responseData.id);
        setPolling(true);
      } else {
        throw new Error("Task ID not provided in the response");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
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
  
        // biome-ignore lint/suspicious/noImplicitAnyLet: <explanation>
          let responseData;
        if (contentType?.includes("application/json")) {
          responseData = await res.json();
        } else {
          responseData = await res.text();
        }
  
        if (res.status === 200) {
          setPolling(false);
          setData(responseData as typeof data);
          clearInterval(intervalId); // Stop polling on success
        } else if (res.status === 404) {
          console.log("Polling: Result not ready yet...");
          // Continue polling when 404
        } else if (res.status >= 500) {
          setPolling(false);
          setError(`Server error (${res.status}): ${JSON.stringify(responseData)}`);
          clearInterval(intervalId); // Stop polling on server errors
        } else {
          setPolling(false);
          setError(`Unexpected response status: ${res.status}`);
          clearInterval(intervalId); // Stop polling on unexpected statuses
        }
      } catch (err) {
        console.error("Polling error:", err);
        setError("An error occurred during polling.");
        setPolling(false);
        clearInterval(intervalId); // Stop polling on catch block errors
      }
    }, 1500);
  
    return () => clearInterval(intervalId); // Cleanup interval on component unmount or taskID change
  }, [taskID]);

  const filteredData = (array: { name: string; address: string; phone: string; email: string }[] | undefined) =>
    array?.filter((row) =>
      Object.values(row).some((value) =>
        value.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );

  // Calculate stats
  const stats = {
    extractedContacts: data?.extracted_contacts?.length || 0,
    duplicates: data?.filtered_out?.duplicates?.length || 0,
    emptyRecords: data?.filtered_out?.empty_records?.length || 0,
    errors: data?.filtered_out?.failed_extractions?.length || 0,
    totals: 0
  };

  stats.totals = stats.extractedContacts + stats.duplicates + stats.emptyRecords + stats.errors

  return (
    <div className="min-h-screen p-8">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-8">
        {/* Company Logo */}
        <div className="flex items-center">
          <Image src="/proteclogo.jpg" alt="Protech Logo" width={50} height={50} />
        </div>

        {/* Stats Section */}
        <div className="flex space-x-4 text-sm text-gray-600">
          <div>Extracted: <span className="font-bold">{stats.extractedContacts}</span></div>
          <div>Duplicates: <span className="font-bold">{stats.duplicates}</span></div>
          <div>Empty: <span className="font-bold">{stats.emptyRecords}</span></div>
          <div>Errors: <span className="font-bold">{stats.errors}</span></div>
          <div>Total: <span className="font-bold">{stats.totals}</span></div>

        </div>

        {/* Processing Button */}
        <button
          type="button"
          onClick={callApi}
          className="rounded-full border border-solid border-transparent transition-colors bg-green-600 text-white hover:bg-green-700 text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 flex items-center gap-2"
          disabled={loading || polling}
        >
          {loading || polling ? "Processing..." : "Click to Start Processing"}
        </button>
      </div>

            {/* Spinner Section */}
      {(loading || polling) && !data && (
        <div className="flex flex-col items-center justify-center h-[500px] max-w-5xl mx-auto">
          <Image
            src="/proteclogo.jpg"
            alt="Loading..."
            width={100}
            height={100}
            className="animate-spin"
          />
          <p className="mt-4 text-lg font-semibold text-gray-700 text-center">
            Please be patient, <span className="text-green-600">GreenCloud</span> is working hard!
          </p>
        </div>
      )}

      {/* Search Bar */}
      {data && (
        <input
          type="text"
          className="mb-8 w-full max-w-md p-2 border rounded"
          placeholder="Search the tables..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      )}

      {/* Tables Section */}
      {data && (
        <>
          {renderTable(
            filteredData(data.extracted_contacts),
            ["Name", "Address", "Phone", "Email"],
            "Extracted Contacts",
            "extracted_contacts"
          )}
          {renderTable(
            filteredData(data.filtered_out.duplicates),
            ["Name", "Address", "Phone", "Email"],
            "Duplicates",
            "duplicates"
          )}
          {renderTable(
            filteredData(data.filtered_out.empty_records),
            ["Name", "Address", "Phone", "Email"],
            "Empty Records",
            "empty_records"
          )}
          {renderTable(
            data.filtered_out.failed_extractions,
            ["File Name", "Error"],
            "Failed Extractions",
            "failed_extractions"
          )}
        </>
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