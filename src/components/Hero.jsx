import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, MapPin, Calendar, Users, Play, ArrowRight, Star } from 'lucide-react';

const Hero = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const particlesRef = useRef(null);

  const destinations = [
    {
      id: 1,
      title: "Santorini",
      country: "Grčka",
      subtitle: "Bela kuća i plave kupole",
      image: "https://images.pexels.com/photos/161901/santorini-travel-blue-water-161901.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop",
      price: "899€",
      rating: 4.9,
      reviews: 2847,
      color: "#2563eb"
    },
    {
      id: 2,
      title: "Dubrovnik",
      country: "Hrvatska", 
      subtitle: "Perla Jadranskog mora",
      image: "https://images.pexels.com/photos/2901209/pexels-photo-2901209.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop",
      price: "599€",
      rating: 4.8,
      reviews: 1923,
      color: "#dc2626"
    },
    {
      id: 3,
      title: "Phuket",
      country: "Tajland",
      subtitle: "Tropski raj Azije",
      image: "https://images.pexels.com/photos/1059078/pexels-photo-1059078.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop",
      price: "1299€",
      rating: 4.7,
      reviews: 3156,
      color: "#059669"
    },
    {
      id: 4,
      title: "Barcelona",
      country: "Španija",
      subtitle: "Gaudi i mediteranska čarolija",
      image: "https://images.pexels.com/photos/819764/pexels-photo-819764.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop",
      price: "799€",
      rating: 4.8,
      reviews: 2634,
      color: "#7c3aed"
    }
  ];

  useEffect(() => {
    setIsLoaded(true);
    
    // Initialize particles
    if (window.particlesJS) {
      window.particlesJS('particles-js', {
        particles: {
          number: {
            value: 80,
            density: {
              enable: true,
              value_area: 800
            }
          },
          color: {
            value: "#ffffff"
          },
          shape: {
            type: "circle",
            stroke: {
              width: 0,
              color: "#000000"
            }
          },
          opacity: {
            value: 0.1,
            random: true,
            anim: {
              enable: true,
              speed: 1,
              opacity_min: 0.05,
              sync: false
            }
          },
          size: {
            value: 3,
            random: true,
            anim: {
              enable: true,
              speed: 2,
              size_min: 0.1,
              sync: false
            }
          },
          line_linked: {
            enable: true,
            distance: 150,
            color: "#ffffff",
            opacity: 0.05,
            width: 1
          },
          move: {
            enable: true,
            speed: 1,
            direction: "none",
            random: false,
            straight: false,
            out_mode: "out",
            bounce: false,
            attract: {
              enable: false,
              rotateX: 600,
              rotateY: 1200
            }
          }
        },
        interactivity: {
          detect_on: "canvas",
          events: {
            onhover: {
              enable: true,
              mode: "repulse"
            },
            onclick: {
              enable: true,
              mode: "push"
            },
            resize: true
          },
          modes: {
            grab: {
              distance: 400,
              line_linked: {
                opacity: 1
              }
            },
            bubble: {
              distance: 400,
              size: 40,
              duration: 2,
              opacity: 8,
              speed: 3
            },
            repulse: {
              distance: 200,
              duration: 0.4
            },
            push: {
              particles_nb: 4
            },
            remove: {
              particles_nb: 2
            }
          }
        },
        retina_detect: true
      });
    }

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % destinations.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [destinations.length]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % destinations.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + destinations.length) % destinations.length);
  };

  const currentDestination = destinations[currentSlide];

  return (
    <section className="relative h-screen overflow-hidden bg-gradient-to-br from-slate-900 via-gray-900 to-black">
      {/* Particles Background */}
      <div id="particles-js" className="absolute inset-0"></div>

      {/* Background Image with Overlay */}
      <div className="absolute inset-0">
        {destinations.map((destination, index) => (
          <div
            key={destination.id}
            className={`absolute inset-0 transition-all duration-1000 ease-in-out ${
              index === currentSlide 
                ? 'opacity-100 scale-100' 
                : 'opacity-0 scale-105'
            }`}
          >
            <img
              src={destination.image}
              alt={destination.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/30"></div>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-10 h-full flex items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            
            {/* Left Content */}
            <div className={`transform transition-all duration-1000 ${
              isLoaded ? 'translate-x-0 opacity-100' : '-translate-x-10 opacity-0'
            }`}>
              <div className="mb-6">
                <div className="inline-flex items-center px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 mb-6">
                  <Star className="w-4 h-4 text-yellow-400 mr-2" />
                  <span className="text-white text-sm font-medium">
                    {currentDestination.rating} • {currentDestination.reviews.toLocaleString()} recenzija
                  </span>
                </div>
                
                <h1 className="text-6xl md:text-7xl font-bold text-white mb-4 leading-tight">
                  Otkrijte
                  <span 
                    className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 animate-pulse"
                  >
                    Svet
                  </span>
                </h1>
                
                <p className="text-xl text-gray-300 mb-8 leading-relaxed max-w-lg">
                  Vaša sledeća avantura čeka. Doživite nezaboravna putovanja sa našim AI asistentom i pažljivo odabranim destinacijama.
                </p>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <a
                  href="/chat.html"
                  className="group inline-flex items-center justify-center px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl"
                >
                  <Play className="w-5 h-5 mr-2 group-hover:animate-pulse" />
                  Započnite putovanje
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </a>
                
                <button className="inline-flex items-center justify-center px-8 py-4 bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white font-semibold rounded-xl border border-white/20 hover:border-white/40 transition-all duration-300">
                  Istražite destinacije
                </button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white mb-1">50+</div>
                  <div className="text-sm text-gray-400">Destinacija</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white mb-1">10k+</div>
                  <div className="text-sm text-gray-400">Zadovoljnih klijenata</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white mb-1">4.9</div>
                  <div className="text-sm text-gray-400">Prosečna ocena</div>
                </div>
              </div>
            </div>

            {/* Right Content - Destination Card */}
            <div className={`transform transition-all duration-1000 delay-300 ${
              isLoaded ? 'translate-x-0 opacity-100' : 'translate-x-10 opacity-0'
            }`}>
              <div className="relative">
                {/* Main Card */}
                <div className="bg-white rounded-3xl p-8 shadow-2xl transform hover:scale-105 transition-all duration-500">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-5 h-5" style={{ color: currentDestination.color }} />
                      <span className="text-gray-600 font-medium">{currentDestination.country}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span className="text-gray-700 font-semibold">{currentDestination.rating}</span>
                    </div>
                  </div>

                  <h3 className="text-3xl font-bold text-gray-900 mb-2">
                    {currentDestination.title}
                  </h3>
                  
                  <p className="text-gray-600 mb-6">
                    {currentDestination.subtitle}
                  </p>

                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2 bg-gray-100 rounded-lg px-3 py-2">
                        <Calendar className="w-4 h-4 text-gray-600" />
                        <span className="text-sm text-gray-700">7 dana</span>
                      </div>
                      <div className="flex items-center space-x-2 bg-gray-100 rounded-lg px-3 py-2">
                        <Users className="w-4 h-4 text-gray-600" />
                        <span className="text-sm text-gray-700">2-4 osobe</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-3xl font-bold" style={{ color: currentDestination.color }}>
                        {currentDestination.price}
                      </div>
                      <div className="text-sm text-gray-500">po osobi</div>
                    </div>
                    <button 
                      className="px-6 py-3 text-white font-semibold rounded-xl transition-all duration-300 hover:shadow-lg transform hover:scale-105"
                      style={{ backgroundColor: currentDestination.color }}
                    >
                      Rezerviši
                    </button>
                  </div>
                </div>

                {/* Floating Elements */}
                <div className="absolute -top-4 -right-4 w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center animate-bounce">
                  <span className="text-white font-bold text-lg">🎯</span>
                </div>
                
                <div className="absolute -bottom-4 -left-4 w-12 h-12 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center animate-pulse">
                  <span className="text-white font-bold">✈️</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Controls */}
      <button
        onClick={prevSlide}
        className="absolute left-6 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white rounded-full border border-white/20 hover:border-white/40 transition-all duration-300 flex items-center justify-center group"
      >
        <ChevronLeft className="w-6 h-6 group-hover:scale-110 transition-transform" />
      </button>
      
      <button
        onClick={nextSlide}
        className="absolute right-6 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white rounded-full border border-white/20 hover:border-white/40 transition-all duration-300 flex items-center justify-center group"
      >
        <ChevronRight className="w-6 h-6 group-hover:scale-110 transition-transform" />
      </button>

      {/* Slide Indicators */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex space-x-3">
        {destinations.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`transition-all duration-300 rounded-full ${
              index === currentSlide 
                ? 'w-8 h-3 bg-white' 
                : 'w-3 h-3 bg-white/50 hover:bg-white/75'
            }`}
          />
        ))}
      </div>

      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 w-full h-1 bg-white/10">
        <div 
          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
          style={{ width: `${((currentSlide + 1) / destinations.length) * 100}%` }}
        />
      </div>
    </section>
  );
};

export default Hero;