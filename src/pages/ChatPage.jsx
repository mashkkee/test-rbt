import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, X, User, Bot } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiRequest, API_CONFIG } from '../config/api';

const ChatPage = () => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Add welcome message
    setMessages([{
      id: 1,
      role: 'assistant',
      content: 'Zdravo! Ja sam Golem, vaš AI turistički asistent. Kako mogu da vam pomognem da pronađete savršeno putovanje? 🌍✈️',
      timestamp: new Date().toISOString()
    }]);
  }, []);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    // Check for booking intent
    const bookingKeywords = ['rezervacija', 'rezerviši', 'želim da rezervišem', 'booking', 'book'];
    const hasBookingIntent = bookingKeywords.some(keyword => 
      inputMessage.toLowerCase().includes(keyword)
    );

    if (hasBookingIntent && !userInfo) {
      setShowUserModal(true);
      setIsLoading(false);
      return;
    }

    try {
      const response = await apiRequest(API_CONFIG.ENDPOINTS.CHAT, {
        method: 'POST',
        body: JSON.stringify({
          message: inputMessage,
          session_id: sessionId
        })
      });

      const botMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: response.answer,
        timestamp: response.timestamp,
        sources: response.sources || [],
        responseTime: response.response_time
      };

      setMessages(prev => [...prev, botMessage]);
      setSessionId(response.session_id);

    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: 'Izvinjavam se, došlo je do greške. Molimo pokušajte ponovo.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleUserInfoSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const userData = {
      fullName: formData.get('fullName'),
      email: formData.get('email')
    };
    
    setUserInfo(userData);
    setShowUserModal(false);
    
    const systemMessage = {
      id: Date.now(),
      role: 'assistant',
      content: `Hvala ${userData.fullName}! Sada možemo da nastavimo sa rezervacijom.`,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, systemMessage]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="flex flex-col h-screen max-w-4xl mx-auto">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 p-4 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-tourism-primary to-tourism-secondary rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">G</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Golem AI</h1>
                <p className="text-sm text-gray-600">Vaš Lični Turistički Asistent</p>
              </div>
            </div>
            <Link to="/" className="text-tourism-primary hover:text-tourism-secondary transition-colors">
              <X className="w-6 h-6" />
            </Link>
          </div>
        </header>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start space-x-3 ${
                message.role === 'user' ? 'justify-end' : ''
              }`}
            >
              {message.role === 'assistant' && (
                <div className="w-8 h-8 bg-gradient-to-r from-tourism-primary to-tourism-secondary rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}
              
              <div
                className={`rounded-2xl p-4 shadow-sm border max-w-md ${
                  message.role === 'user'
                    ? 'bg-gradient-to-r from-tourism-primary to-tourism-secondary text-white rounded-tr-md'
                    : 'bg-white border-gray-100 rounded-tl-md'
                }`}
              >
                <p className={message.role === 'user' ? 'text-white' : 'text-gray-800'}>
                  {message.content}
                </p>
                {message.sources && message.sources.length > 0 && (
                  <div className="mt-2 text-xs text-gray-500">
                    <p>Izvori: {message.sources.join(', ')}</p>
                  </div>
                )}
              </div>

              {message.role === 'user' && (
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-gray-600" />
                </div>
              )}
            </div>
          ))}
          
          {isLoading && (
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-tourism-primary to-tourism-secondary rounded-full flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-white rounded-2xl rounded-tl-md p-4 shadow-sm border border-gray-100 max-w-md">
                <p className="text-gray-800 animate-pulse">Golem razmišlja...</p>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200/50 bg-white/80 backdrop-blur-md p-4">
          <div className="flex items-center space-x-3">
            <div className="flex-1">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Napišite vašu poruku..."
                className="w-full px-4 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-tourism-primary focus:border-transparent resize-none"
                disabled={isLoading}
              />
            </div>
            <button
              onClick={handleSendMessage}
              disabled={isLoading || !inputMessage.trim()}
              className="bg-gradient-to-r from-tourism-primary to-tourism-secondary text-white p-3 rounded-full hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* User Info Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md animate-fade-in">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Informacije o korisniku</h2>
            <p className="text-gray-600 mb-6">Molimo vas da unesete vaše podatke pre rezervacije:</p>
            <form onSubmit={handleUserInfoSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ime i prezime</label>
                <input
                  type="text"
                  name="fullName"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tourism-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email adresa</label>
                <input
                  type="email"
                  name="email"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tourism-primary focus:border-transparent"
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-tourism-primary to-tourism-secondary text-white py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
                >
                  Sačuvaj
                </button>
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Otkaži
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatPage;