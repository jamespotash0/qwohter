
import { useState } from "react";
import LoginForm from "@/components/LoginForm";
import QuoteCreator from "@/components/QuoteCreator";

const Index = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<string>("");

  const handleLogin = (username: string) => {
    setIsLoggedIn(true);
    setUser(username);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUser("");
  };

  if (!isLoggedIn) {
    return <LoginForm onLogin={handleLogin} />;
  }

  return <QuoteCreator user={user} onLogout={handleLogout} />;
};

export default Index;
