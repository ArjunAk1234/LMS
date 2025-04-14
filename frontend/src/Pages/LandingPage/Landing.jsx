import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, Users, Code, Facebook, Instagram, Linkedin } from 'lucide-react';
import { BsCpu } from 'react-icons/bs';
import {
  FaCode,
  FaLaptopCode,
  FaMobileAlt,
  FaShieldAlt,
  FaGamepad,
  FaRobot,
  FaRocket,
} from 'react-icons/fa';


const THEME = {
  darkBlue: 'rgba(18, 30, 71, 1)',
  orange: '#e48110',
  buttonBlue: '#4299e1',
  textLight: 'white',
  rippleWhite: 'rgba(255, 255, 255, 0.5)',
  buttonShadowLight: 'rgba(66, 153, 225, 0.3)',
  buttonShadowHover: 'rgba(66, 153, 225, 0.5)',
  buttonShadowActive: 'rgba(66, 153, 225, 0.3)'
};
const Landing = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const canvasRef = useRef(null);

  useEffect(() => {
    setIsLoaded(true);

    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    
    let elements = [];
    let energyBursts = [];
    let textParticles = [];
    let maxElements = Math.min(Math.max(window.innerWidth, window.innerHeight) / 8, 150);
    let mouseX = undefined;
    let mouseY = undefined;
    let mousePressed = false;
    let animationFrameId;
    let lastFrameTime = 0;

    
    function getColor(baseColor, intensity) {
      
      if (intensity > 0.7) return '#ffb050'; 
      if (intensity > 0.3) return '#e48110'; 
      return '#b35f00'; 
    }

    
    class FloatingElement {
      constructor(x, y, radius) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.baseRadius = radius;
        this.targetRadius = radius;
        this.vx = Math.random() * 0.5 - 0.25;
        this.vy = Math.random() * 0.5 - 0.25;
        this.maxSpeed = 2;
        this.friction = 0.95;
        this.color = THEME.orange;
        this.glowIntensity = Math.random() * 0.7 + 0.3;
        this.opacity = Math.random() * 0.5 + 0.2;
        this.targetOpacity = this.opacity;

        
        this.interactive = Math.random() > 0.7;
        this.attractionRadius = 150;
        this.repulsionRadius = 50;
        this.pulseSpeed = 0.03 + Math.random() * 0.03;
        this.pulseAngle = Math.random() * Math.PI * 2;

        
        this.connectedNodes = [];
        this.connectionDistance = 150;
        this.personality = Math.random();
        this.lifeTime = 0;
      }

      update(mouseX, mouseY, elements, time) {
        this.lifeTime += 0.01;

        
        if (mouseX !== undefined && mouseY !== undefined) {
          const dx = mouseX - this.x;
          const dy = mouseY - this.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < this.attractionRadius && distance > this.repulsionRadius) {
            
            const angle = Math.atan2(dy, dx);
            const force = (this.attractionRadius - distance) / 1000;

            this.vx += Math.cos(angle) * force * this.personality;
            this.vy += Math.sin(angle) * force * this.personality;

            
            this.targetRadius = this.baseRadius * 1.5;
            this.targetOpacity = Math.min(1, this.opacity * 1.5);
          }
          else if (distance < this.repulsionRadius) {
            
            const angle = Math.atan2(dy, dx);
            const force = (this.repulsionRadius - distance) / 500;

            this.vx -= Math.cos(angle) * force;
            this.vy -= Math.sin(angle) * force;

            this.targetRadius = this.baseRadius * 0.7;
            this.targetOpacity = this.opacity * 0.8;
          }
          else {
            
            this.targetRadius = this.baseRadius;
            this.targetOpacity = this.opacity;
          }
        }

        
        this.connectedNodes = [];
        let connectedCount = 0;

        for (let i = 0; i < elements.length && connectedCount < 3; i++) {
          const element = elements[i];
          if (element === this) continue;

          const dx = this.x - element.x;
          const dy = this.y - element.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < this.connectionDistance) {
            this.connectedNodes.push({
              element,
              distance,
              strength: 1 - (distance / this.connectionDistance)
            });
            connectedCount++;
          }
        }

        
        this.vx *= this.friction;
        this.vy *= this.friction;

        
        const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (currentSpeed > this.maxSpeed) {
          this.vx = (this.vx / currentSpeed) * this.maxSpeed;
          this.vy = (this.vy / currentSpeed) * this.maxSpeed;
        }

        
        this.x += this.vx;
        this.y += this.vy;

        
        const margin = 50;
        if (this.x < margin) {
          this.x = margin;
          this.vx *= -0.5;
        } else if (this.x > canvas.width - margin) {
          this.x = canvas.width - margin;
          this.vx *= -0.5;
        }

        if (this.y < margin) {
          this.y = margin;
          this.vy *= -0.5;
        } else if (this.y > canvas.height - margin) {
          this.y = canvas.height - margin;
          this.vy *= -0.5;
        }

        
        this.pulseAngle += this.pulseSpeed;
        const pulseAmount = Math.sin(this.pulseAngle) * 0.2;

        
        this.radius += (this.targetRadius - this.radius) * 0.1;
        this.radius *= (1 + pulseAmount * 0.3);
        this.opacity += (this.targetOpacity - this.opacity) * 0.05;
      }

      draw(ctx, time) {
        
        this.connectedNodes.forEach(connection => {
          ctx.beginPath();
          ctx.moveTo(this.x, this.y);
          ctx.lineTo(connection.element.x, connection.element.y);
          ctx.strokeStyle = `rgba(228, 129, 16, ${connection.strength * 0.1})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        });

        
        const glowRadius = this.radius * 3;
        const gradient = ctx.createRadialGradient(
          this.x, this.y, 0,
          this.x, this.y, glowRadius
        );

        gradient.addColorStop(0, `rgba(228, 129, 16, ${this.opacity * 0.8})`);
        gradient.addColorStop(1, 'rgba(228, 129, 16, 0)');

        ctx.beginPath();
        ctx.arc(this.x, this.y, glowRadius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
      }
    }

    
    let lastBurstTime = 0;
    function createEnergyBurst(x, y, particleCount) {
      
      const now = performance.now();
      if (now - lastBurstTime < 100) return;
      lastBurstTime = now;

      
      if (energyBursts.length > 50) {
        energyBursts.length = 50;
      }

      for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 4 + 1;
        const size = Math.random() * 1.5 + 0.5;

        energyBursts.push({
          x: x,
          y: y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius: size,
          life: 1.0,
          color: THEME.orange
        });
      }
    }

    
    function createPattern(elements, canvas) {
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      
      const interactiveElements = elements.filter(el => el.interactive);
      const particlesToAnimate = Math.min(interactiveElements.length, 30);

      
      for (let i = 0; i < particlesToAnimate; i++) {
        const element = interactiveElements[i];
        const angle = (i / particlesToAnimate) * Math.PI * 2;
        const radius = 150;

        const targetX = centerX + Math.cos(angle) * radius;
        const targetY = centerY + Math.sin(angle) * radius;

        
        const dx = targetX - element.x;
        const dy = targetY - element.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        element.vx += (dx / distance) * 2;
        element.vy += (dy / distance) * 2;
      }
    }

    
    
    const initializeElements = () => {
      elements = [];
      energyBursts = [];
      textParticles = [];

      
      maxElements = Math.min(Math.max(window.innerWidth, window.innerHeight) / 10, 100);

      
      for (let i = 0; i < maxElements; i++) {
        
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const radius = Math.random() * 2 + 1;

        const element = new FloatingElement(x, y, radius);
        element.interactive = Math.random() > 0.7;
        elements.push(element);
      }

      
      for (let i = 0; i < 5; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const radius = Math.random() * 3 + 2;

        const element = new FloatingElement(x, y, radius);
        element.interactive = true;
        element.opacity = 0.7;
        elements.push(element);
      }
    };

    
    const handlePointerMove = (e) => {
      const point = e.touches ? e.touches[0] : e;
      mouseX = point.clientX;
      mouseY = point.clientY;

      
      if (mousePressed && Math.random() < 0.1) {
        createEnergyBurst(mouseX, mouseY, 2);
      }
    };

    const handlePointerDown = (e) => {
      const point = e.touches ? e.touches[0] : e;
      mouseX = point.clientX;
      mouseY = point.clientY;
      mousePressed = true;

      
      createEnergyBurst(mouseX, mouseY, 10);
    };

    const handlePointerUp = () => {
      mousePressed = false;
    };

    
    const animate = (currentTime) => {
      
      if (currentTime - lastFrameTime < 16) { 
        animationFrameId = requestAnimationFrame(animate);
        return;
      }

      const deltaTime = currentTime - lastFrameTime;
      lastFrameTime = currentTime;

      
      ctx.fillStyle = `rgba(18, 30, 71, 0.3)`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      
      for (let i = energyBursts.length - 1; i >= 0; i--) {
        const burst = energyBursts[i];

        
        burst.x += burst.vx;
        burst.vy += 0.05;
        burst.y += burst.vy;
        burst.life -= 0.03;

        
        if (burst.life > 0) {
          ctx.beginPath();
          ctx.arc(burst.x, burst.y, burst.radius * burst.life, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(228, 129, 16, ${burst.life})`;
          ctx.fill();
        } else {
          energyBursts.splice(i, 1);
        }
      }

      
      elements.forEach(element => {
        element.update(mouseX, mouseY, elements, currentTime);
        element.draw(ctx, currentTime);
      });

      
      if (Math.random() < 0.0002) {
        createPattern(elements, canvas);
      }

      
      animationFrameId = requestAnimationFrame(animate);
    };

    
    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchmove', handlePointerMove, { passive: true });
    window.addEventListener('touchstart', handlePointerDown, { passive: true });
    window.addEventListener('touchend', handlePointerUp);

    
    initializeElements();
    animate(0);

    
    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchstart', handlePointerDown);
      window.removeEventListener('touchend', handlePointerUp);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const highlightedPrograms = [
    {
      id: 1,
      title: 'Web Development Fundamentals',
      description: 'Build beautiful websites using HTML, CSS, and JavaScript.',
      icon: <FaLaptopCode />
    },
    {
      id: 2,
      title: 'Programming',
      description: 'Understand core programming logic and write efficient code.',
      icon: <FaCode />
    },
    {
      id: 3,
      title: 'App Development',
      description: 'Create mobile apps for iOS and Android platforms.',
      icon: <FaMobileAlt />
    },
    {
      id: 4,
      title: 'Cyber Security',
      description: 'Learn to secure systems and protect data from threats.',
      icon: <FaShieldAlt />
    },
    {
      id: 5,
      title: 'Game Development',
      description: 'Design and develop interactive games using modern tools.',
      icon: <FaGamepad />
    },
    {
      id: 6,
      title: 'Artificial Intelligence',
      description: 'Explore machine learning, neural networks, and AI concepts.',
      icon: <BsCpu />
    },
    {
      id: 7,
      title: 'Robotics',
      description: 'Combine hardware and software to build autonomous machines.',
      icon: <FaRobot />
    },
    {
      id: 8,
      title: 'Aerospace Engineering',
      description: 'Delve into flight mechanics, propulsion, and space tech.',
      icon: <FaRocket />
    }
  ];
  return (
    <div style={{ backgroundColor: THEME.darkBlue }} className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Interactive Background Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-0"
      />

      {/* Overlay */}
      <div style={{ backgroundColor: 'rgba(15, 25, 60, 0.2)' }} className="absolute inset-0 z-0"></div>

      {/* Animated gradient background */}
      <div className="absolute inset-0 z-0 opacity-10 bg-gradient-radial from-orange-500 via-transparent to-transparent animate-pulse"></div>

      {/* Hero section */}
      <div className="relative z-10 px-4 sm:px-6 lg:px-8 py-20 md:py-28">
        <AnimatePresence>
          {isLoaded && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1 }}
              className="max-w-7xl mx-auto text-center"
            >
              <div className="relative">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0, rotate: -10 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  whileHover={{
                    scale: 1.2,
                    rotate: 15,
                    filter: "drop-shadow(0 0 10px #e48110)",
                    transition: { duration: 0.3 }
                  }}
                  transition={{
                    delay: 0.3,
                    duration: 0.7,
                    type: "spring",
                    stiffness: 100
                  }}
                  className="absolute -top-5 -right-20 text-8xl cursor-pointer"
                >
                  🌞
                </motion.div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: -30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.8 }}
                className="mb-8"
              >
                <div className="inline-block relative">
                  <div style={{ backgroundColor: THEME.orange }} className="absolute "></div>
                  <h1 className="relative text-5xl md:text-7xl font-bold text-white mb-4 p-1">
                    Welcome to ACM <span style={{ color: THEME.orange }}>Summer School</span>
                  </h1>
                </div>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.8 }}
                className="text-xl md:text-2xl text-gray-300 mb-10 max-w-3xl mx-auto"
              >
                Dive into a season of learning, coding, and growing with our interactive learning management system
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.8 }}
                className="flex flex-col sm:flex-row gap-6 justify-center"
              >
                <motion.a
                  href="/login"
                  whileHover={{
                    scale: 1.05,
                    boxShadow: `0 8px 25px ${THEME.buttonShadowHover}`
                  }}
                  whileTap={{ scale: 0.95 }}
                  className="login-btn relative w-[140px] h-[75px] flex items-center justify-center text-[var(--text-light)] text-xl font-semibold tracking-wide border-none rounded-[var(--border-radius-sm)] cursor-pointer transition-all duration-300 ease-in-out shadow-[0_5px_15px_var(--button-shadow-light)] overflow-hidden z-[1] bg-gradient-to-r from-[var(--button-blue)] to-[var(--primary-color)] focus:outline-none no-underline"
                >
                  Login
                </motion.a>
                <motion.a
                  href="/signup"
                  whileHover={{
                    scale: 1.05,
                    boxShadow: `0 8px 25px ${THEME.buttonShadowHover}`
                  }}
                  whileTap={{ scale: 0.95 }}
                  className="login-btn relative w-[140px] h-[75px] flex items-center justify-center text-[var(--text-light)] text-xl font-semibold tracking-wide border-none rounded-[var(--border-radius-sm)] cursor-pointer transition-all duration-300 ease-in-out shadow-[0_5px_15px_var(--button-shadow-light)] overflow-hidden z-[1] bg-gradient-to-r from-[var(--button-blue)] to-[var(--primary-color)] focus:outline-none no-underline"
                >
                  Sign Up
                </motion.a>

              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Wave divider */}
      <div className="relative z-10">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 160">
      <path
            fill="rgba(15, 25, 60, 1)"
            fillOpacity="1"
            d="M0,128L48,112C96,96,192,64,288,64C384,64,480,96,576,96C672,96,768,64,864,64C960,64,1056,96,1152,112C1248,128,1344,128,1392,128L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
          ></path>
        </svg>
      </div>

      {/* Highlighted programs section */}
      <div style={{ backgroundColor: 'rgba(15, 25, 60, 1)' }} className="relative z-10 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
              <span style={{ color: THEME.orange }}>
                Highlighted Programs
              </span>
            </h2>
            <div style={{ backgroundColor: THEME.orange }} className="w-20 h-1 mx-auto rounded-full"></div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mt-12">
            {highlightedPrograms.map((program) => (
              <motion.div
                key={program.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: program.id * 0.1, duration: 0.5 }}
                whileHover={{
                  y: -10,
                  boxShadow: `0 10px 25px -5px ${THEME.orange}40`,
                  transition: { duration: 0.2 }
                }}
                style={{
                  background: `linear-gradient(135deg, rgba(23, 38, 85, 0.9) 0%, rgba(18, 30, 71, 1) 100%)`,
                  borderColor: 'rgba(30, 45, 100, 1)'
                }}
                className="p-6 rounded-2xl shadow-md border hover:border-orange-400 transition-all duration-300 backdrop-filter backdrop-blur-lg"
              >
                <div
                  style={{ backgroundColor: 'rgba(30, 45, 100, 1)' }}
                  className="text-4xl text-orange-400 mb-4 inline-block p-3 rounded-2xl"
                >
                  {program.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{program.title}</h3>
                <p className="text-gray-300 mb-4">{program.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer style={{ backgroundColor: THEME.darkBlue }} className="relative z-10 text-white py-12 px-4 sm:px-6 lg:px-8 border-t border-gray-800">
        <div className="max-w-7xl mx-auto flex justify-between gap-10">
          <div className="flex-1">
            <h3 className="text-xl font-bold mb-4 flex items-center">
              <span style={{ backgroundColor: THEME.orange }} className="mr-2 w-3 h-3 inline-block rounded-full"></span>
              ACM Summer School
            </h3>
            <p className="text-gray-300">Empowering students with cutting-edge technical education.</p>
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold mb-4 flex items-center">
              <span style={{ backgroundColor: THEME.orange }} className="mr-2 w-3 h-3 inline-block rounded-full"></span>
              Connect With Us
            </h3>
            <div className="flex flex-wrap space-x-4 text-sm">
              <a href="https://acm-amritapuri.vercel.app/" target="_blank" rel="noopener noreferrer" className="hover:text-orange-400 transition flex items-center" style={{ color: 'rgb(200, 200, 220)' }}>
                <ExternalLink className="w-4 h-4 mr-2" />About Us
              </a>
              <a href="https://github.com/ACM-Amrita-Amritapuri" target="_blank" rel="noopener noreferrer" className="hover:text-orange-400 transition flex items-center" style={{ color: 'rgb(200, 200, 220)' }}>
                <Code className="w-4 h-4 mr-2" />Github
              </a>
              <a href="https://www.facebook.com/acm.amrita" target="_blank" rel="noopener noreferrer" className="hover:text-orange-400 transition flex items-center" style={{ color: 'rgb(200, 200, 220)' }}>
                <Users className="w-4 h-4 mr-2" />Facebook
              </a>
              <a href="https://www.instagram.com/acm.amrita/" target="_blank" rel="noopener noreferrer" className="hover:text-orange-400 transition flex items-center" style={{ color: 'rgb(200, 200, 220)' }}>
                <Instagram className="w-4 h-4 mr-2" />Instagram
              </a>
              <a href="https://www.linkedin.com/company/acm-student-chapter-amrita-amritapuri/posts/?feedView=all" target="_blank" rel="noopener noreferrer" className="hover:text-orange-400 transition flex items-center" style={{ color: 'rgb(200, 200, 220)' }}>
                <Linkedin className="w-4 h-4 mr-2" />LinkedIn
              </a>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-10 pt-6 border-t border-gray-800 text-center text-gray-400">
          <p>© 2025 ACM Summer School. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;