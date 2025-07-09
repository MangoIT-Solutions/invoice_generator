"use client";
import React from "react";

const Authorization = () => {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const redirectUri = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI;

  const scopes = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/gmail.send"
  ].join(" ");

  const handleConnect = () => {
    const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&access_type=offline&prompt=consent&scope=${encodeURIComponent(scopes)}`;

    console.log("Redirecting to OAuth URL:", oauthUrl);
    setTimeout(() => {
      window.location.href = oauthUrl;
    }, 5000);
  };

  return (
    <div>
      <h2>Authorize Gmail Access</h2>
      <button onClick={handleConnect}>🔗 Connect</button>
    </div>
  );
};

export default Authorization;
