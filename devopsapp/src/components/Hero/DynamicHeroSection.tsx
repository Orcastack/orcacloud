import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  IconButton,
  Fade,
  Grow,
  Slide,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Link } from 'react-router-dom';

interface ProjectStory {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  story: string[];
  animationType: 'particles' | 'waves' | 'circuit' | 'dataflow' | 'network';
  ctaText: string;
  ctaLink: string;
  color: string;
  gradient: string;
  accentColor: string;
  backgroundImage: string;
}

const ___projectStories: ProjectStory[] = [
  {
    id: 1,
    title: 'OrcaCloud Platform',
    subtitle: 'The Digital Backbone',
    description: 'Infrastructure that powers the future',
    story: [
      'In the heart of technological evolution lies a foundation built for scale.',
      'A modular stack that orchestrates services across medicine, agriculture, security, and analytics.',
      'Where OrcaCloud meets innovation, creating systems that adapt and evolve.',
      'The invisible force behind every breakthrough.'
    ],
    animationType: 'circuit',
    ctaText: 'Explore Platform',
    ctaLink: '/projects/orcacloud',
    color: '#1e293b',
    gradient: 'linear-gradient(135deg, #1e293b 0%, #3b82f6 50%, #6366f1 100%)',
    accentColor: '#3b82f6',
    backgroundImage: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80'
  },
  {
    id: 2,
    title: 'Planivar',
    subtitle: 'Reaching for the Stars',
    description: 'Pioneering OrcaCloud space technologies',
    story: [
      'Beyond the blue horizon lies infinite possibility.',
      'Advanced research platforms that decode the mysteries of the cosmos.',
      'Real-time scientific communication bridging Earth and the stars.',
      'Where human curiosity meets technological mastery.'
    ],
    animationType: 'particles',
    ctaText: 'Launch Exploration',
    ctaLink: '/projects/planivar',
    color: '#111827',
    gradient: 'linear-gradient(135deg, #111827 0%, #1e40af 50%, #3730a3 100%)',
    accentColor: '#1e40af',
    backgroundImage: 'https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?ixlib=rb-4.0.3&auto=format&fit=crop&w=2071&q=80'
  },
  {
    id: 3,
    title: 'Voltoraiq',
    subtitle: 'Powering Tomorrow',
    description: 'AI-driven solar energy optimization',
    story: [
      'The sun\'s energy captured, analyzed, and optimized.',
      'Intelligent systems that predict, monitor, and maximize solar potential.',
      'From individual panels to vast solar farms, every watt matters.',
      'Sustainable power meets artificial intelligence.'
    ],
    animationType: 'waves',
    ctaText: 'Harness Energy',
    ctaLink: '/projects/voltoraiq',
    color: '#1e3a8a',
    gradient: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #153d75 100%)',
    accentColor: '#153d75',
    backgroundImage: 'https://images.unsplash.com/photo-1466611653911-95081537e5b7?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80'
  },
  {
    id: 4,
    title: 'Osrovnet',
    subtitle: 'Digital Fortress',
    description: 'Advanced network security & threat intelligence',
    story: [
      'In a world of constant threats, defense is paramount.',
      'From protocol to perimeter, every connection secured.',
      'Real-time threat detection meets autonomous response.',
      'Where security meets OrcaCloud in the digital age.'
    ],
    animationType: 'network',
    ctaText: 'Secure Networks',
    ctaLink: '/projects/osrovnet',
    color: '#7c2d12',
    gradient: 'linear-gradient(135deg, #7c2d12 0%, #dc2626 50%, #b91c1c 100%)',
    accentColor: '#dc2626',
    backgroundImage: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80'
  },
  {
    id: 5,
    title: 'TujengePay',
    subtitle: 'Financial Freedom',
    description: 'Next-generation payment processing platform',
    story: [
      'Money moves at the speed of trust.',
      'Secure, scalable, and borderless financial transactions.',
      'From digital wallets to global payments, every transaction matters.',
      'Where blockchain meets financial inclusion.'
    ],
    animationType: 'dataflow',
    ctaText: 'Start Transacting',
    ctaLink: '/projects/tujengepay',
    color: '#166534',
    gradient: 'linear-gradient(135deg, #166534 0%, #16a34a 50%, #eab308 100%)',
    accentColor: '#eab308',
    backgroundImage: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80'
  }
];

const DynamicHeroSection: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showStory, setShowStory] = useState(false);
  const [storyIndex, setStoryIndex] = useState(0);
  const intervalRef = useRef<number | null>(null);
  const storyIntervalRef = useRef<number | null>(null);

  const currentStory = ___projectStories[currentIndex];
  const SLIDE_DURATION = 8000; // 8 seconds per project
  const STORY_DURATION = 2000; // 2 seconds per story line

  // Run the slideshow interval once. We don't want to recreate the interval on every index change
  // (that could lead to unexpected behavior). Manual selection still works via handleProjectSelect.
  useEffect(() => {
    intervalRef.current = window.setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % ___projectStories.length);
      setShowStory(false);
      setStoryIndex(0);
    }, SLIDE_DURATION);

    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Only start the story interval when showStory is true. Do not include storyIndex as a dependency
  // so we don't recreate the timer on every tick.
  useEffect(() => {
    if (!showStory || currentStory.story.length === 0) return;

    storyIntervalRef.current = window.setInterval(() => {
      setStoryIndex((prev) => {
        if (prev >= currentStory.story.length - 1) {
          setShowStory(false);
          return 0;
        }
        return prev + 1;
      });
    }, STORY_DURATION);

    return () => {
      if (storyIntervalRef.current) window.clearInterval(storyIntervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showStory, currentStory.story.length]);

  useEffect(() => {
    // Show story after 2 seconds
    const storyTimer = setTimeout(() => {
      setShowStory(true);
    }, 2000);

    return () => clearTimeout(storyTimer);
  }, [currentIndex]);

  const handleProjectSelect = (index: number) => {
    setCurrentIndex(index);
    setShowStory(false);
    setStoryIndex(0);
  };

  const renderAnimation = () => {
    switch (currentStory.animationType) {
      case 'particles':
        return <___ParticleAnimation color={currentStory.accentColor} />;
      case 'waves':
        return <___WaveAnimation color={currentStory.accentColor} />;
      case 'circuit':
        return <___CircuitAnimation color={currentStory.accentColor} />;
      case 'network':
        return <___NetworkAnimation color={currentStory.accentColor} />;
      case 'dataflow':
        return <___DataFlowAnimation color={currentStory.accentColor} />;
      default:
        return <___ParticleAnimation color={currentStory.accentColor} />;
    }
  };

  return (
    <Box
      sx={{
        position: 'relative',
        height: '70vh',
        overflow: 'hidden',
        backgroundImage: `url(${currentStory.backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Animated Background */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 1,
        }}
      >
        {renderAnimation()}
      </Box>

      {/* Overlay */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          // Use a semi-transparent black overlay on small screens (xs) so the background image remains visible,
          // and keep a translucent gradient on md+ for depth.
          background: { xs: 'rgba(0,0,0,0.6)', md: 'linear-gradient(135deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.4) 100%)' },
          zIndex: 2,
        }}
      />

      {/* Content */}
      <Container
        maxWidth="lg"
        sx={{
          position: 'relative',
          zIndex: 3,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
          // Make text white on small screens so it contrasts with the solid black overlay
          color: { xs: 'white', md: 'initial' },
          px: 4,
        }}
      >
        {/* Project Navigation Dots */}
        <Box
          sx={{
            position: 'absolute',
            top: 100,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: 2,
            zIndex: 4,
          }}
        >
          {___projectStories.map((_, index) => (
            <Box
              key={index}
              onClick={() => handleProjectSelect(index)}
              sx={{
                width: currentIndex === index ? 40 : 12,
                height: 4,
                backgroundColor: currentIndex === index ? '#000000' : 'rgba(0,0,0,0.5)',
                borderRadius: 2,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': {
                  backgroundColor: 'rgba(0,0,0,0.8)',
                },
              }}
            />
          ))}
        </Box>

        {/* Main Content */}
        <Box sx={{ maxWidth: '800px', width: '100%' }}>
          <Fade in={true} timeout={1000}>
            <Box>
              <Typography
                variant="h6"
                sx={{
                  color: { xs: 'white', md: '#1a1a1a' },
                  mb: 2,
                  fontWeight: 500,
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                  fontSize: '0.9rem',
                  textShadow: '0 2px 4px rgba(255,255,255,0.8)',
                }}
              >
                {currentStory.subtitle}
              </Typography>

              <Typography
                variant="h1"
                sx={{
                  // On small screens use white text so it shows over the solid black overlay.
                  // On md+ keep the existing gradient/text-clip styling.
                  color: { xs: 'white', md: undefined },
                  mb: 3,
                  fontWeight: 900,
                  fontSize: { xs: '3rem', md: '4.5rem', lg: '5.5rem' },
                  lineHeight: 1.1,
                  textShadow: { xs: '0 2px 6px rgba(0,0,0,0.6)', md: '0 4px 8px rgba(255,255,255,0.9), 0 2px 4px rgba(255,255,255,0.8)' },
                  background: { md: 'linear-gradient(135deg, #000000 0%, #333333 100%)' },
                  backgroundClip: { md: 'text' },
                  WebkitBackgroundClip: { md: 'text' },
                  WebkitTextFillColor: { xs: 'white', md: 'transparent' },
                }}
              >
                {currentStory.title}
              </Typography>

              <Typography
                variant="h4"
                sx={{
                  color: { xs: 'rgba(255,255,255,0.9)', md: '#2d2d2d' },
                  mb: 4,
                  fontWeight: 400,
                  fontSize: { xs: '1.5rem', md: '2rem' },
                  textShadow: '0 2px 4px rgba(255,255,255,0.7)',
                }}
              >
                {currentStory.description}
              </Typography>

              {/* Story Animation */}
              {showStory && (
                <Grow in={showStory} timeout={800}>
                  <Box sx={{ mb: 4, minHeight: '60px' }}>
                    <Typography
                      variant="h5"
                      sx={{
                        color: currentStory.accentColor,
                        fontWeight: 500,
                        fontSize: { xs: '1.2rem', md: '1.5rem' },
                        lineHeight: 1.4,
                        textShadow: '0 2px 4px rgba(255,255,255,0.8)',
                        animation: 'fadeInUp 0.8s ease-out',
                      }}
                    >
                      {currentStory.story[storyIndex]}
                    </Typography>
                  </Box>
                </Grow>
              )}

              {/* CTA Button */}
              <Slide direction="up" in={true} timeout={1200}>
                <Box>
                  <Button
                    component={Link}
                    to={currentStory.ctaLink}
                    variant="contained"
                    size="large"
                    sx={{
                      px: 8,
                      py: 3,
                      fontSize: '1.2rem',
                      fontWeight: 700,
                      background: 'rgba(0, 0, 0, 0.8)',
                      backdropFilter: 'blur(20px)',
                      border: '2px solid rgba(255, 255, 255, 0.3)',
                      color: 'white',
                      borderRadius: '50px',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': {
                        transform: 'translateY(-4px) scale(1.05)',
                        background: 'rgba(0, 0, 0, 0.9)',
                        boxShadow: '0 16px 48px rgba(0, 0, 0, 0.4)',
                        borderColor: 'rgba(255, 255, 255, 0.5)',
                      },
                      '&:active': {
                        transform: 'translateY(-2px) scale(1.02)',
                      },
                    }}
                  >
                    {currentStory.ctaText}
                  </Button>
                </Box>
              </Slide>
            </Box>
          </Fade>
        </Box>

        {/* Scroll Indicator */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 40,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 4,
            animation: 'bounce 2s infinite',
          }}
        >
          <IconButton
            onClick={() => {
              window.scrollTo({
                top: window.innerHeight,
                behavior: 'smooth',
              });
            }}
            sx={{
              color: { xs: 'white', md: '#000000' },
              opacity: 0.85,
              '&:hover': {
                opacity: 1,
                transform: 'scale(1.2)',
              },
              transition: 'all 0.3s ease',
            }}
          >
            <ExpandMoreIcon fontSize="large" />
          </IconButton>
        </Box>
      </Container>

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-10px);
          }
          60% {
            transform: translateY(-5px);
          }
        }
      `}</style>
    </Box>
  );
};

// Animation Components
const ___ParticleAnimation: React.FC<{ color: string }> = ({ color }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number | null = null;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resize();
    window.addEventListener('resize', resize);

    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      opacity: number;
    }> = [];

    for (let i = 0; i < 50; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        size: Math.random() * 3 + 1,
        opacity: Math.random() * 0.5 + 0.2,
      });
    }

    const animate = () => {
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;

        if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
        if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        // draw with global alpha to respect opacity
        const prevAlpha = ctx.globalAlpha;
        ctx.globalAlpha = particle.opacity;
        ctx.fillStyle = color;
        ctx.fill();
        ctx.globalAlpha = prevAlpha;
      });

      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      if (animationId !== null) cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [color]);

  return <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />;
};

const ___WaveAnimation: React.FC<{ color: string }> = ({ color }) => {
  return (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        '&::before, &::after': {
          content: '""',
          position: 'absolute',
          width: '200%',
          height: '200%',
          background: `radial-gradient(circle, ${color}20 0%, transparent 50%)`,
          animation: 'wave 8s ease-in-out infinite',
        },
        '&::after': {
          animationDelay: '-4s',
          opacity: 0.5,
        },
      }}
    >
      <style>{`
        @keyframes wave {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(1.2); }
        }
      `}</style>
    </Box>
  );
};

const ___CircuitAnimation: React.FC<{ color: string }> = ({ color }) => {
  return (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: `
          radial-gradient(circle at 20% 20%, ${color}15 0%, transparent 50%),
          radial-gradient(circle at 80% 80%, ${color}10 0%, transparent 50%),
          radial-gradient(circle at 40% 60%, ${color}08 0%, transparent 50%)
        `,
        '&::before': {
          content: '""',
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '400px',
          height: '400px',
          border: `2px solid ${color}30`,
          borderRadius: '50%',
          transform: 'translate(-50%, -50%)',
          animation: 'pulse 4s ease-in-out infinite',
        },
      }}
    >
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.3; }
          50% { transform: translate(-50%, -50%) scale(1.1); opacity: 0.6; }
        }
      `}</style>
    </Box>
  );
};

const ___NetworkAnimation: React.FC<{ color: string }> = ({ color }) => {
  return (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: `
          linear-gradient(45deg, ${color}05 25%, transparent 25%),
          linear-gradient(-45deg, ${color}05 25%, transparent 25%),
          linear-gradient(45deg, transparent 75%, ${color}05 75%),
          linear-gradient(-45deg, transparent 75%, ${color}05 75%)
        `,
        backgroundSize: '20px 20px',
        animation: 'networkShift 10s ease-in-out infinite',
      }}
    >
      <style>{`
        @keyframes networkShift {
          0%, 100% { background-position: 0 0, 0 10px, 10px -10px, -10px 0; }
          50% { background-position: 10px 10px, 10px 0, 0 -10px, -10px 10px; }
        }
      `}</style>
    </Box>
  );
};

const ___DataFlowAnimation: React.FC<{ color: string }> = ({ color }) => {
  return (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '2px',
          background: `linear-gradient(90deg, transparent 0%, ${color} 50%, transparent 100%)`,
          animation: 'dataFlow 3s linear infinite',
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          top: '50%',
          left: 0,
          width: '2px',
          height: '100%',
          background: `linear-gradient(180deg, transparent 0%, ${color} 50%, transparent 100%)`,
          animation: 'dataFlowVertical 4s linear infinite',
        },
      }}
    >
      <style>{`
        @keyframes dataFlow {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100vw); }
        }
        @keyframes dataFlowVertical {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
      `}</style>
    </Box>
  );
};

export default DynamicHeroSection;
