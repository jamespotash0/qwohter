import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home } from "lucide-react";

/**
 * Shattered Mirror / Magnifying Glass Illustration
 * Searching through broken glass for something that doesn't exist
 */
const ShatteredMirrorSearch = () => (
  <div className="relative w-64 h-64 mx-auto mb-8">
    {/* Scattered glass shards in background */}
    <div className="absolute inset-0">
      {/* Large shard top-left */}
      <div
        className="absolute top-4 left-2 w-12 h-16 bg-gradient-to-br from-white/80 via-white/40 to-transparent rotate-12 rounded-sm"
        style={{
          clipPath: 'polygon(20% 0%, 100% 10%, 80% 100%, 0% 80%)',
          boxShadow: 'inset 0 0 20px rgba(255,255,255,0.5)'
        }}
      />
      {/* Medium shard top-right */}
      <div
        className="absolute top-8 right-8 w-8 h-12 bg-gradient-to-bl from-white/70 via-white/30 to-transparent -rotate-20 rounded-sm"
        style={{
          clipPath: 'polygon(0% 20%, 100% 0%, 80% 100%, 10% 90%)',
          boxShadow: 'inset 0 0 15px rgba(255,255,255,0.4)'
        }}
      />
      {/* Small shard bottom-left */}
      <div
        className="absolute bottom-16 left-8 w-6 h-8 bg-gradient-to-tr from-white/60 via-white/20 to-transparent rotate-45 rounded-sm"
        style={{
          clipPath: 'polygon(10% 0%, 90% 20%, 100% 100%, 0% 80%)',
          boxShadow: 'inset 0 0 10px rgba(255,255,255,0.3)'
        }}
      />
      {/* Tiny shards scattered */}
      <div className="absolute top-20 left-16 w-3 h-4 bg-white/40 rotate-30 rounded-sm" />
      <div className="absolute bottom-24 right-12 w-4 h-3 bg-white/30 -rotate-15 rounded-sm" />
      <div className="absolute top-32 right-4 w-2 h-3 bg-white/25 rotate-60 rounded-sm" />
    </div>

    {/* Main broken mirror frame */}
    <div className="absolute inset-8 rounded-3xl overflow-hidden">
      {/* Mirror surface with cracks */}
      <div
        className="w-full h-full bg-gradient-to-br from-[#f7f2e9]/90 via-white/60 to-[#f7f2e9]/40 backdrop-blur-sm border-2 border-white/50 rounded-3xl relative"
        style={{ boxShadow: 'inset 0 0 60px rgba(255,255,255,0.5), 0 8px 32px rgba(0,0,0,0.1)' }}
      >
        {/* Crack lines */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path d="M50 0 L52 35 L65 50 L50 100" stroke="rgba(23,23,23,0.1)" strokeWidth="0.5" fill="none" />
          <path d="M50 0 L48 30 L35 55 L30 100" stroke="rgba(23,23,23,0.08)" strokeWidth="0.5" fill="none" />
          <path d="M52 35 L80 40" stroke="rgba(23,23,23,0.06)" strokeWidth="0.5" fill="none" />
          <path d="M48 30 L20 25" stroke="rgba(23,23,23,0.06)" strokeWidth="0.5" fill="none" />
          <path d="M65 50 L95 60" stroke="rgba(23,23,23,0.05)" strokeWidth="0.5" fill="none" />
        </svg>

        {/* Reflection/glare */}
        <div className="absolute top-4 left-4 w-16 h-8 bg-gradient-to-br from-white/60 to-transparent rounded-full blur-sm transform -rotate-45" />

        {/* 404 text reflected/distorted in mirror */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="text-6xl font-bold text-[#171717]/10 tracking-widest"
            style={{
              fontFamily: 'Urbanist, sans-serif',
              textShadow: '2px 2px 0 rgba(255,255,255,0.5)'
            }}
          >
            404
          </span>
        </div>
      </div>
    </div>

    {/* Magnifying glass searching */}
    <div className="absolute -bottom-4 -right-4 transform rotate-45 animate-pulse">
      {/* Glass lens */}
      <div
        className="w-20 h-20 rounded-full border-4 border-[#171717]/20 bg-gradient-to-br from-white/40 via-transparent to-white/20 backdrop-blur-sm"
        style={{ boxShadow: 'inset 0 0 30px rgba(255,255,255,0.3), 0 4px 20px rgba(0,0,0,0.1)' }}
      >
        {/* Lens reflection */}
        <div className="absolute top-2 left-2 w-6 h-4 bg-white/50 rounded-full blur-sm transform -rotate-45" />
        {/* Question mark in lens - searching */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl text-[#ee6c4d]/40 font-bold" style={{ fontFamily: 'Urbanist, sans-serif' }}>?</span>
        </div>
      </div>
      {/* Handle */}
      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-4 h-12 bg-gradient-to-b from-[#171717]/20 to-[#171717]/30 rounded-full transform -rotate-45 origin-top" />
    </div>

    {/* Floating sparkles/dust particles */}
    <div className="absolute top-12 left-20 w-1 h-1 bg-white rounded-full animate-ping" style={{ animationDelay: '0s', animationDuration: '2s' }} />
    <div className="absolute top-24 right-16 w-1.5 h-1.5 bg-white/80 rounded-full animate-ping" style={{ animationDelay: '0.5s', animationDuration: '2.5s' }} />
    <div className="absolute bottom-20 left-12 w-1 h-1 bg-white/60 rounded-full animate-ping" style={{ animationDelay: '1s', animationDuration: '3s' }} />
    <div className="absolute top-16 right-8 w-0.5 h-0.5 bg-white rounded-full animate-ping" style={{ animationDelay: '1.5s', animationDuration: '2s' }} />
  </div>
);

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#FFFEFA] via-[#FFF9F7] to-[#FFE8E3] p-4 overflow-hidden">
      {/* Frosted glass background layers */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Large blurred shapes */}
        <div className="absolute -top-20 -left-20 w-96 h-96 bg-[#ee6c4d]/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] bg-[#f7f2e9]/60 rounded-full blur-3xl" />
        <div className="absolute top-1/3 left-1/2 w-64 h-64 bg-white/30 rounded-full blur-3xl" />

        {/* Subtle grid pattern suggesting broken glass */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(23,23,23,1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(23,23,23,1) 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-lg text-center">
        {/* Illustration */}
        <ShatteredMirrorSearch />

        {/* Message */}
        <h1
          className="text-3xl font-bold text-[#171717] mb-3"
          style={{ fontFamily: 'Urbanist, sans-serif' }}
        >
          Nothing here
        </h1>
        <p
          className="text-[#171717]/50 mb-8 max-w-xs mx-auto"
          style={{ fontFamily: 'Urbanist, sans-serif' }}
        >
          We searched everywhere but couldn't find what you're looking for
        </p>

        {/* Action buttons */}
        <div className="flex gap-3 justify-center">
          <Button
            onClick={() => navigate(-1)}
            className="h-12 px-6 rounded-full bg-[#ee6c4d] hover:bg-[#d95b3e] text-white font-semibold flex items-center gap-2 shadow-lg shadow-[#ee6c4d]/20"
            style={{ fontFamily: 'Urbanist, sans-serif' }}
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </Button>
          <Button
            onClick={() => navigate('/dashboard')}
            variant="outline"
            className="h-12 px-6 rounded-full border-[#171717]/15 text-[#171717]/70 hover:text-[#171717] hover:bg-white/50 font-medium flex items-center gap-2 backdrop-blur-sm"
            style={{ fontFamily: 'Urbanist, sans-serif' }}
          >
            <Home className="w-4 h-4" />
            Dashboard
          </Button>
        </div>

        {/* Subtle footer */}
        <p
          className="text-xs text-[#171717]/25 mt-10"
          style={{ fontFamily: 'Urbanist, sans-serif' }}
        >
          Error 404 — Page not found
        </p>
      </div>
    </div>
  );
};

export default NotFound;
