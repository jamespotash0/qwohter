import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, LogIn, Sparkles, Shield, Users } from "lucide-react";
interface LoginFormProps {
  onLogin: (username: string) => void;
}
const LoginForm = ({
  onLogin
}: LoginFormProps) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username && password) {
      onLogin(username);
    }
  };
  return <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and branding section */}
        <div className="text-center mb-8">
          <div className="mx-auto w-20 h-20 bg-primary rounded-2xl flex items-center justify-center mb-6 shadow-lg">
            <Building2 className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Contemporary Wall Systems
          </h1>
          <p className="text-slate-600 text-base">
            Professional Operable Wall Solutions
          </p>
        </div>

        {/* Login card */}
        <Card className="bg-white border border-slate-200 shadow-sm">
          <CardHeader className="text-center space-y-4 pb-8">
            <CardTitle className="text-2xl font-bold text-slate-900">
              Welcome Back
            </CardTitle>
            <CardDescription className="text-slate-600 text-base">
              Sign in to access your quote management system
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="username" className="text-slate-700 font-medium text-sm">
                  Username
                </Label>
                <Input id="username" type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Enter your username" required className="bg-slate-50 border-slate-200 h-12" />
              </div>

              <div className="space-y-3">
                <Label htmlFor="password" className="text-slate-700 font-medium text-sm">
                  Password
                </Label>
                <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" required className="bg-slate-50 border-slate-200 h-12" />
              </div>

              <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold h-12">
                <LogIn className="w-5 h-5 mr-2" />
                Sign In to Dashboard
              </Button>
            </form>

            {/* Features section */}
            
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-slate-500 text-sm">
            © 2024 Contemporary Wall Systems. All rights reserved.
          </p>
        </div>
      </div>
    </div>;
};
export default LoginForm;