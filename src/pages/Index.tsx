
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/auth";

const Index = (): React.ReactElement | null => {
  const navigate = useNavigate();

  // ✅ v3.0.0: Use new auth hook
  const user = useUser();

  useEffect(() => {
    // Redirect based on auth status
    if (user) {
      navigate("/dashboard");
    } else {
      navigate("/auth");
    }
  }, [user, navigate]);

  return null;
};

export default Index;
