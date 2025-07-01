"use client";
import React from "react";

const Authorization = () => {
  const handleConnect = () => {
    const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}&redirect_uri=${process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI}&response_type=code&access_type=offline&prompt=consent&scope=https://www.googleapis.com/auth/gmail.modify`;

    window.location.href = oauthUrl;
  };

  return (
    <div>
      <h2>Authorize Gmail Access</h2>
      <button onClick={handleConnect}>🔗 Connect</button>
    </div>
  );
};

export default Authorization;
