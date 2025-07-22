
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import LoginForm from "@/components/LoginForm";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    const loggedInUser = localStorage.getItem("loggedInUser");
    if (loggedInUser) {
      navigate("/dashboard");
    }
  }, [navigate]);

  const handleLogin = (username: string) => {
    localStorage.setItem("loggedInUser", username);
    navigate("/dashboard");
  };

  return <LoginForm onLogin={handleLogin} />;
};

export default Index;
