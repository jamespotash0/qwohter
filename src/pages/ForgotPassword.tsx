import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useResetPassword } from "@/auth";
import { sanitizeInput } from "@/utils/security";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // ✅ v3.0.0: Use new auth mutation hook
  const { mutate: resetPassword, isPending: loading } = useResetPassword();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    resetPassword(
      { email },
      {
        onSuccess: () => {
          setSent(true);
          toast({
            title: "Reset link sent!",
            description: "Check your email for password reset instructions.",
          });
        },
        onError: (error: any) => {
          toast({
            title: "Error",
            description: error.message || "Failed to send reset email. Please try again.",
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleBackToSignIn = () => {
    navigate("/sign-in");
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Header with logo - matching landing page */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-transparent">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div
              className="flex items-center cursor-pointer"
              onClick={() => navigate('/')}
            >
              <img
                src="/logos/New_Landing_Page_Logo_DarkonLightBackground.svg"
                alt="Qwohter Logo"
                className="h-8 w-auto"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Background pattern with quote checkerboard design */}
      <div className="absolute inset-0">
        {/* Repeating quotation marks in checkerboard pattern */}
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: `
              url("data:image/svg+xml,%3Csvg width='120' height='120' xmlns='http://www.w3.org/2000/svg'%3E%3Ctext x='30' y='60' font-family='serif' font-size='60' fill='%23334155' opacity='0.5'%3E%22%3C/text%3E%3Ctext x='90' y='60' font-family='serif' font-size='60' fill='%23f97316' opacity='0.4'%3E%22%3C/text%3E%3Ctext x='60' y='30' font-family='serif' font-size='60' fill='%23334155' opacity='0.3'%3E%22%3C/text%3E%3Ctext x='60' y='90' font-family='serif' font-size='60' fill='%23334155' opacity='0.3'%3E%22%3C/text%3E%3C/svg%3E")
            `,
            backgroundSize: '120px 120px',
            backgroundRepeat: 'repeat'
          }}
        />

        {/* Alternating quotation pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: `
              url("data:image/svg+xml,%3Csvg width='120' height='120' xmlns='http://www.w3.org/2000/svg'%3E%3Ctext x='15' y='45' font-family='serif' font-size='40' fill='%23475569' opacity='0.6' transform='rotate(15)'%3E%E2%80%9C%3C/text%3E%3Ctext x='75' y='75' font-family='serif' font-size='40' fill='%23475569' opacity='0.6' transform='rotate(-15)'%3E%E2%80%9D%3C/text%3E%3C/svg%3E")
            `,
            backgroundSize: '120px 120px',
            backgroundRepeat: 'repeat',
            backgroundPosition: '60px 60px'
          }}
        />

        {/* Subtle gradient orbs for depth */}
        <div className="absolute top-20 left-20 w-32 h-32 bg-blue-100/6 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-40 h-40 bg-orange-100/4 rounded-full blur-3xl" />
      </div>

      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="w-full flex items-center justify-center">
          <div className="w-full relative z-10 max-w-md">
            {/* Main form card */}
            <Card className="bg-white border border-gray-200 shadow-lg rounded-2xl overflow-hidden">
              <CardHeader className="text-center space-y-4 pb-4 pt-8 px-8">
                {/* Icon */}
                <div className="mx-auto w-16 h-16 bg-gray-50 rounded-xl flex items-center justify-center border border-gray-200 mb-4">
                  <Mail className="w-6 h-6 text-gray-600" />
                </div>

                <div className="space-y-2">
                  <CardTitle className="text-3xl font-bold text-gray-900">
                    {sent ? "Check your email" : "Forgot password?"}
                  </CardTitle>
                  <CardDescription className="text-gray-600 text-sm leading-relaxed max-w-lg mx-auto">
                    {sent
                      ? "We've sent password reset instructions to your email address."
                      : "Enter your email address and we'll send you a link to reset your password."
                    }
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="px-8 pb-8 space-y-4">
                {!sent ? (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-gray-700 font-medium text-sm">
                        Email address
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(sanitizeInput.email(e.target.value))}
                        placeholder="Enter your email"
                        required
                        className="bg-white border-gray-300 h-12 placeholder:text-gray-400 focus:border-orange-500 focus:ring-orange-500"
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-slate-600 hover:bg-slate-700 text-white font-semibold h-12 transition-colors"
                      disabled={loading}
                    >
                      {loading ? "Sending..." : "Send reset link"}
                    </Button>
                  </form>
                ) : (
                  <div className="space-y-6">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center space-x-2">
                        <Mail className="w-5 h-5 text-green-600" />
                        <p className="text-sm font-medium text-green-800">Email sent successfully</p>
                      </div>
                      <p className="text-sm text-green-700 mt-1">
                        Please check your inbox and follow the instructions to reset your password.
                      </p>
                    </div>

                    <Button
                      onClick={() => setSent(false)}
                      variant="outline"
                      className="w-full h-12 border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      Send another email
                    </Button>
                  </div>
                )}

                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleBackToSignIn}
                    className="inline-flex items-center space-x-2 text-sm text-orange-500 hover:text-orange-600 font-medium transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to sign in</span>
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Footer */}
            <div className="text-center mt-8">
              <p className="text-gray-400 text-xs">
                © 2024 Qwohter. Secure & Professional.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;