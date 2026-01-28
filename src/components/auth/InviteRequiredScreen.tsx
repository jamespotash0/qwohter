/**
 * Invite Required Screen
 *
 * Shown when users navigate to /create-account without an invite token.
 * Directs them to request a demo to get started.
 */

import { Calendar, ArrowRight } from "lucide-react";

export function InviteRequiredScreen() {
  const handleRequestDemo = () => {
    // Uses current origin so it works for both localhost and production
    window.location.href = `${window.location.origin}/demo`;
  };

  const handleContactUs = () => {
    window.location.href = "mailto:info@qwohter.com?subject=Demo Request";
  };

  const handleSignIn = () => {
    // Uses current origin so it works for both localhost and production
    window.location.href = `${window.location.origin}/sign-in`;
  };

  return (
    <div className="text-center">
      {/* Title */}
      <h2
        className="text-[28px] text-[#171717] tracking-[0.3px] leading-[1.2] mb-3"
        style={{ fontFamily: "Urbanist, sans-serif", fontWeight: 600 }}
      >
        Invitation Required
      </h2>

      {/* Description */}
      <p
        className="text-[#171717]/60 text-base mb-8 max-w-sm mx-auto"
        style={{ fontFamily: "Urbanist, sans-serif" }}
      >
        Qwohter is currently invite-only. Schedule a demo to see how we can help
        automate your proposals and billing.
      </p>

      {/* Primary CTA - Request Demo */}
      <button
        onClick={handleRequestDemo}
        className="w-full flex items-center justify-center gap-2 bg-[#EE6C4D] hover:bg-[#d85a3d] text-white py-3.5 px-6 rounded-xl font-medium transition-colors mb-3"
        style={{ fontFamily: "Urbanist, sans-serif" }}
      >
        <Calendar className="w-5 h-5" />
        Schedule a Demo
        <ArrowRight className="w-4 h-4" />
      </button>

      {/* Secondary CTA - Contact */}
      <button
        onClick={handleContactUs}
        className="w-full flex items-center justify-center bg-transparent hover:bg-[#171717]/5 text-[#171717]/70 py-3.5 px-6 rounded-xl font-medium transition-colors border border-[#171717]/10"
        style={{ fontFamily: "Urbanist, sans-serif" }}
      >
        Contact Us
      </button>

      {/* Divider */}
      <div className="flex items-center gap-4 my-8">
        <div className="flex-1 h-px bg-[#171717]/10" />
        <span
          className="text-sm text-[#171717]/40"
          style={{ fontFamily: "Urbanist, sans-serif" }}
        >
          Already have an account?
        </span>
        <div className="flex-1 h-px bg-[#171717]/10" />
      </div>

      {/* Sign in button */}
      <button
        onClick={handleSignIn}
        className="inline-flex items-center justify-center bg-transparent hover:bg-[#EE6C4D]/5 text-[#EE6C4D] text-sm py-2 px-5 rounded-full font-medium transition-colors border border-[#EE6C4D]/30"
        style={{ fontFamily: "Urbanist, sans-serif" }}
      >
        Sign in
      </button>
    </div>
  );
}
