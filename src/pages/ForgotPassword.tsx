/**
 * Forgot Password Page - Matches Auth.tsx Design
 *
 * Matches the landing page aesthetic:
 * - Warm cream (#FFFEFA) background
 * - Pink gradient panel with coral blur orbs
 * - Urbanist typography
 * - Clean, award-winning design
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
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

  const { mutate: resetPassword, isPending: loading } = useResetPassword();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    resetPassword(
      email,
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

  return (
    <div className="min-h-screen bg-[#FFFEFA] flex">
      {/* Left Panel - Cream & Pink Style */}
      <div className="hidden lg:flex lg:w-[42%] xl:w-[45%] bg-gradient-to-br from-[#FFFEFA] via-[#FFF9F7] to-[#FFE8E3] flex-col items-center justify-center p-10 xl:p-12 relative overflow-hidden">
        {/* Soft pink blur orbs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute top-[-100px] right-[-150px] w-[500px] h-[500px] rounded-full blur-[100px] opacity-40"
            style={{ background: '#EE6C4D' }}
          />
          <div
            className="absolute bottom-[-100px] left-[-100px] w-[400px] h-[400px] rounded-full blur-[80px] opacity-30"
            style={{ background: '#F7C4BB' }}
          />
        </div>

        {/* Centered Content */}
        <div className="relative z-10 text-center max-w-[600px] px-4">
          {/* Logo */}
          <div
            className="cursor-pointer mb-8"
            onClick={() => navigate('/')}
          >
            <img
              src="/logos/New_Landing_Page_Logo_DarkonLightBackground.svg"
              alt="Qwohter"
              className="h-[42px] w-auto mx-auto"
            />
          </div>

          {/* Main Title */}
          <h1
            className="text-[28px] xl:text-[32px] leading-[1.2] tracking-[-0.01em] text-[#171717] mb-8"
            style={{
              fontFamily: 'Urbanist, sans-serif',
              fontWeight: 600,
            }}
          >
            Don't worry, we've got you.
            <br />
            Reset your password in seconds.
          </h1>

          {/* Trusted By Section */}
          <div className="pt-6 border-t border-[#171717]/10">
            <p
              className="text-sm text-[#171717]/50 mb-3"
              style={{ fontFamily: 'Urbanist, sans-serif' }}
            >
              Trusted by companies in these industries
            </p>
            <p
              className="text-sm text-[#171717]/70"
              style={{ fontFamily: 'Urbanist, sans-serif' }}
            >
              Construction · Landscaping · HVAC · Roofing · Electrical · Plumbing
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Form Area */}
      <div className="flex-1 flex flex-col min-h-screen bg-[#FFF9F7]">
        {/* Mobile header */}
        <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-[#FFF9F7]/90 backdrop-blur-md border-b border-[#171717]/5">
          <div className="px-6 py-4">
            <div
              className="cursor-pointer"
              onClick={() => navigate('/')}
            >
              <img
                src="/logos/New_Landing_Page_Logo_DarkonLightBackground.svg"
                alt="Qwohter"
                className="h-7 w-auto"
              />
            </div>
          </div>
        </header>

        {/* Form container */}
        <div className="flex-1 flex items-center justify-center px-6 py-20 lg:py-12">
          <div className="w-full max-w-[420px]">
            {/* Step header */}
            <div className="mb-6 text-center">
              <h2
                className="text-[28px] text-[#171717] tracking-[0.3px] leading-[1.2] mb-1"
                style={{ fontFamily: 'Urbanist, sans-serif', fontWeight: 600 }}
              >
                {sent ? "Check your email" : "Forgot password?"}
              </h2>
              <p
                className="text-[#171717]/50 text-sm"
                style={{ fontFamily: 'Urbanist, sans-serif', fontWeight: 400 }}
              >
                {sent
                  ? "We've sent password reset instructions to your email address."
                  : "Enter your email address and we'll send you a link to reset your password."
                }
              </p>
            </div>

            {/* Form */}
            <div>
              {!sent ? (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label
                      htmlFor="email"
                      className="text-[#171717] text-sm"
                      style={{ fontFamily: 'Urbanist, sans-serif', fontWeight: 500 }}
                    >
                      Email address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(sanitizeInput.email(e.target.value))}
                      placeholder="Enter your email"
                      required
                      className="h-12 bg-[#f7f2e9]/50 border-[#171717]/10 rounded-full placeholder:text-[#171717]/30 focus:border-[#EE6C4D] focus:ring-[#EE6C4D]/20"
                      style={{ fontFamily: 'Urbanist, sans-serif' }}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 bg-[#ee6c4d] hover:bg-[#ee6c4d]/90 text-white font-semibold rounded-full transition-all duration-200"
                    style={{ fontFamily: 'Urbanist, sans-serif' }}
                    disabled={loading}
                  >
                    {loading ? "Sending..." : "Send reset link"}
                  </Button>
                </form>
              ) : (
                <div className="space-y-5">
                  <div className="bg-[#ECFDF5] border border-[#10B981]/20 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <Mail className="w-5 h-5 text-[#10B981]" />
                      <p
                        className="text-sm font-medium text-[#065F46]"
                        style={{ fontFamily: 'Urbanist, sans-serif' }}
                      >
                        Email sent successfully
                      </p>
                    </div>
                    <p
                      className="text-sm text-[#047857] mt-1"
                      style={{ fontFamily: 'Urbanist, sans-serif' }}
                    >
                      Please check your inbox and follow the instructions to reset your password.
                    </p>
                  </div>

                  <Button
                    onClick={() => setSent(false)}
                    variant="outline"
                    className="w-full h-12 border-[#171717]/10 text-[#171717] hover:bg-[#171717]/5 rounded-full"
                    style={{ fontFamily: 'Urbanist, sans-serif', fontWeight: 500 }}
                  >
                    Send another email
                  </Button>
                </div>
              )}

              {/* Back to sign in */}
              <div className="text-center mt-6">
                <button
                  type="button"
                  onClick={() => navigate("/sign-in")}
                  className="inline-flex items-center space-x-2 text-sm text-[#EE6C4D] hover:text-[#EE6C4D]/80 transition-colors"
                  style={{ fontFamily: 'Urbanist, sans-serif', fontWeight: 500 }}
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to sign in</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
