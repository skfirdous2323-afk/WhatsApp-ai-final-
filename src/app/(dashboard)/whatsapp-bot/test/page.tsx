"use client";

import { useState } from "react";

export default function TestBotPage() {
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("");

  const handleSend = () => {
    if (!message.trim()) return;

    if (message.toLowerCase() === "hi") {
      setReply(
        "👋 Welcome!\n\n1️⃣ Book Appointment\n2️⃣ Doctors\n3️⃣ Services\n4️⃣ Working Hours"
      );
    } else {
      setReply("🤖 Test Bot received: " + message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-xl rounded-xl bg-white p-6 shadow">
        <h1 className="mb-4 text-2xl font-bold">🧪 WhatsApp Bot Test</h1>

        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          className="w-full rounded border p-3"
        />

        <button
          onClick={handleSend}
          className="mt-4 rounded bg-green-600 px-5 py-2 text-white"
        >
          Send
        </button>

        {reply && (
          <div className="mt-6 rounded bg-green-50 p-4">
            <p className="whitespace-pre-line">{reply}</p>
          </div>
        )}
      </div>
    </div>
  );
}
