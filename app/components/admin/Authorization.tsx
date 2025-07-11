
"use client";
import React, { useState, useEffect } from "react";

const Authorization = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [connected, setConnected] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  useEffect(() => {
    async function fetchUserInfo() {
      try {
        const res = await fetch("/api/auth/userinfo");
        const data = await res.json();
        if (data.email) setEmail(data.email);
        if (data.connected) {
          const wasConnected = localStorage.getItem("gmail_connected");
          if (!wasConnected) {
            setShowSuccessPopup(true);
            localStorage.setItem("gmail_connected", "true");
          }
          setConnected(true);
        }
      } catch (err) {
        console.error("Failed to fetch user info:", err);
      }
    }
    fetchUserInfo();
  }, []);

  const handleConnect = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/google");
      const data = await res.json();
      if (data.url) {
        // Clear the localStorage flag before redirecting for OAuth
        localStorage.removeItem("gmail_connected");
        window.location.href = data.url;
      } else {
        alert("Failed to generate OAuth URL");
      }
    } catch (err) {
      console.error("OAuth URL fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const closeSuccessPopup = () => {
    setShowSuccessPopup(false);
  };

  return (
    <div className="min-h-[400px] flex flex-col justify-center items-center space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 text-center">
        Gmail Authorization
      </h2>

      {/* Success Popup */}
      {showSuccessPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
            <div className="text-center">
              <div className="text-green-500 text-6xl mb-4">✅</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Success!</h3>
              <p className="text-gray-600 mb-4">
                Gmail has been connected successfully!
              </p>
              <p className="text-sm text-gray-500 mb-6">
                <strong>Connected Email:</strong> {email}
              </p>
              <button
                onClick={closeSuccessPopup}
                className="px-6 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Connected Email Display */}
      {connected && email && (
        <div className="text-center">
          <p className="text-gray-600 mb-2">Connected Email:</p>
          <p className="text-lg font-medium text-gray-800">{email}</p>
        </div>
      )}

      {/* Warning for not connected */}
      {!connected && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md">
          <div className="flex items-center">
            <span className="text-yellow-500 text-xl">⚠️</span>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Gmail Not Connected
              </h3>
              <p className="text-sm text-yellow-700 mt-1">
                Connect your Gmail account to enable email functionality.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Connect Button */}
      <div>
        <button
          onClick={handleConnect}
          disabled={loading}
          className="inline-flex items-center px-6 py-3 text-base font-medium rounded-md text-white bg-black hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Connecting...
            </>
          ) : (
            <>🔗 {connected ? "Change Email" : "Connect Gmail"}</>
          )}
        </button>
      </div>
    </div>
  );
};

export default Authorization;

