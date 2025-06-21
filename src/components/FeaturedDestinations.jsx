import React from 'react';
import { MapPin, Star, Clock, ArrowRight } from 'lucide-react';

const FeaturedDestinations = () => {
  const destinations = [
    {
      id: 1,
      title: "Santorini",
      country: "Grčka",
      image: "https://images.pexels.com/photos/1488327/pexels-photo-1488327.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop",
      rating: 4.9,
      duration: "7 dana",
      price: "899€",
      description: "Romantična ostrva sa prelepim zalascima sunca",
      features: ["Luksuzni hoteli", "Privatne plaže", "Vinski turizam"]
    },
    {
      id: 2,
      title: "Dubrovnik",
      country: "Hrvatska",
      image: "https://images.pexels.com/photos/2901209/pexels-photo-2901209.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop",
      rating: 4.8,
      duration: "5 dana",
      price: "599€",
      description: "Istorijski grad sa srednjevekovnim zidinama",
      features: ["UNESCO baština", "Kristalno more", "Lokalna gastronomija"]
    },
    {
      id: 3,
      title: "Phuket",
      country: "Tajland",
      image: "https://images.pexels.com/photos/1059078/pexels-photo-1059078.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop",
      rating: 4.7,
      duration: "10 dana",
      price: "1299€",
      description: "Tropski raj sa egzotičnim plažama",
      features: ["Spa tretmani", "Ronjenje", "Noćni život"]
    },
    {
      id: 4,
      title: "Barcelona",
      country: "Španija", 
      image: "https://images.pexels.com/photos/819764/pexels-photo-819764.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop",
      rating: 4.8,
      duration: "6 dana",
      price: "799€",
      description: "Gaudi arhitektura i mediteranska kultura",
      features: ["Sagrada Familia", "Park Güell", "Tapas ture"]
    },
    {
      id: 5,
      title: "Istanbul",
      country: "Turska",
      image: "https://images.pexels.com/photos/1042423/pexels-photo-1042423.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop",
      rating: 4.6,
      duration: "8 dana",
      price: "699€",
      description: "Grad na dva kontinenta sa bogatom istorijom",
      features: ["Aja Sofija", "Topkapi palata", "Bazar"]
    },
    {
      id: 6,
      title: "Pariz",
      country: "Francuska",
      image: "https://images.pexels.com/photos/161853/eiffel-tower-paris-france-tower-161853.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop",
      rating: 4.9,
      duration: "5 dana",
      price: "999€",
      description: "Grad svetlosti i romantike",
      features: ["Ajfelova kula", "Luvr", "Seine krstarenje"]
    }
  ];

  return (
    <section id="destinations" className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-display font-bold text-gray-800 mb-6">
            Istaknute destinacije
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Otkrijte najlepše destinacije sveta koje smo pažljivo odabrali za vas. 
            Svaka destinacija nudi jedinstveno iskustvo i nezaboravne uspomene.
          </p>
        </div>

        {/* Destinations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {destinations.map((destination) => (
            <div
              key={destination.id}
              className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 overflow-hidden border border-gray-100"
            >
              {/* Image */}
              <div className="relative overflow-hidden">
                <img
                  src={destination.image}
                  alt={destination.title}
                  className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 flex items-center space-x-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                  <span className="text-sm font-semibold">{destination.rating}</span>
                </div>
                <div className="absolute bottom-4 left-4 bg-gradient-to-r from-tourism-primary to-tourism-secondary text-white px-3 py-1 rounded-full text-sm font-semibold">
                  {destination.price}
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-tourism-primary" />
                    <span className="text-sm text-gray-600">{destination.country}</span>
                  </div>
                  <div className="flex items-center space-x-1 text-sm text-gray-500">
                    <Clock className="w-4 h-4" />
                    <span>{destination.duration}</span>
                  </div>
                </div>

                <h3 className="text-2xl font-bold text-gray-800 mb-3">
                  {destination.title}
                </h3>

                <p className="text-gray-600 mb-4 leading-relaxed">
                  {destination.description}
                </p>

                {/* Features */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {destination.features.map((feature, index) => (
                    <span
                      key={index}
                      className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm"
                    >
                      {feature}
                    </span>
                  ))}
                </div>

                {/* Action Button */}
                <button className="w-full bg-gradient-to-r from-tourism-primary to-tourism-secondary text-white py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity flex items-center justify-center space-x-2 group">
                  <span>Saznajte više</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Load More Button */}
        <div className="text-center mt-12">
          <button className="bg-white border-2 border-tourism-primary text-tourism-primary px-8 py-3 rounded-full font-semibold hover:bg-tourism-primary hover:text-white transition-colors">
            Pogledajte sve destinacije
          </button>
        </div>
      </div>
    </section>
  );
};

export default FeaturedDestinations;