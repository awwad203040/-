'use client';

interface AnimatedLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  alt?: string;
}

export default function AnimatedLogo({
  size = 'lg',
  className = '',
  alt = 'شعار نور القرآن',
}: AnimatedLogoProps) {
  // Dimensions & styling mapping
  const sizeConfig = {
    sm: {
      wrapper: 'w-8 h-8',
      rounded: 'rounded-xl',
      border: 'border border-[#C8A85B]/60',
      sparkleSize: 'w-2 h-2',
      showSparkles: false,
    },
    md: {
      wrapper: 'w-14 h-14',
      rounded: 'rounded-2xl',
      border: 'border-2 border-[#C8A85B]/70',
      sparkleSize: 'w-3 h-3',
      showSparkles: true,
    },
    lg: {
      wrapper: 'w-24 h-24 sm:w-28 sm:h-28',
      rounded: 'rounded-3xl',
      border: 'border-2 sm:border-[2.5px] border-[#C8A85B]/80',
      sparkleSize: 'w-4 h-4',
      showSparkles: true,
    },
    xl: {
      wrapper: 'w-32 h-32 sm:w-36 sm:h-36',
      rounded: 'rounded-3xl',
      border: 'border-3 border-[#C8A85B]',
      sparkleSize: 'w-5 h-5',
      showSparkles: true,
    },
  }[size];

  return (
    <div className={`relative inline-block select-none ${className}`}>
      {/* 1. Pulsing Golden Islamic Radiant Aura Behind Logo */}
      <div
        className={`absolute -inset-2 ${sizeConfig.rounded} bg-gradient-to-tr from-[#C8A85B]/40 via-[#F5D88A]/30 to-[#C8A85B]/40 animate-logo-aura -z-10 pointer-events-none`}
      />
      <div
        className={`absolute -inset-1 ${sizeConfig.rounded} bg-radial from-[#C8A85B]/30 via-transparent to-transparent animate-pulse -z-10 pointer-events-none`}
      />

      {/* 2. Main Logo Container with Floating Breathing Animation */}
      <div
        className={`relative ${sizeConfig.wrapper} ${sizeConfig.rounded} ${sizeConfig.border} overflow-hidden shadow-2xl animate-logo-breathing transform-gpu transition-all duration-300 hover:scale-105 active:scale-95`}
        style={{
          boxShadow: '0 8px 24px -4px rgba(200, 168, 91, 0.45), 0 4px 12px rgba(18, 59, 42, 0.25)',
        }}
      >
        {/* The Exact Original Logo Image */}
        <img
          src="/logo.png"
          alt={alt}
          className="w-full h-full object-cover pointer-events-none"
          loading="eager"
        />

        {/* 3. The Animated Flash Light Beam Sheen (Flash Sweep) */}
        <div
          className="absolute inset-0 pointer-events-none overflow-hidden"
          style={{ mixBlendMode: 'screen' }}
        >
          <div
            className="w-[200%] h-full animate-logo-flash"
            style={{
              background:
                'linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.05) 15%, rgba(255,255,255,0.4) 30%, rgba(255,248,220,0.95) 45%, rgba(255,255,255,0.9) 50%, rgba(255,248,220,0.95) 55%, rgba(255,255,255,0.4) 70%, rgba(255,255,255,0.05) 85%, transparent 100%)',
              filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.8))',
            }}
          />
        </div>

        {/* 4. Subtle Inner Golden Frame Rim Glow */}
        <div
          className={`absolute inset-0 ${sizeConfig.rounded} border border-white/25 pointer-events-none`}
        />
      </div>

      {/* 5. Glowing Star Glint Sparkles (Top-Right & Bottom-Left) */}
      {sizeConfig.showSparkles && (
        <>
          {/* Top-Right Sparkle */}
          <div
            className={`absolute -top-1 -right-1 ${sizeConfig.sparkleSize} text-[#FFE58F] animate-logo-sparkle pointer-events-none drop-shadow-[0_0_6px_#C8A85B]`}
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
            </svg>
          </div>

          {/* Bottom-Left Sparkle with slight delay */}
          <div
            className={`absolute -bottom-1 -left-1 ${sizeConfig.sparkleSize} text-[#FFF2B2] animate-logo-sparkle pointer-events-none drop-shadow-[0_0_6px_#C8A85B]`}
            style={{ animationDelay: '1.2s' }}
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
            </svg>
          </div>
        </>
      )}
    </div>
  );
}
