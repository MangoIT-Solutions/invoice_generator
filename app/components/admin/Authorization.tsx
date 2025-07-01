"use client";
import React from "react";

const Authorization = () => {
  const handleConnect = () => {
    const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=76599357885-pb3foa3hc6fnbmo8bos9b7piol10s7t9.apps.googleusercontent.com&redirect_uri=http://localhost:3000/api/auth/callback&response_type=code&access_type=offline&prompt=consent&scope=https://www.googleapis.com/auth/gmail.modify`;

    console.log("Redirecting to OAuth URL:", oauthUrl);
    const myTimeout = setTimeout(() => {
      window.location.href = oauthUrl;
    }, 5000);
  };
  //accounts.google.com/o/oauth2/v2/auth?client_id=undefined&redirect_uri=undefined&response_type=code&access_type=offline&prompt=consent&scope=https://www.googleapis.com/auth/gmail.modify
  return (
    <div>
      <h2>Authorize Gmail Access</h2>
      <button onClick={handleConnect}>🔗 Connect</button>
    </div>
  );
};

export default Authorization;
