import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const logsFilePath = path.join(
  process.cwd(),
  "data",
  "logs",
  "production-logs.json",
);

async function getLogs() {
  try {
    const data = await fs.readFile(logsFilePath, "utf8");
    // If the file is empty, return an empty array to avoid JSON parsing errors.
    if (!data) {
      return [];
    }
    return JSON.parse(data);
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    // If the file doesn't exist (ENOENT), it's a valid state, not an error.
    if (err.code === "ENOENT") {
      return [];
    }
    // For any other errors (e.g., malformed JSON, permissions), log it.
    console.error("Error reading or parsing logs file:", err);
    return []; // Return empty array to prevent crashing the endpoint.
  }
}

export async function GET() {
  try {
    const logs = await getLogs();
    return NextResponse.json(logs);
  } catch (error) {
    console.error("Error reading logs:", error);
    return NextResponse.json({ error: "Failed to read logs" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const newLog = await request.json();
    const logs = await getLogs();
    logs.unshift(newLog); // Add new log to the beginning of the array
    await fs.writeFile(logsFilePath, JSON.stringify(logs, null, 2));
    return NextResponse.json({ message: "Log saved successfully" });
  } catch (error) {
    console.error("Error saving log:", error);
    return NextResponse.json({ error: "Failed to save log" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    // Clear the file by writing an empty array
    await fs.writeFile(logsFilePath, JSON.stringify([], null, 2));
    return NextResponse.json({ message: "Logs cleared successfully" });
  } catch (error) {
    console.error("Error clearing logs:", error);
    return NextResponse.json(
      { error: "Failed to clear logs" },
      { status: 500 },
    );
  }
}
